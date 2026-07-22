<template>
  <div>
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索产品名称" clearable style="width: 240px">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" :disabled="!store.products.length" @click="openDialog">
        <el-icon><Plus /></el-icon>新增入库
      </el-button>
    </div>

    <el-table :data="filtered" border stripe>
      <el-table-column label="入库明细" min-width="280">
        <template #default="{ row }">
          <el-tag v-for="(item, i) in row.items" :key="i" size="small" style="margin: 2px 4px 2px 0">
            {{ item.name }} × {{ item.qty }}{{ item.unit }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
      <el-table-column label="入库时间" width="160">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-popconfirm title="删除该批次将回滚全部对应库存，确定？" @confirm="onRemove(row)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
      <template #empty><el-empty description="暂无入库记录" /></template>
    </el-table>

    <el-dialog v-model="dialogVisible" title="新增入库" width="620px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="入库明细" required>
          <div class="items-editor">
            <div class="item-head" v-if="form.items.length">
              <span style="flex: 1">产品</span>
              <span style="width: 130px">入库数量</span>
              <span style="width: 40px"></span>
            </div>
            <div v-for="(item, i) in form.items" :key="i" class="item-row">
              <el-select v-model="item.productId" placeholder="选择现有产品" filterable style="flex: 1">
                <el-option
                  v-for="p in store.products"
                  :key="p.id"
                  :label="`${p.name}（当前库存 ${p.stock}${p.unit}）`"
                  :value="p.id"
                  :disabled="form.items.some((it, j) => j !== i && it.productId === p.id)"
                />
              </el-select>
              <el-input-number v-model="item.qty" :min="1" style="width: 130px" />
              <el-button link type="danger" style="width: 40px" @click="form.items.splice(i, 1)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button size="small" @click="addItem">
              <el-icon><Plus /></el-icon>添加产品
            </el-button>
            <div v-if="!form.items.length" class="empty-text">暂无产品，请点击添加</div>
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { store, stockIn, removeStockIn } from '../store'

const keyword = ref('')
const dialogVisible = ref(false)
const form = ref({})

const filtered = computed(() => {
  const list = [...store.stockIns].sort((a, b) => b.createdAt - a.createdAt)
  const kw = keyword.value.trim()
  if (!kw) return list
  return list.filter((r) => r.items.some((it) => it.name.includes(kw)))
})

function formatTime(ts) {
  return ts ? new Date(ts).toLocaleString('zh-CN', { hour12: false }) : ''
}

function openDialog() {
  form.value = { items: [], remark: '' }
  dialogVisible.value = true
}

function addItem() {
  form.value.items.push({ productId: '', qty: 1 })
}

function save() {
  const rows = form.value.items.filter((it) => it.productId && it.qty > 0)
  if (!rows.length) {
    ElMessage.warning('请至少添加一条入库产品')
    return
  }
  const items = rows.map((it) => ({
    product: store.products.find((p) => p.id === it.productId),
    qty: it.qty
  }))
  stockIn(items, form.value.remark.trim())
  dialogVisible.value = false
  ElMessage.success(`已入库 ${items.length} 种产品`)
}

function onRemove(row) {
  removeStockIn(row)
}
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; margin-bottom: 14px; }
.empty-text { color: #c0c4cc; font-size: 13px; }
.items-editor { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.item-head { display: flex; gap: 8px; font-size: 12px; color: #909399; padding: 0 4px; }
.item-row { display: flex; gap: 8px; align-items: center; padding: 4px; }
</style>

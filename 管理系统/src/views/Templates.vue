<template>
  <div>
    <div class="toolbar">
      <span class="tip">礼盒模板：预设产品组合，新建订单时可一键填充（生成快照，后续改模板不影响已有订单）</span>
      <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新建模板</el-button>
    </div>

    <el-table :data="store.templates" border stripe>
      <el-table-column prop="name" label="模板名称" min-width="180" />
      <el-table-column label="内含产品" min-width="360">
        <template #default="{ row }">
          <el-tag v-for="(item, i) in row.items" :key="i" size="small" style="margin: 2px 4px 2px 0">
            {{ item.name }} × {{ item.qty }}{{ item.unit }}
          </el-tag>
          <span v-if="!row.items.length" class="empty-text">（空）</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-popconfirm title="确定删除该模板？" @confirm="remove(row)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
      <template #empty><el-empty description="暂无礼盒模板" /></template>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑模板' : '新建模板'" width="640px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="模板名称" required>
          <el-input v-model="form.name" placeholder="如：中秋经典礼盒" />
        </el-form-item>
        <el-form-item label="产品明细">
          <div class="items-editor">
            <div v-for="(item, i) in form.items" :key="i" class="item-row">
              <el-select
                v-model="item.productId"
                placeholder="选择产品"
                filterable
                style="flex: 1"
                @change="(val) => onProductChange(item, val)"
              >
                <el-option v-for="p in store.products" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
              <el-input-number v-model="item.qty" :min="1" style="width: 130px" />
              <el-button link type="danger" @click="form.items.splice(i, 1)"><el-icon><Delete /></el-icon></el-button>
            </div>
            <el-button size="small" @click="addItem"><el-icon><Plus /></el-icon>添加产品</el-button>
          </div>
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
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { store, genId } from '../store'

const dialogVisible = ref(false)
const form = ref({ items: [] })

function openDialog(row) {
  form.value = row
    ? { ...row, items: row.items.map((it) => ({ ...it })) }
    : { id: '', name: '', items: [] }
  dialogVisible.value = true
}

function addItem() {
  form.value.items.push({ productId: '', name: '', unit: '', qty: 1 })
}

// 选择产品后快照名称与单位
function onProductChange(item, productId) {
  const p = store.products.find((x) => x.id === productId)
  if (p) {
    item.name = p.name
    item.unit = p.unit
  }
}

function save() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请填写模板名称')
    return
  }
  form.value.items = form.value.items.filter((it) => it.productId && it.qty > 0)
  if (form.value.id) {
    const target = store.templates.find((t) => t.id === form.value.id)
    Object.assign(target, form.value)
  } else {
    store.templates.push({ ...form.value, id: genId(), name: form.value.name.trim() })
  }
  dialogVisible.value = false
}

function remove(row) {
  const i = store.templates.findIndex((t) => t.id === row.id)
  if (i > -1) store.templates.splice(i, 1)
}
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.tip { color: #909399; font-size: 13px; }
.empty-text { color: #c0c4cc; }
.items-editor { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.item-row { display: flex; gap: 8px; align-items: center; }
</style>

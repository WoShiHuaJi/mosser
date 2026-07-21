<template>
  <div>
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索产品名称" clearable style="width: 240px">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增产品</el-button>
    </div>

    <el-table :data="filtered" border stripe>
      <el-table-column prop="name" label="产品名称" min-width="200" />
      <el-table-column prop="unit" label="单位" width="100" />
      <el-table-column prop="price" label="单价(元)" width="120" sortable>
        <template #default="{ row }">{{ formatPrice(row.price) }}</template>
      </el-table-column>
      <el-table-column prop="stock" label="当前库存" width="140" sortable />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-popconfirm title="确定删除该产品？" @confirm="remove(row)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
      <template #empty><el-empty description="暂无产品，点击右上角新增" /></template>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑产品' : '新增产品'" width="420px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="产品名称" required>
          <el-input v-model="form.name" placeholder="如：核桃礼盒" />
        </el-form-item>
        <el-form-item label="单位" required>
          <el-input v-model="form.unit" placeholder="如：盒 / 件 / 箱" />
        </el-form-item>
        <el-form-item label="单价(元)">
          <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="当前库存">
          <el-input-number v-model="form.stock" :min="0" style="width: 100%" />
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
import { store, genId } from '../store'

const keyword = ref('')
const dialogVisible = ref(false)
const form = ref({})

const filtered = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return store.products
  return store.products.filter((p) => p.name.includes(kw))
})

function formatPrice(val) {
  return (Number(val) || 0).toFixed(2)
}

function openDialog(row) {
  form.value = row ? { ...row } : { id: '', name: '', unit: '', price: 0, stock: 0 }
  dialogVisible.value = true
}

function save() {
  if (!form.value.name.trim() || !form.value.unit.trim()) {
    ElMessage.warning('请填写产品名称和单位')
    return
  }
  if (form.value.id) {
    const target = store.products.find((p) => p.id === form.value.id)
    Object.assign(target, form.value)
  } else {
    store.products.push({ ...form.value, id: genId(), name: form.value.name.trim(), unit: form.value.unit.trim() })
  }
  dialogVisible.value = false
}

function remove(row) {
  const i = store.products.findIndex((p) => p.id === row.id)
  if (i > -1) store.products.splice(i, 1)
}
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; margin-bottom: 14px; }
</style>

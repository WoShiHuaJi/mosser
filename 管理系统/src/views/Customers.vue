<template>
  <div>
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索客户名称" clearable style="width: 240px">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增客户</el-button>
    </div>

    <el-table :data="filtered" border stripe>
      <el-table-column type="index" label="#" width="60" />
      <el-table-column prop="name" label="客户名称" min-width="240" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-popconfirm title="确定删除该客户？" @confirm="remove(row)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
      <template #empty><el-empty description="暂无客户" /></template>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑客户' : '新增客户'" width="380px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="客户名称" required>
          <el-input v-model="form.name" placeholder="客户名称" @keyup.enter="save" />
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
  if (!kw) return store.customers
  return store.customers.filter((c) => c.name.includes(kw))
})

function openDialog(row) {
  form.value = row ? { ...row } : { id: '', name: '' }
  dialogVisible.value = true
}

function save() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请填写客户名称')
    return
  }
  if (form.value.id) {
    const target = store.customers.find((c) => c.id === form.value.id)
    Object.assign(target, { name: form.value.name.trim() })
  } else {
    store.customers.push({ id: genId(), name: form.value.name.trim() })
  }
  dialogVisible.value = false
}

function remove(row) {
  const i = store.customers.findIndex((c) => c.id === row.id)
  if (i > -1) store.customers.splice(i, 1)
}
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; margin-bottom: 14px; }
</style>

<template>
  <div>
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索客户 / 单号" clearable style="width: 240px">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" @click="$router.push('/deliveries/edit')"><el-icon><Plus /></el-icon>新建送货单</el-button>
    </div>

    <el-table :data="filtered" border stripe>
      <el-table-column prop="noteNo" label="单号" width="170" />
      <el-table-column prop="customer" label="客户" min-width="140" />
      <el-table-column prop="deliveryDate" label="送货日期" width="120" />
      <el-table-column prop="address" label="送货地址" min-width="200" show-overflow-tooltip />
      <el-table-column label="产品" min-width="260">
        <template #default="{ row }">
          <el-tag v-for="(item, i) in row.items" :key="i" size="small" style="margin: 2px 4px 2px 0">
            {{ item.name }} × {{ item.qty }}{{ item.unit }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="$router.push(`/deliveries/edit/${row.id}`)">查看/编辑</el-button>
          <el-button link type="success" @click="print(row)">打印/PDF</el-button>
          <el-popconfirm title="确定删除该送货单？" @confirm="remove(row)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
      <template #empty><el-empty description="暂无送货单" /></template>
    </el-table>

    <!-- 打印预览弹窗（复用预览组件） -->
    <delivery-print-dialog v-model="printTarget" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { store } from '../store'
import DeliveryPrintDialog from '../components/DeliveryPrintDialog.vue'

const keyword = ref('')
const printTarget = ref(null)

const filtered = computed(() => {
  const list = [...store.deliveries].sort((a, b) => b.createdAt - a.createdAt)
  const kw = keyword.value.trim()
  if (!kw) return list
  return list.filter((d) => d.customer.includes(kw) || d.noteNo.includes(kw))
})

function print(row) {
  printTarget.value = row
}

function remove(row) {
  const i = store.deliveries.findIndex((d) => d.id === row.id)
  if (i > -1) store.deliveries.splice(i, 1)
}
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; margin-bottom: 14px; }
</style>

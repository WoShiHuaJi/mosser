<template>
  <div>
    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic title="订单数量" :value="orderCount" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic title="订单总金额（元）" :value="totalAmount" :precision="2" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic title="未付款金额（元）" :value="unpaidAmount" :precision="2" />
        </el-card>
      </el-col>
    </el-row>

    <el-card class="status-card" shadow="never">
      <el-divider content-position="left">按状态统计</el-divider>
      <el-table :data="statusRows" border stripe>
        <el-table-column label="状态" width="160">
          <template #default="{ row }">
            <el-tag :type="STATUS_TYPE[row.status]">{{ ORDER_STATUS[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="count" label="订单数量" width="120" />
        <el-table-column label="金额（元）">
          <template #default="{ row }">{{ row.amount.toFixed(2) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { store, orderTotal, ORDER_STATUS, STATUS_TYPE } from '../store'

const orderCount = computed(() => store.orders.length)
const totalAmount = computed(() => store.orders.reduce((sum, o) => sum + orderTotal(o), 0))
const unpaidAmount = computed(() => store.orders.filter((o) => !o.paid).reduce((sum, o) => sum + orderTotal(o), 0))

const statusRows = computed(() =>
  Object.keys(ORDER_STATUS).map((status) => {
    const list = store.orders.filter((o) => o.status === status)
    return { status, count: list.length, amount: list.reduce((sum, o) => sum + orderTotal(o), 0) }
  })
)
</script>

<style scoped>
.status-card { margin-top: 16px; }
</style>

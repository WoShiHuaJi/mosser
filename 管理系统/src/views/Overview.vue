<template>
  <div>
    <!-- 核心指标 -->
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

    <!-- 待办提醒 -->
    <el-row :gutter="16" class="section">
      <el-col :span="8">
        <el-card shadow="hover" class="todo-card" @click="$router.push('/orders')">
          <div class="todo-num warning">{{ pendingCount }}</div>
          <div class="todo-label">待备货订单</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="todo-card" @click="$router.push('/')">
          <div class="todo-num danger">{{ gapProductCount }}</div>
          <div class="todo-label">缺货产品</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="todo-card" @click="$router.push('/deliveries')">
          <div class="todo-num primary">{{ todayDeliveryCount }}</div>
          <div class="todo-label">今日送货单</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 回款率 -->
    <el-card shadow="never" class="section">
      <el-divider content-position="left">回款进度</el-divider>
      <div class="payback">
        <el-progress :percentage="paybackRate" :stroke-width="20" :text-inside="true" />
        <span class="payback-text">已收 {{ paidAmount.toFixed(2) }} / {{ totalAmount.toFixed(2) }} 元</span>
      </div>
    </el-card>

    <!-- Top5 排行 -->
    <el-row :gutter="16" class="section">
      <el-col :span="12">
        <el-card shadow="never">
          <el-divider content-position="left">客户订单金额 Top5</el-divider>
          <el-table :data="topCustomers" border stripe>
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="name" label="客户" min-width="120" />
            <el-table-column prop="count" label="订单数" width="80" />
            <el-table-column label="金额（元）" width="120">
              <template #default="{ row }">{{ row.amount.toFixed(2) }}</template>
            </el-table-column>
            <template #empty><el-empty description="暂无订单" /></template>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <el-divider content-position="left">产品销量 Top5（已确认）</el-divider>
          <el-table :data="topProducts" border stripe>
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="name" label="产品" min-width="120" />
            <el-table-column label="销量" width="100">
              <template #default="{ row }">{{ row.qty }}{{ row.unit }}</template>
            </el-table-column>
            <el-table-column label="金额（元）" width="120">
              <template #default="{ row }">{{ row.amount.toFixed(2) }}</template>
            </el-table-column>
            <template #empty><el-empty description="暂无订单" /></template>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 按状态统计 -->
    <el-card class="section" shadow="never">
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
import { store, orderTotal, calcDemand, ORDER_STATUS, STATUS_TYPE } from '../store'

const orderCount = computed(() => store.orders.length)
const totalAmount = computed(() => store.orders.reduce((sum, o) => sum + orderTotal(o), 0))
const unpaidAmount = computed(() => store.orders.filter((o) => !o.paid).reduce((sum, o) => sum + orderTotal(o), 0))
const paidAmount = computed(() => totalAmount.value - unpaidAmount.value)
const paybackRate = computed(() => (totalAmount.value > 0 ? Math.round((paidAmount.value / totalAmount.value) * 100) : 0))

// 待办
const pendingCount = computed(() => store.orders.filter((o) => o.status === 'pending').length)
const gapProductCount = computed(() => {
  const demand = calcDemand()
  return Object.entries(demand).filter(([key, d]) => {
    const product = key.startsWith('custom:') ? null : store.products.find((p) => p.id === key)
    const stock = product ? Number(product.stock) || 0 : 0
    return d.need - stock > 0
  }).length
})
const todayDeliveryCount = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return store.deliveries.filter((d) => d.deliveryDate === today).length
})

// 客户金额 Top5
const topCustomers = computed(() => {
  const map = {}
  for (const o of store.orders) {
    const name = o.customerName || '未填写'
    if (!map[name]) map[name] = { name, count: 0, amount: 0 }
    map[name].count += 1
    map[name].amount += orderTotal(o)
  }
  return Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 5)
})

// 产品销量 Top5（已确认产品）
const topProducts = computed(() => {
  const map = {}
  for (const o of store.orders) {
    for (const it of o.items) {
      if (!it.confirmed) continue
      if (!map[it.name]) map[it.name] = { name: it.name, unit: it.unit, qty: 0, amount: 0 }
      map[it.name].qty += Number(it.qty) || 0
      map[it.name].amount += (Number(it.qty) || 0) * (Number(it.price) || 0)
    }
  }
  return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5)
})

const statusRows = computed(() =>
  Object.keys(ORDER_STATUS).map((status) => {
    const list = store.orders.filter((o) => o.status === status)
    return { status, count: list.length, amount: list.reduce((sum, o) => sum + orderTotal(o), 0) }
  })
)
</script>

<style scoped>
.section { margin-top: 16px; }
.todo-card { cursor: pointer; text-align: center; }
.todo-num { font-size: 32px; font-weight: bold; }
.todo-num.warning { color: #e6a23c; }
.todo-num.danger { color: #f56c6c; }
.todo-num.primary { color: #409eff; }
.todo-label { color: #909399; font-size: 13px; margin-top: 4px; }
.payback { display: flex; align-items: center; gap: 16px; }
.payback :deep(.el-progress) { flex: 1; }
.payback-text { color: #606266; font-size: 13px; white-space: nowrap; }
</style>

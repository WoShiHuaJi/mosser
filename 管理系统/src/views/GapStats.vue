<template>
  <div>
    <!-- 今日概览 -->
    <el-row :gutter="16" class="overview">
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic title="待备货订单数" :value="pendingCount" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic title="缺货产品种类数" :value="outCount" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic title="紧张产品种类数" :value="tightCount" />
        </el-card>
      </el-col>
    </el-row>

    <div class="toolbar">
      <span class="tip">统计口径：所有「待备货」订单中已确认（confirmed）的产品</span>
      <el-button @click="exportExcel"><el-icon><Download /></el-icon>导出 Excel</el-button>
    </div>

    <el-table :data="rows" border stripe :row-class-name="rowClass">
      <el-table-column type="index" label="#" width="60" />
      <el-table-column prop="name" label="产品名称" min-width="200" />
      <el-table-column prop="unit" label="单位" width="100" />
      <el-table-column prop="need" label="需求总量" width="120" sortable />
      <el-table-column prop="stock" label="当前库存" width="120" sortable />
      <el-table-column prop="gap" label="缺口数量" width="120" sortable>
        <template #default="{ row }">
          <span :style="{ fontWeight: 'bold', color: levelColor(row) }">{{ row.gap > 0 ? row.gap : 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column label="库存状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.level === '充足' ? 'success' : row.level === '紧张' ? 'warning' : 'danger'">
            {{ row.level }}
          </el-tag>
        </template>
      </el-table-column>
      <template #empty><el-empty description="暂无待备货需求" /></template>
    </el-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import * as XLSX from 'xlsx'
import { store, calcDemand } from '../store'

// 汇总需求并对照库存计算缺口，按缺口降序
const rows = computed(() => {
  const demand = calcDemand()
  return Object.entries(demand)
    .map(([key, d]) => {
      const product = key.startsWith('custom:') ? null : store.products.find((p) => p.id === key)
      const stock = product ? Number(product.stock) || 0 : 0
      const gap = d.need - stock
      // 三档：充足=库存满足需求；紧张=有库存但不足；缺货=库存为0仍有需求
      const level = gap <= 0 ? '充足' : stock > 0 ? '紧张' : '缺货'
      return { name: d.name, unit: d.unit, need: d.need, stock, gap, level }
    })
    .sort((a, b) => b.gap - a.gap)
})

const pendingCount = computed(() => store.orders.filter((o) => o.status === 'pending').length)
const outCount = computed(() => rows.value.filter((r) => r.level === '缺货').length)
const tightCount = computed(() => rows.value.filter((r) => r.level === '紧张').length)

function levelColor(row) {
  return row.level === '充足' ? '#67c23a' : row.level === '紧张' ? '#e6a23c' : '#f56c6c'
}

function rowClass({ row }) {
  return row.level === '缺货' ? 'row-out' : row.level === '紧张' ? 'row-tight' : ''
}

function exportExcel() {
  const data = rows.value.map((r, i) => ({
    序号: i + 1,
    产品名称: r.name,
    单位: r.unit,
    需求总量: r.need,
    当前库存: r.stock,
    缺口数量: r.gap > 0 ? r.gap : 0,
    库存状态: r.level
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '库存缺口统计')
  XLSX.writeFile(wb, `库存缺口统计-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
</script>

<style scoped>
.overview { margin-bottom: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.tip { color: #909399; font-size: 13px; }
:deep(.row-out) { background: #fef0f0 !important; }
:deep(.row-tight) { background: #fdf6ec !important; }
</style>

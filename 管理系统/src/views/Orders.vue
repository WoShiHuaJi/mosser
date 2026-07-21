<template>
  <div>
    <div class="toolbar">
      <el-radio-group v-model="statusFilter">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button v-for="(label, key) in ORDER_STATUS" :key="key" :value="key">{{ label }}</el-radio-button>
      </el-radio-group>
      <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新建订单</el-button>
    </div>

    <el-table :data="filtered" border stripe>
      <el-table-column prop="orderNo" label="订单号" width="100" />
      <el-table-column prop="customerName" label="客户" width="80" show-overflow-tooltip />
      <el-table-column label="产品明细" min-width="250">
        <template #default="{ row }">
          <el-tag
            v-for="(item, i) in row.items"
            :key="i"
            size="small"
            :type="item.confirmed ? 'primary' : 'info'"
            :effect="item.confirmed ? 'light' : 'plain'"
            style="margin: 2px 4px 2px 0"
          >
            {{ item.name }} × {{ item.qty }}{{ item.unit }}<template v-if="!item.confirmed">（未确认）</template>
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="金额(元)" width="90">
        <template #default="{ row }">{{ orderTotal(row) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="STATUS_TYPE[row.status]">{{ ORDER_STATUS[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="260" show-overflow-tooltip />
      <el-table-column prop="createdAt" label="创建时间" width="90">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <el-button link :type="row.paid ? 'success' : 'info'" @click="row.paid = !row.paid">{{ row.paid ? '已收款' : '未收款' }}</el-button>
          <el-button v-if="row.status === 'pending'" link type="success" @click="onConfirmStock(row)">确认备货</el-button>
          <el-button v-if="row.status === 'stocked'" link type="warning" @click="onCancelStock(row)">取消备货</el-button>
          <el-button v-if="row.status === 'stocked'" link type="primary" @click="setStatus(row, 'shipped')">发货</el-button>
          <el-button v-if="row.status === 'shipped'" link type="primary" @click="setStatus(row, 'completed')">完成</el-button>
          <el-button link @click="openDialog(row)">{{ row.status === 'pending' ? '编辑' : '查看' }}</el-button>
          <el-popconfirm title="确定删除该订单？" @confirm="remove(row)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
      <template #empty><el-empty description="暂无订单" /></template>
    </el-table>

    <!-- 新建 / 编辑订单 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑订单' : '新建订单'" width="760px" top="5vh">
      <el-form :model="form" label-width="90px">
        <el-form-item label="客户" required>
          <el-select v-model="form.customerId" placeholder="选择客户" filterable style="width: 280px" :disabled="!editable">
            <el-option v-for="c in store.customers" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
          <el-button
            v-if="editable"
            style="margin-left: 10px"
            :disabled="!store.templates.length"
            @click="openTemplateDialog"
          >从礼盒模板填充</el-button>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" placeholder="选填" :disabled="!editable" />
        </el-form-item>
        <el-form-item label="产品明细">
          <div class="items-editor">
            <div class="item-head" v-if="form.items.length">
              <span style="flex: 1">产品</span>
              <span style="width: 110px">数量</span>
              <span style="width: 70px">单位</span>
              <span style="width: 90px">单价(元)</span>
              <span style="width: 90px">小计(元)</span>
              <span style="width: 70px">确认</span>
              <span style="width: 40px"></span>
            </div>
            <div
              v-for="(item, i) in form.items"
              :key="i"
              class="item-row"
              :class="{ unconfirmed: !item.confirmed }"
            >
              <el-select
                v-model="item.productId"
                placeholder="选择产品"
                filterable
                style="flex: 1"
                :disabled="!editable"
                @change="(val) => onProductChange(item, val)"
              >
                <el-option v-for="p in store.products" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
              <el-input-number v-model="item.qty" :min="1" style="width: 110px" :disabled="!editable" />
              <span style="width: 70px; text-align: center">{{ item.unit }}</span>
              <el-input-number v-model="item.price" :min="0" :precision="2" style="width: 90px" :disabled="!editable" :controls="false" />
              <span style="width: 90px; text-align: center">{{ lineTotal(item) }}</span>
              <el-checkbox v-model="item.confirmed" style="width: 70px; justify-content: center" :disabled="!editable && form.status !== 'pending'" />
              <el-button v-if="editable" link type="danger" style="width: 40px" @click="form.items.splice(i, 1)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button v-if="editable" size="small" @click="addItem">
              <el-icon><Plus /></el-icon>{{ form.id ? '追加产品' : '添加产品' }}
            </el-button>
            <div v-if="!form.items.length" class="empty-text">暂无产品，可添加或从模板填充</div>
            <div v-else class="order-total">合计金额（已确认）：¥ {{ orderTotal(form) }}</div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button v-if="editable" type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <!-- 选择礼盒模板 -->
    <el-dialog v-model="templateDialogVisible" title="选择礼盒模板" width="640px">
      <el-table :data="templateRows" border>
        <el-table-column prop="name" label="模板名称" width="160" />
        <el-table-column label="内含产品">
          <template #default="{ row }">
            <span v-for="(item, i) in row.items" :key="i" style="margin-right: 8px">
              {{ item.name }}×{{ item.qty }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="礼盒数量" width="130">
          <template #default="{ row }">
            <el-input-number v-model="row.boxQty" :min="1" style="width: 110px" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button link type="primary" @click="applyTemplate(row)">填充</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="tip" style="margin-top: 8px">输入礼盒数量后点击「填充」，产品数量 = 模板数量 × 礼盒数量</div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { store, genId, ORDER_STATUS, STATUS_TYPE, confirmStock, cancelStock, nextOrderNo } from '../store'

const statusFilter = ref('')
const dialogVisible = ref(false)
const templateDialogVisible = ref(false)
const templateRows = ref([])
const form = ref({ items: [] })

// 仅待备货状态可编辑/追加产品
const editable = computed(() => !form.value.id || form.value.status === 'pending')

const filtered = computed(() => {
  const list = [...store.orders].sort((a, b) => b.createdAt - a.createdAt)
  if (!statusFilter.value) return list
  return list.filter((o) => o.status === statusFilter.value)
})

function formatTime(ts) {
  return ts ? new Date(ts).toLocaleString('zh-CN', { hour12: false }) : ''
}

function openDialog(row) {
  form.value = row
    ? { ...row, items: row.items.map((it) => ({ ...it })) }
    : { id: '', orderNo: '', customerId: '', customerName: '', status: 'pending', items: [], remark: '', paid: false, createdAt: null }
  dialogVisible.value = true
}

function addItem() {
  form.value.items.push({ productId: '', name: '', unit: '', price: 0, qty: 1, confirmed: true })
}

// 选择产品后生成快照（名称/单位/单价复制进订单明细）
function onProductChange(item, productId) {
  const p = store.products.find((x) => x.id === productId)
  if (p) {
    item.name = p.name
    item.unit = p.unit
    item.price = Number(p.price) || 0
  }
}

function lineTotal(item) {
  return ((Number(item.qty) || 0) * (Number(item.price) || 0)).toFixed(2)
}

// 订单金额：只统计已确认产品
function orderTotal(order) {
  return order.items
    .filter((it) => it.confirmed)
    .reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0)
    .toFixed(2)
}

// 打开模板选择：为每个模板附加礼盒数量输入（默认 1）
function openTemplateDialog() {
  templateRows.value = store.templates.map((t) => ({ ...t, boxQty: 1 }))
  templateDialogVisible.value = true
}

// 从模板填充：产品数量 = 模板数量 × 礼盒数量（单价取产品库当前价），不关联模板后续变更
function applyTemplate(tpl) {
  const boxQty = Number(tpl.boxQty) || 1
  for (const it of tpl.items) {
    const p = store.products.find((x) => x.id === it.productId)
    form.value.items.push({
      productId: it.productId,
      name: it.name,
      unit: it.unit,
      price: p ? Number(p.price) || 0 : 0,
      qty: (Number(it.qty) || 0) * boxQty,
      confirmed: true
    })
  }
  templateDialogVisible.value = false
  ElMessage.success(`已填充模板「${tpl.name}」× ${boxQty}`)
}

function save() {
  if (!form.value.customerId) {
    ElMessage.warning('请选择客户')
    return
  }
  form.value.items = form.value.items.filter((it) => it.productId && it.qty > 0)
  if (!form.value.items.length) {
    ElMessage.warning('请至少添加一条产品明细')
    return
  }
  const customer = store.customers.find((c) => c.id === form.value.customerId)
  form.value.customerName = customer ? customer.name : ''
  if (form.value.id) {
    const target = store.orders.find((o) => o.id === form.value.id)
    Object.assign(target, form.value)
  } else {
    store.orders.push({ ...form.value, id: genId(), orderNo: nextOrderNo(), createdAt: Date.now() })
  }
  dialogVisible.value = false
}

async function onConfirmStock(row) {
  const unconfirmed = row.items.filter((it) => !it.confirmed).length
  if (unconfirmed) {
    await ElMessageBox.confirm(`有 ${unconfirmed} 条未确认产品不会扣减库存，确认备货？`, '确认备货', { type: 'warning' })
  }
  confirmStock(row)
  ElMessage.success('已确认备货并扣减库存')
}

async function onCancelStock(row) {
  await ElMessageBox.confirm('取消备货将回滚库存并退回待备货状态，确定？', '取消备货', { type: 'warning' })
  cancelStock(row)
}

function setStatus(row, status) {
  row.status = status
}

function remove(row) {
  if (row.status === 'stocked') {
    ElMessage.warning('已备货订单请先取消备货再删除')
    return
  }
  const i = store.orders.findIndex((o) => o.id === row.id)
  if (i > -1) store.orders.splice(i, 1)
}
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; margin-bottom: 14px; }
.tip { color: #909399; font-size: 13px; }
.empty-text { color: #c0c4cc; font-size: 13px; }
.items-editor { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.item-head { display: flex; gap: 8px; font-size: 12px; color: #909399; padding: 0 4px; }
.item-row { display: flex; gap: 8px; align-items: center; padding: 4px; border-radius: 4px; }
.item-row.unconfirmed { background: #f4f4f5; opacity: 0.65; }
.order-total { text-align: right; font-weight: bold; color: #f56c6c; padding-right: 44px; }
</style>

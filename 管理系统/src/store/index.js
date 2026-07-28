// 全局状态管理：Vue3 响应式对象 + 变更后自动保存
import { reactive, watch } from 'vue'
import * as storage from '../utils/storage'

export const ORDER_STATUS = {
  pending: '待备货',
  stocked: '已备货',
  shipped: '已发货',
  completed: '已完成'
}

export const STATUS_TYPE = {
  pending: 'warning',
  stocked: 'primary',
  shipped: 'success',
  completed: 'info'
}

export function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// 全量数据结构
export const store = reactive({
  ready: false, // 是否已从本地文件加载完成
  supported: storage.isSupported(),
  dirHandle: null,
  dirName: '',
  saving: false,
  lastSavedAt: null,
  products: [], // { id, name, unit, stock }
  stockIns: [], // { id, remark, createdAt, items: [{ productId, name, unit, qty }] }
  templates: [], // { id, name, items: [{ productId, name, unit, qty }] }
  customers: [], // { id, name }
  orders: [], // { id, orderNo, customerId, customerName, status, items, remark, createdAt }
  deliveries: [] // { id, noteNo, customer, address, deliveryDate, items, createdAt }
})

let saveTimer = null

// 序列化需要持久化的业务数据
function snapshot() {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    products: store.products,
    stockIns: store.stockIns,
    templates: store.templates,
    customers: store.customers,
    orders: store.orders,
    deliveries: store.deliveries
  }
}

async function doSave() {
  if (!store.dirHandle) return
  store.saving = true
  try {
    await storage.saveData(store.dirHandle, snapshot())
    store.lastSavedAt = new Date()
  } catch (e) {
    console.error('自动保存失败', e)
  } finally {
    store.saving = false
  }
}

// 防抖自动保存
function scheduleSave() {
  if (!store.ready || !store.dirHandle) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(doSave, 500)
}

watch(
  () => [store.products, store.stockIns, store.templates, store.customers, store.orders, store.deliveries],
  scheduleSave,
  { deep: true }
)

function applyData(data) {
  store.products = data.products || []
  // 兼容旧版按产品平铺的入库记录：包装为单产品批次
  store.stockIns = (data.stockIns || []).map((r) =>
    r.items
      ? r
      : { id: r.id, remark: r.remark || '', createdAt: r.createdAt, items: [{ productId: r.productId, name: r.name, unit: r.unit, qty: r.qty }] }
  )
  store.templates = data.templates || []
  store.customers = data.customers || []
  store.orders = data.orders || []
  store.deliveries = data.deliveries || []
}

// 选择文件夹并加载/初始化数据
export async function connectDirectory() {
  const handle = await storage.pickDirectory()
  store.dirHandle = handle
  store.dirName = handle.name
  const data = await storage.loadData(handle)
  if (data) applyData(data)
  store.ready = true
  scheduleSave()
}

// 恢复上次会话的文件夹（用户点击按钮触发授权）
export async function reconnectDirectory() {
  const handle = await storage.restoreDirectory(true)
  if (!handle) return false
  store.dirHandle = handle
  store.dirName = handle.name
  const data = await storage.loadData(handle)
  if (data) applyData(data)
  store.ready = true
  return true
}

// 应用启动时尝试静默恢复（已有授权则直接进入）
export async function tryAutoRestore() {
  const handle = await storage.restoreDirectory(false)
  if (handle) {
    store.dirHandle = handle
    store.dirName = handle.name
    const data = await storage.loadData(handle)
    if (data) applyData(data)
    store.ready = true
  }
}

export async function exportAll() {
  await storage.exportData(snapshot())
}

// 导入 JSON 覆盖当前数据
export async function importAll() {
  const data = await storage.importData()
  if (!data || typeof data !== 'object') throw new Error('文件格式不正确')
  applyData(data)
  scheduleSave()
}

// ---------- 订单业务逻辑 ----------

// 订单金额：只统计已确认产品
export function orderTotal(order) {
  return order.items
    .filter((it) => it.confirmed)
    .reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0)
}

// 待备货订单中 confirmed 产品的需求汇总：{ productId: { name, unit, need } }
export function calcDemand() {
  const demand = {}
  for (const order of store.orders) {
    if (order.status !== 'pending') continue
    for (const item of order.items) {
      if (!item.confirmed) continue
      const key = item.productId || `custom:${item.name}`
      if (!demand[key]) demand[key] = { name: item.name, unit: item.unit, need: 0 }
      demand[key].need += Number(item.qty) || 0
    }
  }
  return demand
}

// 确认备货：扣减库存并流转状态
export function confirmStock(order) {
  if (order.status !== 'pending') return
  for (const item of order.items) {
    if (!item.confirmed || !item.productId) continue
    const product = store.products.find((p) => p.id === item.productId)
    if (product) product.stock = (Number(product.stock) || 0) - (Number(item.qty) || 0)
  }
  order.status = 'stocked'
}

// 取消备货：回滚库存，状态回退到待备货
export function cancelStock(order) {
  if (order.status !== 'stocked') return
  for (const item of order.items) {
    if (!item.confirmed || !item.productId) continue
    const product = store.products.find((p) => p.id === item.productId)
    if (product) product.stock = (Number(product.stock) || 0) + (Number(item.qty) || 0)
  }
  order.status = 'pending'
}

// ---------- 入库业务逻辑 ----------

// 产品入库：一批可含多种产品，统一备注，逐产品增加库存
export function stockIn(items, remark = '') {
  store.stockIns.push({
    id: genId(),
    remark,
    createdAt: Date.now(),
    items: items.map(({ product, qty }) => {
      product.stock = (Number(product.stock) || 0) + (Number(qty) || 0)
      return { productId: product.id, name: product.name, unit: product.unit, qty: Number(qty) || 0 }
    })
  })
}

// 删除入库批次：回滚该批全部产品的库存
export function removeStockIn(record) {
  for (const item of record.items) {
    const product = store.products.find((p) => p.id === item.productId)
    if (product) product.stock = (Number(product.stock) || 0) - (Number(item.qty) || 0)
  }
  const i = store.stockIns.findIndex((r) => r.id === record.id)
  if (i > -1) store.stockIns.splice(i, 1)
}

let orderSeq = 1
export function nextOrderNo() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `SO${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${String(orderSeq++).padStart(3, '0')}`
}

let noteSeq = 1
export function nextNoteNo() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `DN${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${String(noteSeq++).padStart(3, '0')}`
}

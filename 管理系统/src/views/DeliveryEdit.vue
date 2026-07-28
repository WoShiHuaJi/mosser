<template>
  <div>
    <div class="toolbar">
      <el-button @click="$router.push('/deliveries')"><el-icon><Back /></el-icon>返回列表</el-button>
      <div>
        <el-button :disabled="!store.orders.length" @click="importDialogVisible = true">
          <el-icon><Download /></el-icon>从订单导入
        </el-button>
        <el-button :disabled="!store.templates.length" @click="openTemplateDialog">
          <el-icon><Box /></el-icon>从礼盒模板填充
        </el-button>
        <el-button type="primary" @click="save">保存</el-button>
        <el-button v-if="form.id" type="success" @click="printTarget = savedSnapshot()">打印/PDF</el-button>
      </div>
    </div>

    <el-card>
      <el-form :model="form" label-width="90px">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="客户">
              <el-select
                v-model="form.customer"
                placeholder="选择或输入客户（选填）"
                filterable
                allow-create
                default-first-option
                style="width: 100%"
              >
                <el-option v-for="c in store.customers" :key="c.id" :label="c.name" :value="c.name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="送货日期" required>
              <el-date-picker v-model="form.deliveryDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="送货地址">
              <el-input v-model="form.address" placeholder="收货地址" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <el-divider content-position="left">产品明细（可拖拽排序）</el-divider>

      <div class="item-head">
        <span style="width: 40px"></span>
        <span style="flex: 2">产品名称</span>
        <span style="flex: 1">规格</span>
        <span style="width: 110px">数量</span>
        <span style="width: 90px">单位</span>
        <span style="width: 40px"></span>
      </div>
      <draggable v-model="form.items" item-key="key" handle=".drag-handle" animation="150">
        <template #item="{ element, index }">
          <div class="item-row">
            <el-icon class="drag-handle"><Rank /></el-icon>
            <el-select
              v-model="element.name"
              placeholder="选择或手动输入"
              filterable
              allow-create
              default-first-option
              style="flex: 2"
              @change="(val) => onProductPick(element, val)"
            >
              <el-option v-for="p in store.products" :key="p.id" :label="p.name" :value="p.name" />
            </el-select>
            <el-input v-model="element.spec" placeholder="规格" style="flex: 1" />
            <el-input-number v-model="element.qty" :min="0" style="width: 110px" />
            <el-input v-model="element.unit" placeholder="单位" style="width: 90px" />
            <el-button link type="danger" style="width: 40px" @click="form.items.splice(index, 1)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </template>
      </draggable>
      <el-button size="small" style="margin-top: 8px" @click="addRow"><el-icon><Plus /></el-icon>添加一行</el-button>
    </el-card>

    <!-- 从订单导入 -->
    <el-dialog v-model="importDialogVisible" title="从订单导入（仅导入已确认产品）" width="720px">
      <el-table :data="importableOrders" border highlight-current-row @row-click="importFromOrder">
        <el-table-column prop="orderNo" label="订单号" width="160" />
        <el-table-column prop="customerName" label="客户" width="140" />
        <el-table-column label="已确认产品">
          <template #default="{ row }">
            <span v-for="(item, i) in confirmedItems(row)" :key="i" style="margin-right: 8px">
              {{ item.name }}×{{ item.qty }}
            </span>
          </template>
        </el-table-column>
      </el-table>
      <div class="tip" style="margin-top: 8px">点击订单行即可填充到送货单（客户名一并带入）</div>
    </el-dialog>

    <!-- 从礼盒模板填充 -->
    <el-dialog v-model="templateDialogVisible" title="从礼盒模板填充" width="640px">
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

    <delivery-print-dialog v-model="printTarget" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import draggable from 'vuedraggable'
import { ElMessage } from 'element-plus'
import { store, genId, nextNoteNo } from '../store'
import DeliveryPrintDialog from '../components/DeliveryPrintDialog.vue'

const route = useRoute()
const router = useRouter()
const importDialogVisible = ref(false)
const templateDialogVisible = ref(false)
const templateRows = ref([])
const printTarget = ref(null)

function newRow() {
  return { key: genId(), name: '', spec: '', qty: 1, unit: '' }
}

const form = ref(loadForm())

function loadForm() {
  const id = route.params.id
  if (id) {
    const found = store.deliveries.find((d) => d.id === id)
    if (found) {
      return { ...found, items: found.items.map((it) => ({ ...it, key: genId() })) }
    }
    ElMessage.warning('未找到该送货单，已切换为新建')
  }
  const today = new Date().toISOString().slice(0, 10)
  return { id: '', noteNo: '', customer: '', address: '', deliveryDate: today, items: [newRow()], createdAt: null }
}

// 从产品库选择时自动带出单位
function onProductPick(item, name) {
  const p = store.products.find((x) => x.name === name)
  if (p && !item.unit) item.unit = p.unit
}

function addRow() {
  form.value.items.push(newRow())
}

const importableOrders = ref(
  store.orders.filter((o) => o.items.some((it) => it.confirmed))
)

function confirmedItems(order) {
  return order.items.filter((it) => it.confirmed)
}

// 追加产品行：先移除未填名称的空行，再追加
function appendItems(list) {
  form.value.items = form.value.items.filter((it) => it.name && it.name.trim())
  for (const it of list) form.value.items.push(it)
}

// 从订单导入：仅 confirmed 产品，客户名带入
function importFromOrder(order) {
  form.value.customer = order.customerName
  appendItems(confirmedItems(order).map((it) => ({ key: genId(), name: it.name, spec: '', qty: it.qty, unit: it.unit })))
  importDialogVisible.value = false
  ElMessage.success(`已导入订单 ${order.orderNo}`)
}

// 打开模板选择：为每个模板附加礼盒数量输入（默认 1）
function openTemplateDialog() {
  templateRows.value = store.templates.map((t) => ({ ...t, boxQty: 1 }))
  templateDialogVisible.value = true
}

// 从模板填充：产品数量 = 模板数量 × 礼盒数量
function applyTemplate(tpl) {
  const boxQty = Number(tpl.boxQty) || 1
  appendItems(tpl.items.map((it) => ({ key: genId(), name: it.name, spec: '', qty: (Number(it.qty) || 0) * boxQty, unit: it.unit })))
  templateDialogVisible.value = false
  ElMessage.success(`已填充模板「${tpl.name}」× ${boxQty}`)
}

function save() {
  if (!form.value.deliveryDate) {
    ElMessage.warning('请选择送货日期')
    return
  }
  form.value.items = form.value.items.filter((it) => it.name && it.name.trim())
  if (!form.value.items.length) {
    ElMessage.warning('请至少添加一行产品')
    return
  }
  if (form.value.id) {
    const target = store.deliveries.find((d) => d.id === form.value.id)
    Object.assign(target, form.value)
  } else {
    form.value.id = genId()
    form.value.noteNo = nextNoteNo()
    form.value.createdAt = Date.now()
    store.deliveries.push({ ...form.value, items: form.value.items.map((it) => ({ ...it })) })
  }
  ElMessage.success('已保存')
  router.push('/deliveries')
}

function savedSnapshot() {
  return { ...form.value, items: form.value.items.map((it) => ({ ...it })) }
}
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; margin-bottom: 14px; }
.tip { color: #909399; font-size: 13px; }
.item-head {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #909399;
  padding: 0 4px 6px;
}
.item-row { display: flex; gap: 8px; align-items: center; padding: 4px; }
.drag-handle { width: 40px; cursor: grab; color: #909399; }
</style>

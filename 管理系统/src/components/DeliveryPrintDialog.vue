<template>
  <!-- 打印/PDF 弹窗：左侧预览 A4，右侧操作 -->
  <el-dialog
    :model-value="!!modelValue"
    title="打印 / 导出 PDF"
    width="860px"
    top="3vh"
    @update:model-value="close"
    @open="onOpen"
  >
    <div v-loading="generating" element-loading-text="正在生成 PDF…" class="preview-wrap">
      <div class="preview-scroll">
        <delivery-print v-if="modelValue" ref="printRef" :delivery="modelValue" />
      </div>
    </div>
    <template #footer>
      <el-button @click="close">关闭</el-button>
      <el-button type="primary" :loading="generating" @click="doExport">导出 PDF</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import DeliveryPrint from './DeliveryPrint.vue'
import { exportPdf } from '../utils/pdf'

// modelValue：要打印的送货单对象，null 表示关闭
const props = defineProps({ modelValue: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue'])

const printRef = ref(null)
const generating = ref(false)

function close() {
  emit('update:modelValue', null)
}

function onOpen() {
  nextTick(() => {})
}

async function doExport() {
  const el = printRef.value?.$el
  if (!el) return
  generating.value = true
  try {
    // 等待一帧确保渲染完成
    await nextTick()
    await exportPdf(el, `送货清单-${props.modelValue.noteNo}`)
    ElMessage.success('PDF 已生成')
  } catch (e) {
    console.error(e)
    ElMessage.error('PDF 生成失败：' + e.message)
  } finally {
    generating.value = false
  }
}
</script>

<style scoped>
.preview-wrap {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #e9e9e9;
}
.preview-scroll {
  max-height: 68vh;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 12px;
}
.preview-scroll :deep(.a4-sheet) {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}
</style>

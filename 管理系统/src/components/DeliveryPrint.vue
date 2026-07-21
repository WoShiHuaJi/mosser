<template>
  <!-- A4 打印预览：版式参照送货清单模板（123.pdf） -->
  <div class="a4-sheet">
    <h1 class="title">送货清单</h1>
    <table class="note-table">
      <colgroup>
        <col style="width: 12%" />
        <col style="width: 46%" />
        <col style="width: 21%" />
        <col style="width: 21%" />
      </colgroup>
      <tbody>
        <tr>
          <td colspan="4" class="customer-cell">客户：{{ delivery.customer }}</td>
        </tr>
        <tr class="head-row">
          <td>序号</td>
          <td>货物名称</td>
          <td>数量</td>
          <td>单位</td>
        </tr>
        <tr v-for="(item, i) in delivery.items" :key="i">
          <td>{{ i + 1 }}</td>
          <td class="name-cell">{{ item.name }}<template v-if="item.spec">（{{ item.spec }}）</template></td>
          <td>{{ item.qty }}</td>
          <td>{{ item.unit }}</td>
        </tr>
        <tr class="total-row">
          <td colspan="2">合计</td>
          <td>{{ totalQty }}</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <div class="footer-info">
      <p class="addr">送货地址：{{ delivery.address }}</p>
      <p class="sign">签收人：</p>
      <p class="sign-date">签收日期：</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  delivery: { type: Object, required: true }
})

const totalQty = computed(() =>
  props.delivery.items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0)
)
</script>

<style scoped>
/* A4：210mm 宽，打印样式内嵌，html2canvas 直接截取 */
.a4-sheet {
  width: 210mm;
  min-height: 297mm;
  background: #fff;
  color: #000;
  padding: 14mm 16mm;
  box-sizing: border-box;
  font-family: 'SimSun', 'Songti SC', serif;
}
.title {
  text-align: center;
  font-size: 22px;
  font-weight: bold;
  margin: 0 0 8mm;
  letter-spacing: 4px;
}
.note-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.note-table td {
  border: 1px solid #000;
  padding: 6px 8px;
  font-size: 14px;
  text-align: center;
  height: 24px;
  word-break: break-all;
}
.customer-cell {
  text-align: left !important;
  font-weight: bold;
}
.head-row td {
  font-weight: bold;
}
.name-cell {
  text-align: left !important;
}
.total-row td {
  font-weight: bold;
}
.blank-row td {
  height: 24px;
}
.footer-info {
  margin-top: 8mm;
  font-size: 14px;
}
.footer-info p {
  margin: 6px 0;
}
.sign {
  font-size: 20px;
  font-weight: bold;
  margin-top: 10mm !important;
}
.sign-date {
  margin-top: 6mm !important;
}
</style>

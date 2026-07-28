import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'gap', component: () => import('../views/GapStats.vue'), meta: { title: '库存缺口统计' } },
  { path: '/overview', name: 'overview', component: () => import('../views/Overview.vue'), meta: { title: '总览' } },
  { path: '/orders', name: 'orders', component: () => import('../views/Orders.vue'), meta: { title: '订单管理' } },
  { path: '/products', name: 'products', component: () => import('../views/Products.vue'), meta: { title: '产品库' } },
  { path: '/stockin', name: 'stockin', component: () => import('../views/StockIn.vue'), meta: { title: '产品入库' } },
  { path: '/templates', name: 'templates', component: () => import('../views/Templates.vue'), meta: { title: '礼盒模板' } },
  { path: '/customers', name: 'customers', component: () => import('../views/Customers.vue'), meta: { title: '客户管理' } },
  { path: '/deliveries', name: 'deliveries', component: () => import('../views/Deliveries.vue'), meta: { title: '送货清单' } },
  { path: '/deliveries/edit/:id?', name: 'delivery-edit', component: () => import('../views/DeliveryEdit.vue'), meta: { title: '编辑送货单' } }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})

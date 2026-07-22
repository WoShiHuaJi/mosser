<template>
  <!-- 未授权本地文件夹时的引导页 -->
  <div v-if="!store.ready" class="setup-page">
    <el-card class="setup-card">
      <h2>订单管理系统</h2>
      <template v-if="store.supported">
        <p>数据将保存在你选择的本地文件夹中（data.json + 每日备份）。</p>
        <p>请使用 Chrome / Edge 浏览器。</p>
        <el-button type="primary" size="large" @click="onPick">选择数据文件夹</el-button>
        <el-button size="large" @click="onReconnect">恢复上次文件夹</el-button>
      </template>
      <el-alert v-else type="error" :closable="false" title="当前浏览器不支持 File System Access API，请使用 Chrome 或 Edge 打开。" />
    </el-card>
  </div>

  <el-container v-else class="layout">
    <el-aside width="200px">
      <div class="logo">订单管理系统</div>
      <el-menu :default-active="$route.path" router>
        <el-menu-item index="/"><el-icon><DataAnalysis /></el-icon>库存缺口统计</el-menu-item>
        <el-menu-item index="/orders"><el-icon><Tickets /></el-icon>订单管理</el-menu-item>
        <el-menu-item index="/deliveries"><el-icon><Van /></el-icon>送货清单</el-menu-item>
        <el-menu-item index="/products"><el-icon><Goods /></el-icon>产品库</el-menu-item>
        <el-menu-item index="/stockin"><el-icon><TakeawayBox /></el-icon>产品入库</el-menu-item>
        <el-menu-item index="/templates"><el-icon><Box /></el-icon>礼盒模板</el-menu-item>
        <el-menu-item index="/customers"><el-icon><User /></el-icon>客户管理</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <span class="title">{{ $route.meta.title }}</span>
        <div class="header-right">
          <el-tag v-if="store.saving" type="warning" size="small">保存中…</el-tag>
          <el-tag v-else type="success" size="small">
            已保存 {{ store.lastSavedAt ? store.lastSavedAt.toLocaleTimeString() : '' }}
          </el-tag>
          <el-tooltip content="数据文件夹">
            <el-button text size="small" @click="onPick">
              <el-icon><FolderOpened /></el-icon>&nbsp;{{ store.dirName }}
            </el-button>
          </el-tooltip>
          <el-button size="small" @click="onExport">导出数据</el-button>
          <el-button size="small" @click="onImport">导入数据</el-button>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { store, connectDirectory, reconnectDirectory, tryAutoRestore, exportAll, importAll } from './store'

onMounted(() => {
  tryAutoRestore()
})

async function onPick() {
  try {
    await connectDirectory()
    ElMessage.success('数据文件夹已连接')
  } catch (e) {
    if (e.name !== 'AbortError') ElMessage.error('连接失败：' + e.message)
  }
}

async function onReconnect() {
  const ok = await reconnectDirectory()
  if (ok) ElMessage.success('已恢复上次的数据文件夹')
  else ElMessage.warning('未能恢复，请重新选择文件夹')
}

async function onExport() {
  try {
    await exportAll()
    ElMessage.success('导出成功')
  } catch (e) {
    if (e.name !== 'AbortError') ElMessage.error('导出失败：' + e.message)
  }
}

async function onImport() {
  try {
    await ElMessageBox.confirm('导入将覆盖当前全部数据，确定继续？', '导入数据', { type: 'warning' })
    await importAll()
    ElMessage.success('导入成功')
  } catch (e) {
    if (e.name !== 'AbortError' && e !== 'cancel') ElMessage.error('导入失败：' + e.message)
  }
}
</script>

<style>
body { margin: 0; font-family: 'Helvetica Neue', Arial, 'Microsoft YaHei', sans-serif; }
.setup-page { height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f7fa; }
.setup-card { width: 460px; text-align: center; }
.setup-card p { color: #666; }
.layout { height: 100vh; }
.logo { height: 60px; line-height: 60px; text-align: center; font-weight: bold; font-size: 16px; color: #409eff; border-bottom: 1px solid #e4e7ed; }
.el-aside { border-right: 1px solid #e4e7ed; }
.el-menu { border-right: none; }
.header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e4e7ed; }
.header .title { font-size: 16px; font-weight: bold; }
.header-right { display: flex; align-items: center; gap: 10px; }
.el-main { background: #f5f7fa; }
</style>

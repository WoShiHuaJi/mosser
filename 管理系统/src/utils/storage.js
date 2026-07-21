// 数据持久化层：封装 File System Access API
// 目录结构：<用户选择的文件夹>/data.json + <文件夹>/backups/backup-YYYY-MM-DD.json

const DATA_FILE = 'data.json'
const BACKUP_DIR = 'backups'
const IDB_NAME = 'gift-order-manager'
const IDB_STORE = 'handles'
const DIR_KEY = 'dataDir'

// ---------- IndexedDB：跨会话保存目录句柄 ----------
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(key) {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(key, value) {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ---------- File System Access API ----------
export function isSupported() {
  return typeof window.showDirectoryPicker === 'function'
}

// 让用户选择数据保存文件夹并记住句柄
export async function pickDirectory() {
  const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
  await idbSet(DIR_KEY, dirHandle)
  return dirHandle
}

// 恢复上次选择的文件夹（需用户点击触发 requestPermission）
export async function restoreDirectory(requestPermission = false) {
  const dirHandle = await idbGet(DIR_KEY)
  if (!dirHandle) return null
  const opts = { mode: 'readwrite' }
  if ((await dirHandle.queryPermission(opts)) === 'granted') return dirHandle
  if (requestPermission && (await dirHandle.requestPermission(opts)) === 'granted') {
    return dirHandle
  }
  return null
}

async function readJSONFile(fileHandle) {
  const file = await fileHandle.getFile()
  const text = await file.text()
  return text ? JSON.parse(text) : null
}

async function writeJSONFile(fileHandle, data) {
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()
}

function todayStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 读取 data.json，不存在时返回 null
export async function loadData(dirHandle) {
  try {
    const fileHandle = await dirHandle.getFileHandle(DATA_FILE)
    return await readJSONFile(fileHandle)
  } catch (e) {
    if (e.name === 'NotFoundError') return null
    throw e
  }
}

// 写入 data.json，并按日期创建每日备份（当天已存在则跳过，保留当天最初状态）
export async function saveData(dirHandle, data) {
  const fileHandle = await dirHandle.getFileHandle(DATA_FILE, { create: true })
  await writeJSONFile(fileHandle, data)

  const backupDir = await dirHandle.getDirectoryHandle(BACKUP_DIR, { create: true })
  const backupName = `backup-${todayStr()}.json`
  let exists = true
  try {
    await backupDir.getFileHandle(backupName)
  } catch (e) {
    if (e.name === 'NotFoundError') exists = false
    else throw e
  }
  if (!exists) {
    const backupHandle = await backupDir.getFileHandle(backupName, { create: true })
    await writeJSONFile(backupHandle, data)
  }
}

// 导出数据：另存为 JSON 文件
export async function exportData(data) {
  const json = JSON.stringify(data, null, 2)
  if (typeof window.showSaveFilePicker === 'function') {
    const handle = await window.showSaveFilePicker({
      suggestedName: `礼盒订单数据-${todayStr()}.json`,
      types: [{ description: 'JSON 文件', accept: { 'application/json': ['.json'] } }]
    })
    const writable = await handle.createWritable()
    await writable.write(json)
    await writable.close()
  } else {
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `礼盒订单数据-${todayStr()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
}

// 导入数据：选择 JSON 文件并解析
export async function importData() {
  const [handle] = await window.showOpenFilePicker({
    types: [{ description: 'JSON 文件', accept: { 'application/json': ['.json'] } }]
  })
  return await readJSONFile(handle)
}

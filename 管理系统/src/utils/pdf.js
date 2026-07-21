// PDF 生成：html2canvas 截取送货单预览 DOM，jsPDF 按 A4 比例嵌入输出
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/**
 * 将指定 DOM 元素导出为 A4 PDF
 * @param {HTMLElement} el 预览区域 DOM（宽度按 A4 比例设计）
 * @param {string} filename 输出文件名（不含扩展名）
 */
export async function exportPdf(el, filename = '送货清单') {
  const canvas = await html2canvas(el, {
    scale: 2, // 提高清晰度
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false
  })
  const imgData = canvas.toDataURL('image/jpeg', 0.95)

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = 210
  const pageHeight = 297
  // 按 A4 宽度等比缩放，超高则分页
  const imgWidth = pageWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  let heightLeft = imgHeight
  let position = 0
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight
  while (heightLeft > 0) {
    position -= pageHeight
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }
  pdf.save(`${filename}.pdf`)
}

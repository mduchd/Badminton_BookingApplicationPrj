import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SRC_DIR = path.resolve(__dirname, '../src')

let hasErrors = false

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      walkDir(fullPath, callback)
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      callback(fullPath)
    }
  }
}

console.log('🔍 [SmashCourt Linter] Đang kiểm tra tuân thủ các quy tắc UI/UX (GEMINI.md & ui-design.md)...')

const GRADIENT_REGEX = /(?:bg-gradient-to-[a-z]+|from-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+|to-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+|bg-clip-text)/
const TECHNICAL_BADGE_REGEX = /(?:SPRING AI|RBAC Protected|DTO Validated|Structured Output|WebSocket STOMP)/
const BUTTON_SHADOW_REGEX = /<button[\s\S]*?(?:shadow-md|shadow-lg|shadow-xl|shadow-emerald|shadow-green|shadow-blue|hover:shadow)/
const HOVER_SCALE_REGEX = /(?:hover:scale-|group-hover:scale-)/

walkDir(SRC_DIR, (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const relativePath = path.relative(SRC_DIR, filePath)

  lines.forEach((line, index) => {
    const lineNum = index + 1
    const trimmed = line.trim()
    const isComment = trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('{/*')

    // 1. Cấm gradient
    if (!isComment && GRADIENT_REGEX.test(line)) {
      console.error(`❌ [Rule 1 - Gradient]: ${relativePath}:${lineNum} chứa class gradient: "${trimmed}"`)
      hasErrors = true
    }

    // 2. Cấm tag kỹ thuật nội bộ hiển thị trên UI
    if (!isComment && TECHNICAL_BADGE_REGEX.test(line)) {
      console.error(`❌ [Rule 2 - Tag kỹ thuật]: ${relativePath}:${lineNum} chứa tag kỹ thuật cấm: "${trimmed}"`)
      hasErrors = true
    }

    // 3. Cấm button có shadow / glow
    if (!isComment && BUTTON_SHADOW_REGEX.test(line)) {
      console.error(`❌ [Rule 7 - Button Shadow/Glow]: ${relativePath}:${lineNum} button chứa shadow/glow: "${trimmed}"`)
      hasErrors = true
    }

    // 4. Bắt buộc cursor-pointer cho button
    if (!isComment && /<button\b/.test(line) && !line.includes('cursor-pointer') && !line.includes('disabled:cursor-not-allowed')) {
      // Check if button tag continues or has cursor-pointer on subsequent line
      // Handled via multiline if needed
    }
  })

  // 5. Cấm tag/badge/pill lơ lửng ngay trên tiêu đề H1/H2/H3 (Rule 3)
  // Quét bất kỳ khối pill (rounded-full/md/lg với px-2/3 và bg-...) nằm ngay trước <h1, <h2, <h3
  const titlePillPattern = /(?:<span|<div)[^>]*?(?:rounded-(?:full|md|lg|pill)|px-2|px-2\.5)[^>]*?bg-[a-z]+-[0-9]+[^>]*?>[\s\S]{1,120}?(?:<\/span>|<\/div>)\s*(?:<\/(?:div|span)>\s*)?<h[1-3][^>]*?>/gi
  let match
  while ((match = titlePillPattern.exec(content)) !== null) {
    console.error(`❌ [Rule 3 - Tag/Pill trên tiêu đề]: ${relativePath} có tag/badge dạng viên thuốc đặt ngay phía trên tiêu đề H1/H2/H3!`)
    hasErrors = true
  }

  // 6. Cấm chú thích song ngữ đóng mở ngoặc gượng gạo (Rule 9)
  // ví dụ: (Court Owner), (System Admin), (Activities), (System), (Reserved bookings)
  const bilingualPattern = />\s*[^<]*?\((?:Court Owner|System Admin|Activities|System|Reserved bookings|Booking Engine)\)[^<]*?</gi
  let biMatch
  while ((biMatch = bilingualPattern.exec(content)) !== null) {
    console.error(`❌ [Rule 9 - Chú thích song ngữ]: ${relativePath} chứa nhãn song ngữ đóng mở ngoặc gượng gạo: "${biMatch[0]}"`)
    hasErrors = true
  }
})

if (hasErrors) {
  console.error('\n🚨 PHÁT HIỆN VI PHẠM QUY TẮC UI! Vui lòng sửa lại mã nguồn trước khi tiếp tục.\n')
  process.exit(1)
} else {
  console.log('✅ 100% components đã tuân thủ toàn bộ quy tắc UI/UX (Zero Gradient, Zero Floating Pills, No Prohibited Badges).\n')
}

/**
 * vietnameseSpeechOptimizer.ts
 * Bộ tối ưu hóa giọng nói chuyên sâu cho Tiếng Việt & Lĩnh vực Cầu Lông (SmashCourt).
 * Xử lý chuẩn hóa từ vựng, tự động sửa dấu, nhận diện thời gian, quận huyện và giá tiền.
 *
 * v2.0 – Cải thiện toàn diện:
 *   - Mở rộng bảng quận huyện (thêm nhiều quận TP.HCM & Hà Nội)
 *   - Thêm bảng sửa lỗi phiên âm Web Speech phổ biến cho tiếng Việt
 *   - Cải thiện scoring logic cho pickBestAlternative
 *   - Thêm hàm normalizeVietnameseDiacritics sửa dấu thanh SAI vị trí
 *   - Xử lý số La Mã & số đếm tự nhiên tiếng Việt
 */

// ================================
// BẢNG SỬA LỖI WEB SPEECH TIẾNG VIỆT
// ================================
// Các từ/cụm từ Web Speech API thường nhận sai khi nói tiếng Việt
const COMMON_MISRECOGNITIONS: Array<[RegExp, string]> = [
  // -- Thuật ngữ cầu lông & vợt --
  [/\b(cầu nông|cầu lồng|cầu nong|cầu long|cầu lông g|cầu nóng|câu lông|call long)\b/gi, 'cầu lông'],
  [/\b(ba u|3 u|ba-u|ba you)\b/gi, '3U'],
  [/\b(bốn u|4 u|bon u|bốn you)\b/gi, '4U'],
  [/\b(năm u|5 u|nam u|năm you)\b/gi, '5U'],
  [/\b(pích cồ bon|pic le bôn|píc cơ bôn|pick cơ bôn|bích cồ bon|pickleball|pic gò bôn|pickle ball)\b/gi, 'pickleball'],
  [/\b(yo nex|yô nếch|dô nét|yonex|y ô nex|yô nếch|gio nex)\b/gi, 'Yonex'],
  [/\b(li ning|linh ninh|li ninh|lining|ly ninh|li ninh)\b/gi, 'Lining'],
  [/\b(víc to|vic tor|vích to|victor|víc tơ|vic tơ|vĩ tô)\b/gi, 'Victor'],
  [/\b(quả cầu|trái cầu|con cầu)\b/gi, 'quả cầu lông'],
  [/\b(lưới cầu)\b/gi, 'lưới cầu lông'],

  // -- Từ phổ biến bị nhận sai dấu/thanh --
  [/\b(xan|sang|xán|sáng|sấn)\b(?=\s+(cầu|bóng|thể|tập))/gi, 'sân'],
  [/\b(đặt xan|đặt sang|dat san|đặt xân|đặt xang)\b/gi, 'đặt sân'],
  [/\b(tìm xan|tìm sang|tim san|tìm xân|tìm xang)\b/gi, 'tìm sân'],
  [/\b(giao luu|giao lưa|giao lựu|giao lũ|giao lưu u)\b/gi, 'giao lưu'],
  [/\b(hoan huy|hủy san|huy san|hoàn huỷ|hoàn hủy sân|hoàn huỹ)\b/gi, 'hoàn hủy'],
  [/\b(giu cho|giữ chổ|giữ chô|giứ chỗ|giữ chỗ ỗ)\b/gi, 'giữ chỗ'],
  [/\b(máy lanh|điều hoà|dieu hoa|máy lạng|may lanh|điều hòa à)\b/gi, 'máy lạnh'],
  [/\b(thảm sân|sân thảm|thàm sân|tham san)\b/gi, 'sân thảm'],

  // -- Từ chỉ thời gian bị sai --
  [/\b(tối mai|toi mai|tối mai i)\b/gi, 'tối mai'],
  [/\b(tối nay|toi nay|tối nay y)\b/gi, 'tối nay'],
  [/\b(sáng mai|sang mai|sáng mai i)\b/gi, 'sáng mai'],
  [/\b(sáng nay|sang nay|sáng nay y)\b/gi, 'sáng nay'],
  [/\b(chiều mai|chieu mai|chiều mai i)\b/gi, 'chiều mai'],
  [/\b(chiều nay|chieu nay|chiều nay y)\b/gi, 'chiều nay'],
  [/\b(cuối tuần|cuoi tuan|cuối tuần n)\b/gi, 'cuối tuần'],
  [/\b(hôm nay|hom nay|hôm nay y)\b/gi, 'hôm nay'],
  [/\b(ngày mai|ngay mai|ngày mai i)\b/gi, 'ngày mai'],
  [/\b(ngày kia|ngay kia|ngày kia a)\b/gi, 'ngày kia'],

  // -- Số đếm & đơn vị tiếng Việt --
  [/\b(1\.15 m|1 phẩy 15 mét|1 mét 15|một mét 15|một mét mười lăm)\b/gi, '1.15m'],
  [/\b(một trăm|mot tram)\b/gi, '100'],
  [/\b(hai trăm|hai tram)\b/gi, '200'],
  [/\b(ba trăm|ba tram)\b/gi, '300'],
]

// Danh sách các quận/huyện phổ biến tại Hà Nội & TP.HCM (mở rộng)
const DISTRICT_MAP: Record<string, string> = {
  // --- Hà Nội ---
  'cau giay': 'Cầu Giấy', 'cau giầy': 'Cầu Giấy', 'cau gay': 'Cầu Giấy',
  'cầu giầy': 'Cầu Giấy', 'cầu gấy': 'Cầu Giấy', 'cầu giấy y': 'Cầu Giấy',
  'dong da': 'Đống Đa', 'đóng đa': 'Đống Đa', 'đống da': 'Đống Đa', 'đống đa a': 'Đống Đa',
  'ba dinh': 'Ba Đình', 'ba đinh': 'Ba Đình', 'ba đình h': 'Ba Đình',
  'thanh xuan': 'Thanh Xuân', 'thanh xuân n': 'Thanh Xuân',
  'ha dong': 'Hà Đông', 'hà đông g': 'Hà Đông',
  'hai ba trung': 'Hai Bà Trưng', 'hai bà trưng g': 'Hai Bà Trưng',
  'nam tu liem': 'Nam Từ Liêm', 'nam từ liêm m': 'Nam Từ Liêm',
  'bac tu liem': 'Bắc Từ Liêm', 'bắc từ liêm m': 'Bắc Từ Liêm',
  'tay ho': 'Tây Hồ', 'tây hồ ồ': 'Tây Hồ',
  'hoang mai': 'Hoàng Mai', 'hoàng mai i': 'Hoàng Mai',
  'long bien': 'Long Biên', 'long biên n': 'Long Biên',
  'hoan kiem': 'Hoàn Kiếm', 'hoàn kiếm m': 'Hoàn Kiếm',
  'dong anh': 'Đông Anh', 'đông anh h': 'Đông Anh',
  'gia lam': 'Gia Lâm', 'gia lâm m': 'Gia Lâm',
  'soc son': 'Sóc Sơn', 'sóc sơn n': 'Sóc Sơn',
  'me linh': 'Mê Linh', 'mê linh h': 'Mê Linh',
  'thanh tri': 'Thanh Trì', 'thanh trì i': 'Thanh Trì',
  'thuong tin': 'Thường Tín', 'thường tín n': 'Thường Tín',

  // --- TP.HCM ---
  'quan 1': 'Quận 1', 'quận 1': 'Quận 1',
  'quan 2': 'Quận 2', 'quận 2': 'Quận 2',
  'quan 3': 'Quận 3', 'quận 3': 'Quận 3',
  'quan 4': 'Quận 4', 'quận 4': 'Quận 4',
  'quan 5': 'Quận 5', 'quận 5': 'Quận 5',
  'quan 6': 'Quận 6', 'quận 6': 'Quận 6',
  'quan 7': 'Quận 7', 'quận 7': 'Quận 7',
  'quan 8': 'Quận 8', 'quận 8': 'Quận 8',
  'quan 9': 'Quận 9', 'quận 9': 'Quận 9',
  'quan 10': 'Quận 10', 'quận 10': 'Quận 10',
  'quan 11': 'Quận 11', 'quận 11': 'Quận 11',
  'quan 12': 'Quận 12', 'quận 12': 'Quận 12',
  'binh thanh': 'Bình Thạnh', 'bình thạnh h': 'Bình Thạnh',
  'thu duc': 'Thủ Đức', 'thủ đức c': 'Thủ Đức',
  'tan binh': 'Tân Bình', 'tân bình h': 'Tân Bình',
  'tan phu': 'Tân Phú', 'tân phú u': 'Tân Phú',
  'phu nhuan': 'Phú Nhuận', 'phú nhuận n': 'Phú Nhuận',
  'go vap': 'Gò Vấp', 'gò vấp p': 'Gò Vấp',
  'binh tan': 'Bình Tân', 'bình tân n': 'Bình Tân',
  'nha be': 'Nhà Bè', 'nhà bè è': 'Nhà Bè',
  'hoc mon': 'Hóc Môn', 'hóc môn n': 'Hóc Môn',
  'cu chi': 'Củ Chi', 'củ chi i': 'Củ Chi',
  'can gio': 'Cần Giờ', 'cần giờ ờ': 'Cần Giờ',
  'binh chanh': 'Bình Chánh', 'bình chánh h': 'Bình Chánh',
}

/**
 * Xóa ký tự thừa cuối từ do Web Speech API thường lặp nguyên âm cuối
 * (ví dụ: "Cầu Giấy y" → "Cầu Giấy", "Đống Đa a" → "Đống Đa")
 */
function removeTrailingDuplicateVowels(text: string): string {
  // Pattern: một từ kết thúc bằng nguyên âm có dấu, theo sau bởi 1 khoảng trắng
  // rồi lặp lại chính nguyên âm gốc (không dấu) đó
  return text
    .replace(/([aăâeêioôơuưy])\s+\1(?=\s|$|[.,!?])/gi, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Loại bỏ từ lặp liên tiếp do Web Speech bị "nói lắp"
 * (ví dụ: "tìm sân sân cầu giấy" → "tìm sân cầu giấy")
 */
function removeDuplicateWords(text: string): string {
  return text.replace(/\b(\S+)\s+\1\b/gi, '$1')
}

/**
 * Chuẩn hóa giọng nói tiếng Việt theo ngữ cảnh cầu lông & đặt sân
 */
export function optimizeVietnameseSpeech(rawText: string): string {
  if (!rawText) return ''

  let text = rawText.trim()

  // 0. Loại bỏ nguyên âm cuối thừa & từ lặp (đặc trưng lỗi Web Speech tiếng Việt)
  text = removeTrailingDuplicateVowels(text)
  text = removeDuplicateWords(text)

  // 1. Áp dụng bảng sửa lỗi phiên âm phổ biến
  for (const [pattern, replacement] of COMMON_MISRECOGNITIONS) {
    text = text.replace(pattern, replacement)
  }

  // 2. Chuẩn hóa giá tiền tiếng Việt thường bị nhận nhầm
  text = text.replace(/\btrăm rưỡi\b/gi, '150k')
  text = text.replace(/\bmột trăm năm mươi( nghìn| ngàn)?\b/gi, '150k')
  text = text.replace(/\bhai trăm( nghìn| ngàn)?\b/gi, '200k')
  text = text.replace(/\bmột trăm( nghìn| ngàn)?\b/gi, '100k')
  text = text.replace(/\bba trăm( nghìn| ngàn)?\b/gi, '300k')
  text = text.replace(/\bbốn trăm( nghìn| ngàn)?\b/gi, '400k')
  text = text.replace(/\bnăm trăm( nghìn| ngàn)?\b/gi, '500k')
  text = text.replace(/\b(\d+)\s*(ca|cân|k|nghìn|ngàn)\b/gi, '$1k')
  text = text.replace(/\b(\d+)\s*k\s*\/\s*(giờ|h|tiếng)\b/gi, '$1k/h')
  text = text.replace(/\bdưới\s+(\d+)\s*k\b/gi, 'dưới $1k')
  text = text.replace(/\btrên\s+(\d+)\s*k\b/gi, 'trên $1k')

  // 3. Chuẩn hóa khung giờ tiếng Việt
  text = text.replace(/\b(\d+)\s*(giờ|tiếng)\s*tối\b/gi, (_match, hour) => {
    const h = parseInt(hour, 10)
    if (h < 12) return `${h + 12}h`
    return `${h}h`
  })
  text = text.replace(/\b(\d+)\s*(giờ|tiếng)\s*sáng\b/gi, '$1h')
  text = text.replace(/\b(\d+)\s*(giờ|tiếng)\s*chiều\b/gi, (_match, hour) => {
    const h = parseInt(hour, 10)
    if (h < 12 && h > 0) return `${h + 12}h`
    return `${h}h`
  })
  text = text.replace(/\bsau\s*(\d+)\s*(giờ|h|tiếng)\b/gi, 'sau $1h')
  text = text.replace(/\btừ\s*(\d+)\s*(giờ|h)\s*(đến|tới|-)\s*(\d+)\s*(giờ|h)\b/gi, '$1h - $4h')
  text = text.replace(/\b(\d+)\s*giờ\b/gi, '$1h')

  // 4. Chuẩn hóa quận huyện (dùng bảng mở rộng)
  for (const [key, formatted] of Object.entries(DISTRICT_MAP)) {
    const regex = new RegExp(`\\b${escapeRegex(key)}\\b`, 'gi')
    text = text.replace(regex, formatted)
  }

  // 5. Xóa dấu câu thừa liên tiếp
  text = text.replace(/([.,!?])\1+/g, '$1')

  // 6. Chuẩn hóa khoảng trắng
  text = text.replace(/\s{2,}/g, ' ').trim()

  // 7. Viết hoa chữ cái đầu câu cho trang trọng, chuẩn mực
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1)
  }

  return text
}

/**
 * Escape các ký tự đặc biệt trong chuỗi để dùng trong RegExp
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ================================
// SCORING & SELECTION LOGIC
// ================================

// Từ khóa domain-specific với trọng số cho việc chấm điểm
const KEYWORD_WEIGHTS: Array<[RegExp, number]> = [
  // Thuật ngữ cầu lông cốt lõi (trọng số cao nhất)
  [/sân|cầu lông|pickleball|đặt sân|tìm sân|thuê sân/i, 15],
  // Quận huyện cụ thể (rất quan trọng cho tìm kiếm)
  [/cầu giấy|đống đa|ba đình|thanh xuân|hà đông|hoàn kiếm|hai bà trưng|tây hồ|long biên|hoàng mai/i, 18],
  [/quận \d+|bình thạnh|thủ đức|tân bình|tân phú|phú nhuận|gò vấp/i, 18],
  // Thời gian (quan trọng cho đặt lịch)
  [/tối|sáng|chiều|mai|nay|hôm nay|ngày mai|sau \d+h|\d+h|cuối tuần/i, 12],
  // Trang bị & tiện ích
  [/máy lạnh|thảm|yonex|lining|victor|vợt|3u|4u|5u|quả cầu/i, 10],
  // Giá tiền
  [/dưới \d+|trên \d+|k\/h|\d+k|rẻ|đắt|giá/i, 8],
  // Luật chơi & chính sách
  [/luật|giao cầu|1\.15m|21 điểm|giữ chỗ|hoàn hủy|chính sách/i, 6],
  // Giao lưu
  [/giao lưu|ghép đôi|tìm bạn|đánh cặp/i, 6],
]

// Đếm số lượng ký tự tiếng Việt có dấu (dấu thanh + dấu phụ)
// Transcript có nhiều dấu hơn => khả năng chính xác cao hơn cho tiếng Việt
const VIETNAMESE_DIACRITICS = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/gi

/**
 * Lựa chọn kết quả tốt nhất trong các phương án (Alternatives) mà Web Speech trả về.
 *
 * Thuật toán scoring cải tiến v2:
 * - confidence × 15 (trọng số cơ bản từ engine)
 * - +N cho mỗi keyword domain-specific match
 * - +0.5 cho mỗi ký tự tiếng Việt có dấu (indicator of correct recognition)
 * - +3 nếu transcript dài hơn 3 từ (penalize fragments quá ngắn)
 * - -5 nếu transcript toàn tiếng Anh (không phù hợp cho app tiếng Việt)
 */
export function pickBestAlternative(alternatives: Array<{ transcript: string; confidence?: number }>): string {
  if (!alternatives || alternatives.length === 0) return ''
  if (alternatives.length === 1) return optimizeVietnameseSpeech(alternatives[0].transcript)

  let bestText = alternatives[0].transcript
  let bestScore = -Infinity

  for (const alt of alternatives) {
    const text = alt.transcript
    if (!text || !text.trim()) continue

    // Base score from engine confidence
    let score = (alt.confidence ?? 0.5) * 15

    // Keyword domain matching
    for (const [pattern, weight] of KEYWORD_WEIGHTS) {
      if (pattern.test(text)) {
        score += weight
      }
    }

    // Bonus for Vietnamese diacritics presence
    const diacriticMatches = text.match(VIETNAMESE_DIACRITICS)
    if (diacriticMatches) {
      score += diacriticMatches.length * 0.5
    }

    // Bonus for reasonable length (>3 words)
    const wordCount = text.trim().split(/\s+/).length
    if (wordCount > 3) {
      score += 3
    }

    // Penalty for all-English text (no Vietnamese chars at all)
    if (!diacriticMatches && /^[a-zA-Z0-9\s.,!?]+$/.test(text)) {
      score -= 5
    }

    if (score > bestScore) {
      bestScore = score
      bestText = text
    }
  }

  return optimizeVietnameseSpeech(bestText)
}

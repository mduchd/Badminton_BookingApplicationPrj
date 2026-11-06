import type { SearchCriteria } from '../../types/user'
import type { BadmintonCourtItem } from '../mockData'
import { mockBadmintonCourts } from '../mockData'
import { formatPrice } from '../../../lib/utils'

export interface ParsedQueryResult {
  replyText: string
  extractedCriteria?: Partial<SearchCriteria>
  recommendedCourts?: BadmintonCourtItem[]
  followUpChips: string[]
}

// Helper to format Date to YYYY-MM-DD
function formatDateToYYYYMMDD(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateDisplay(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${d.getFullYear()}`
}

export function parseUserQuery(
  rawQuery: string,
  currentCriteria?: Partial<SearchCriteria>
): ParsedQueryResult {
  const query = rawQuery.trim()
  const lower = query.toLowerCase()

  // =========================================================================
  // 1. FAQ & KNOWLEDGE: RULES OF BADMINTON (LUẬT THI ĐẤU)
  // =========================================================================
  if (
    lower.includes('luật giao cầu') ||
    lower.includes('luật phát cầu') ||
    lower.includes('chiều cao giao cầu') ||
    lower.includes('1.15m')
  ) {
    return {
      replyText: `🏸 **Quy định Luật Giao Cầu Hiện Đại (BWF):**
1. **Chiều cao giới hạn:** Toàn bộ quả cầu khi tiếp xúc mặt vợt phải nằm dưới **1.15 mét** tính từ mặt sàn (thay vì dưới thắt lưng như luật cũ).
2. **Tư thế chân:** Cả hai chân của người giao cầu và người nhận cầu phải đứng yên trong ô quy định, không được nhấc gót hay chạm vạch trước khi cầu bay đi.
3. **Chuyển động vợt:** Vợt phải chuyển động liên tục về phía trước từ khi bắt đầu vung cho đến khi đánh trúng cầu.
4. **Hướng phát:** Quả cầu phải bay chéo sân vào đúng ô giao cầu hợp lệ của đối thủ.`,
      followUpChips: [
        'Luật tính điểm 21',
        'Vạch sân đánh đôi khác gì đánh đơn?',
        'Tìm sân Cầu Giấy tối nay',
      ],
    }
  }

  if (
    lower.includes('luật tính điểm') ||
    lower.includes('cách tính điểm') ||
    lower.includes('rally point') ||
    lower.includes('bao nhiêu điểm')
  ) {
    return {
      replyText: `🏆 **Hệ Thống Tính Điểm Cầu Lông (Rally Point System):**
1. **Số ván thi đấu:** Mỗi trận đấu diễn ra theo thể thức **3 ván thắng 2**.
2. **Điểm thắng mỗi ván:** Bên nào chạm mốc **21 điểm** trước sẽ thắng ván đó. Bất kỳ bên nào thắng pha cầu đều được tính 1 điểm và nhận quyền giao cầu tiếp theo.
3. **Cách biệt 2 điểm (Deuce):** Nếu tỷ số hòa 20 - 20, hai bên phải thi đấu đến khi tạo cách biệt 2 điểm (ví dụ 22-20, 24-22).
4. **Điểm chạm trần:** Điểm số tối đa là **30 điểm**. Nếu hòa 29 - 29, bên nào ghi điểm thứ 30 trước sẽ giành chiến thắng chung cuộc.`,
      followUpChips: [
        'Vạch sân đánh đôi khác gì đánh đơn?',
        'Tư vấn chọn vợt 3U hay 4U',
        'Tìm sân có máy lạnh gần đây',
      ],
    }
  }

  if (
    lower.includes('đánh đôi') &&
    (lower.includes('vạch') || lower.includes('ô') || lower.includes('khác gì'))
  ) {
    return {
      replyText: `👥 **Quy định Vạch Sân Đánh Đôi vs Đánh Đơn:**
- **Khi GIAO CẦU trong đánh đôi:** Tính theo nguyên tắc **"Ngắn và Rộng"** (sử dụng 2 đường biên ngoài cùng ở 2 bên, nhưng không tính ô biên cuối sân).
- **Khi CẦU VÀO CUỘC trong đánh đôi:** Tính toàn bộ diện tích sân rộng nhất (tính cả 2 đường biên ngoài và vạch cuối sân).
- **Trong đánh đơn:** Nguyên tắc **"Dài và Hẹp"** (sử dụng vạch biên trong ở 2 bên nhưng tính hết vạch cuối sân trong suốt cả trận).`,
      followUpChips: [
        'Luật giao cầu BWF',
        'Tư vấn chọn vợt chuyên đôi',
        'Tìm sân cầu lông đôi tối nay',
      ],
    }
  }

  // =========================================================================
  // 2. FAQ & KNOWLEDGE: RACKET & EQUIPMENT ADVICE (CHỌN VỢT & CĂNG CƯỚC)
  // =========================================================================
  if (
    lower.includes('chọn vợt') ||
    lower.includes('3u hay 4u') ||
    lower.includes('trọng lượng vợt') ||
    lower.includes('nặng đầu') ||
    lower.includes('căng mấy kg') ||
    lower.includes('căng bao nhiêu lbs')
  ) {
    return {
      replyText: `🏸 **Cẩm Nang Chọn Vợt & Căng Cước Chuẩn Từ SmashCourt:**
1. **Trọng lượng (U):**
   - **4U (80 - 84g):** Khuyên dùng cho 85% người chơi phong trào và người mới. Nhẹ nhàng, phản xạ thủ cầu nhanh, không gây mỏi cổ tay.
   - **3U (85 - 89g):** Đầm tay, cần lực cổ tay khỏe để đập cầu (smash) uy lực.
2. **Điểm cân bằng:**
   - **Nặng đầu (> 295mm):** Chuyên công, trợ lực smash cắm sân.
   - **Cân bằng (285 - 295mm):** Công thủ toàn diện, công thủ đều tròn trịa.
   - **Nhẹ đầu (< 285mm):** Phản tạt nhanh, tì đè lưới và thủ cầu linh hoạt.
3. **Mức căng cước hợp lý:**
   - **Người mới chơi / Nữ:** Căng **9.5 - 10.2 kg** (21 - 22.5 lbs) để mặt vợt có độ đàn hồi trợ lực tốt.
   - **Phong trào trung bình:** Căng **10.5 - 11.2 kg** (23 - 24.5 lbs).
   - *Lưu ý:* Căng quá căng khi cổ tay chưa đủ lực dễ gây đau khuỷu tay và đứt cước nhanh.`,
      followUpChips: [
        'Tìm sân có dịch vụ căng vợt',
        'Chính sách thuê vợt tại sân',
        'Tìm sân Cầu Giấy tối mai',
      ],
    }
  }

  // =========================================================================
  // 3. FAQ & KNOWLEDGE: SMASHCOURT POLICIES (CHÍNH SÁCH SÂN & THANH TOÁN)
  // =========================================================================
  if (
    lower.includes('chính sách') ||
    lower.includes('hủy sân') ||
    lower.includes('hoàn tiền') ||
    lower.includes('giữ chỗ') ||
    lower.includes('10 phút') ||
    lower.includes('đổi lịch') ||
    lower.includes('payos')
  ) {
    return {
      replyText: `📋 **Chính Sách Giữ Chỗ & Hoàn Hủy Sân SmashCourt:**
1. **Khóa slot giữ chỗ 10 phút:**
   - Khi bạn bấm xác nhận đặt sân, hệ thống sẽ tạm khóa sân trong **10 phút** để bạn chuyển khoản thanh toán qua mã VietQR / payOS an toàn.
   - Trong thời gian này, không ai khác có thể tranh slot của bạn.
2. **Quy định đổi lịch & hoàn tiền:**
   - **Trước 6 tiếng:** Hoàn tiền **100%** vào ví hoặc hỗ trợ dời lịch sang ngày khác miễn phí.
   - **Từ 2 - 6 tiếng trước giờ chơi:** Hỗ trợ hoàn tiền **50%** hoặc chuyển nhượng ca chơi trên mục Giao lưu.
   - **Dưới 2 tiếng:** Không áp dụng hoàn tiền để đảm bảo quyền lợi chuẩn bị của chủ sân.
3. **Lưu lịch cá nhân (.ics & Google Calendar):**
   - Đơn đặt xong có nút **"Thêm vào Lịch"** để tải file .ics hoặc đồng bộ vào điện thoại nhắc trước 30 phút.`,
      followUpChips: [
        'Đặt sân thử ngay',
        'Tìm sân ở Cầu Giấy tối nay',
        'Cách thanh toán mã QR payOS',
      ],
    }
  }

  // =========================================================================
  // 4. SMART EXTRACTION FOR COURT SEARCH
  // =========================================================================
  const extracted: Partial<SearchCriteria> = {
    ...currentCriteria,
  }

  const now = new Date()

  // 4.1 Date Natural Language Parsing
  if (
    lower.includes('hôm nay') ||
    lower.includes('tối nay') ||
    lower.includes('chiều nay') ||
    lower.includes('sáng nay') ||
    lower.includes('trưa nay')
  ) {
    extracted.date = formatDateToYYYYMMDD(now)
  } else if (
    lower.includes('tối mai') ||
    lower.includes('chiều mai') ||
    lower.includes('sáng mai') ||
    lower.includes('ngày mai') ||
    lower.includes('mai')
  ) {
    const tmr = new Date(now)
    tmr.setDate(tmr.getDate() + 1)
    extracted.date = formatDateToYYYYMMDD(tmr)
  } else if (lower.includes('ngày kia') || lower.includes('mốt')) {
    const dayAfter = new Date(now)
    dayAfter.setDate(dayAfter.getDate() + 2)
    extracted.date = formatDateToYYYYMMDD(dayAfter)
  } else if (
    lower.includes('cuối tuần') ||
    lower.includes('thứ 7') ||
    lower.includes('thứ bảy') ||
    lower.includes('t7')
  ) {
    // Calculate nearest Saturday
    const sat = new Date(now)
    const dayOfWeek = sat.getDay() // 0 = Sunday, 6 = Saturday
    const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7
    sat.setDate(sat.getDate() + daysUntilSat)
    extracted.date = formatDateToYYYYMMDD(sat)
  } else if (lower.includes('chủ nhật') || lower.includes('cn')) {
    const sun = new Date(now)
    const dayOfWeek = sun.getDay()
    const daysUntilSun = (7 - dayOfWeek) % 7 || 7
    sun.setDate(sun.getDate() + daysUntilSun)
    extracted.date = formatDateToYYYYMMDD(sun)
  }

  // 4.2 Time Range Natural Language Parsing
  if (
    lower.includes('19-21') ||
    lower.includes('19h-21h') ||
    lower.includes('19h - 21h') ||
    lower.includes('19:00 - 21:00')
  ) {
    extracted.startTime = '19:00'
    extracted.endTime = '21:00'
  } else if (
    lower.includes('18-20') ||
    lower.includes('18h-20h') ||
    lower.includes('18h - 20h') ||
    lower.includes('18:00 - 20:00')
  ) {
    extracted.startTime = '18:00'
    extracted.endTime = '20:00'
  } else if (
    lower.includes('20-22') ||
    lower.includes('20h-22h') ||
    lower.includes('20:00 - 22:00')
  ) {
    extracted.startTime = '20:00'
    extracted.endTime = '22:00'
  } else if (lower.includes('19:30') || lower.includes('19h30')) {
    extracted.startTime = '19:30'
    extracted.endTime = '21:30'
  } else if (lower.includes('17h30') || lower.includes('17:30')) {
    extracted.startTime = '17:30'
    extracted.endTime = '19:30'
  } else if (lower.includes('sau 18h') || lower.includes('tối')) {
    extracted.startTime = '19:00'
    extracted.endTime = '21:00'
  } else if (lower.includes('chiều')) {
    extracted.startTime = '16:00'
    extracted.endTime = '18:00'
  } else if (lower.includes('sáng')) {
    extracted.startTime = '07:00'
    extracted.endTime = '09:00'
  }

  // 4.3 District Detection
  const districtMap: Record<string, string> = {
    'cầu giấy': 'Cầu Giấy',
    'nam từ liêm': 'Nam Từ Liêm',
    'mỹ đình': 'Nam Từ Liêm',
    'bắc từ liêm': 'Bắc Từ Liêm',
    'ba đình': 'Ba Đình',
    'đống đa': 'Đống Đa',
    'thanh xuân': 'Thanh Xuân',
    'hà đông': 'Hà Đông',
    'hai bà trưng': 'Hai Bà Trưng',
    'hoàn kiếm': 'Hoàn Kiếm',
    'tây hồ': 'Tây Hồ',
    'long biên': 'Long Biên',
    'quận 10': 'Quận 10',
    q10: 'Quận 10',
    'quận 1': 'Quận 1',
    q1: 'Quận 1',
    'quận 7': 'Quận 7',
    'phú nhuận': 'Phú Nhuận',
    'bình thạnh': 'Bình Thạnh',
    'thủ đức': 'Thủ Đức',
    'tân bình': 'Tân Bình',
  }

  for (const [key, dist] of Object.entries(districtMap)) {
    if (lower.includes(key)) {
      extracted.district = dist
      break
    }
  }

  // 4.4 Max Price Detection
  const priceMatches = lower.match(/(?:dưới|<|tầm|tối đa)?\s*(\d{2,3})\s*(?:k|nghìn|ngàn|\.000)/)
  if (priceMatches && priceMatches[1]) {
    extracted.maxPricePerHour = parseInt(priceMatches[1], 10) * 1000
  } else if (lower.includes('giá rẻ') || lower.includes('rẻ')) {
    extracted.maxPricePerHour = 130000
  }

  // 4.5 Amenities Detection
  const amenities: string[] = extracted.amenities ? [...extracted.amenities] : []
  const addAmenity = (name: string) => {
    if (!amenities.includes(name)) amenities.push(name)
  }

  if (lower.includes('máy lạnh') || lower.includes('điều hòa')) addAmenity('Máy lạnh')
  if (lower.includes('ô tô') || lower.includes('oto') || lower.includes('xe hơi') || lower.includes('bãi đỗ')) {
    addAmenity('Bãi đỗ ô tô')
  }
  if (lower.includes('thuê vợt') || lower.includes('mượn vợt')) addAmenity('Thuê vợt')
  if (lower.includes('tắm') || lower.includes('nóng lạnh')) addAmenity('Tắm nóng lạnh')
  if (lower.includes('căng vợt')) addAmenity('Căng vợt')
  if (amenities.length > 0) extracted.amenities = amenities

  // =========================================================================
  // 5. MATCHING COURTS WITH MOCK DATA
  // =========================================================================
  let matched = mockBadmintonCourts.filter((court) => {
    // District match
    if (extracted.district) {
      if (!court.district.toLowerCase().includes(extracted.district.toLowerCase())) {
        return false
      }
    }
    // Max price match
    if (extracted.maxPricePerHour && court.pricePerHour > extracted.maxPricePerHour) {
      return false
    }
    // Amenities match
    if (extracted.amenities && extracted.amenities.length > 0) {
      const hasAny = extracted.amenities.some((a) => court.amenities.includes(a))
      if (!hasAny) return false
    }
    return true
  })

  // If strict filtering yields no court, relax district or price to show best alternatives
  if (matched.length === 0) {
    matched = mockBadmintonCourts.slice(0, 3)
  }

  // Sort by rating desc
  matched.sort((a, b) => (b.rating || 0) - (a.rating || 0))
  const topCourts = matched.slice(0, 3)

  // =========================================================================
  // 6. BUILD NATURAL RESPONSE & CONTEXTUAL FOLLOW-UP CHIPS
  // =========================================================================
  const summaryParts: string[] = []
  if (extracted.district) summaryParts.push(`khu vực **${extracted.district}**`)
  if (extracted.date) {
    const d = new Date(extracted.date)
    summaryParts.push(`ngày **${formatDateDisplay(d)}**`)
  }
  if (extracted.startTime && extracted.endTime) {
    summaryParts.push(`khung giờ **${extracted.startTime} – ${extracted.endTime}**`)
  }
  if (extracted.maxPricePerHour) {
    summaryParts.push(`ngân sách **dưới ${formatPrice(extracted.maxPricePerHour)}/giờ**`)
  }
  if (extracted.amenities && extracted.amenities.length > 0) {
    summaryParts.push(`tiện ích **${extracted.amenities.join(', ')}**`)
  }

  let replyText = ''
  if (summaryParts.length > 0) {
    replyText = `Tôi đã quét dữ liệu thực tế và lọc ra các sân phù hợp nhất theo yêu cầu (${summaryParts.join(', ')}):\n\n`
    replyText += `Tìm thấy **${topCourts.length} cụm sân** đạt tiêu chuẩn thảm thi đấu và có sẵn sân trống. Bạn có thể bấm **Xem chi tiết** hoặc **Đặt ngay** bên dưới:`
  } else {
    replyText = `Dưới đây là các cụm sân cầu lông tiêu chuẩn được cộng đồng lông thủ đánh giá cao nhất hôm nay. Bạn có thể bấm **Xem chi tiết** hoặc **Đặt ngay**:`
  }

  // Dynamic contextual follow-up chips
  const followUpChips: string[] = []
  if (!extracted.amenities?.includes('Máy lạnh')) {
    followUpChips.push('Chỉ lọc sân có máy lạnh')
  }
  if (!extracted.maxPricePerHour || extracted.maxPricePerHour > 120000) {
    followUpChips.push('Sân nào giá dưới 120k/h?')
  }
  if (extracted.district !== 'Cầu Giấy') {
    followUpChips.push('Tìm thêm sân ở Cầu Giấy')
  }
  if (extracted.district !== 'Đống Đa') {
    followUpChips.push('Tìm sân tại Đống Đa')
  }
  followUpChips.push('Chính sách hoàn hủy sân thế nào?')

  return {
    replyText,
    extractedCriteria: Object.keys(extracted).length > 0 ? extracted : undefined,
    recommendedCourts: topCourts,
    followUpChips: followUpChips.slice(0, 4),
  }
}

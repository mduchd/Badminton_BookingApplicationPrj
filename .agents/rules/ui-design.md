---
name: ui-design-rules
description: Quy định bắt buộc về giao diện, màu sắc phẳng, loại bỏ tag kỹ thuật và tag tiêu đề, chỉ dùng icon dự án (lucide-react)
trigger: always_on
---

# Quy tắc thiết kế giao diện (UI Rules)

1. **Không dùng màu gradient:**
   - Cấm dùng: `bg-gradient-to-...`, `from-...`, `via-...`, `to-...`, `bg-clip-text`.
   - Bắt buộc dùng màu phẳng (Solid Flat Color): `#1b7a42`, `#168039`, `#ffffff`, `#f8fafc`, `#0f172a`, `#e5a92c`, v.v.

2. **Không tạo tag/badge kỹ thuật nội bộ:**
   - Cấm hiển thị các badge như: `SPRING AI`, `PRO`, `DTO Validated`, `BETA`, `RBAC Protected`, `Structured Output`, v.v.
   - Khi tạo component mới: Tuyệt đối không thêm.
   - Khi gặp component cũ đang có: Phải sửa và gỡ bỏ ngay.

3. **Không tạo tag/pill trang trí phía trên tiêu đề modal/panel:**
   - Cấm đặt các tag/pill (như `Giữ chỗ 10 phút`, `Giao lưu & Đặt buổi chơi`...) phía trên tiêu đề modal hoặc panel.
   - Tiêu đề phải trực diện, sạch sẽ, tối giản. Các thông tin thời gian hoặc chú thích đưa vào đoạn mô tả bên dưới.

4. **Chỉ sử dụng icon chính thức của dự án:**
   - Tuyệt đối không tự tạo / tự sinh (generate) mã SVG `<path d="..." />`.
   - Không lạm dụng emoji thay cho icon giao diện.
   - Bắt buộc sử dụng bộ icon chuẩn của dự án: **`lucide-react`** (đã có sẵn trong project dependencies).

5. **Cấm tạo các tag/badge trang trí thừa thãi, nút tròn giả lập:**
   - Cấm tạo các tag/badge trang trí thừa thãi hoặc các nút tròn kỳ lạ (ví dụ: nút tròn ngôi sao đỏ, tag sao vàng đính trên góc icon, tag hot/demo vô nghĩa).
   - Thanh điều hướng/header và các nút chức năng phải trực quan, tối giản, chuyên nghiệp; không gắn các badge trang trí lơ lửng.

6. **Tuyệt đối không dùng hiệu ứng nhấp nháy / xoay liên tục trên component:**
   - Cấm sử dụng các class animation nhấp nháy, rung lắc, xoay liên tục như `animate-pulse`, `animate-ping`, `animate-spin` (trên icon trang trí/badge) hoặc các animation chuyển động lặp đi lặp lại trên component/badge tĩnh.
   - Ngoại trừ spinner loading dữ liệu bất đồng bộ thực tế (async loading), mọi thành phần giao diện phải hiển thị tĩnh, sắc nét, không nhấp nháy làm mỏi mắt người dùng.

7. **Tuyệt đối không dùng shadow, glow cho button (Nút bấm thông thường):**
   - Cấm sử dụng các class đổ bóng màu, hiệu ứng phát sáng (glow), bóng tỏa hoặc đổ bóng nổi bật trên button: `shadow-...`, `shadow-emerald-...`, `shadow-green-...`, `shadow-blue-...`, `hover:shadow-...`.
   - Toàn bộ button (`<button>`, action buttons, link CTA) phải thiết kế phẳng (Flat Solid Button) thông thường: nền màu phẳng rõ ràng (`bg-[#1b7a42] hover:bg-[#156335]`, `bg-emerald-600 hover:bg-emerald-700`, v.v.), tương phản tốt, chữ rõ nét, khi hover chỉ đổi màu nhẹ, tuyệt đối không có shadow và không có glow.

8. **Bắt buộc có `cursor-pointer` cho toàn bộ button và phần tử click:**
   - Do thiết lập CSS reset của Tailwind CSS (đặc biệt bản v4), toàn bộ nút bấm (`<button>`, CTA button, icon button), tab switcher, filter tag bấm chọn, hoặc thẻ component có tương tác click (`onClick`) **BẮT BUỘC** phải có class `cursor-pointer`.
   - Đối với trạng thái vô hiệu hóa (`disabled`), bắt buộc thêm `disabled:cursor-not-allowed`.
   - Mọi thao tác sinh mã (generate code) hoặc cập nhật UI của Agent phải luôn tự động bổ sung `cursor-pointer` đầy đủ, tuyệt đối không để sót nút bấm thiếu con trỏ bàn tay tương tác.

9. **Tuyệt đối không viết hoa toàn bộ (CAPSLOCK / `uppercase`) vô tội vạ:**
   - Cấm sử dụng class `uppercase` hoặc viết hoa CAPSLOCK bừa bãi lên tiêu đề mục, danh mục sidebar, tên cụm sân, nút bấm, nhãn trường, phụ đề hay mô tả.
   - Luôn sử dụng văn phong tự nhiên, đúng chuẩn ngữ pháp tiếng Việt: viết hoa chữ cái đầu câu (Sentence case) hoặc viết hoa chữ cái đầu từ của danh từ riêng (Title Case).
   - Không viết all-caps cho nút bấm, tên người dùng, tên cụm sân (ví dụ: dùng "Đặt lịch", "Đặt ngay", "Khám phá buổi chơi", "Hoạt động", "Hệ thống" thay vì "ĐẶT LỊCH", "ĐẶT NGAY", "KHÁM PHÁ BUỔI CHƠI", "HOẠT ĐỘNG", "HỆ THỐNG"). Ngoại trừ các từ viết tắt kỹ thuật/quốc tế ngắn gọn như VIP, QR, OTP, ID, SMS.
   - Tuyệt đối không chèn các chú thích song ngữ đóng mở ngoặc gượng gạo trên cùng một nhãn UI tiếng Việt (ví dụ cấm: `Hoạt động (Activities)`, `Hệ thống (System)`, `Danh sách sân đã đặt (Reserved bookings)`).

10. **Chữ viết toàn hệ thống phải sắc nét, độ tương phản cao, cấm dùng text xám nhợt nhạt:**
    - Tuyệt đối cấm sử dụng các màu chữ xám mờ, nhợt nhạt khó đọc như `text-gray-400`, `text-slate-400`, `text-zinc-400`, `text-neutral-400` cho nội dung, mô tả, giờ giấc, địa chỉ, trạng thái, phụ đề.
    - Luôn đảm bảo độ tương phản cao, nét chữ dày dặn, sắc sảo:
      - **Nền sáng:** Chữ chính/tiêu đề dùng `text-slate-900` hoặc `#0f172a`; chữ phụ, mô tả, địa chỉ, giờ giấc dùng `text-slate-700` hoặc `text-slate-600` (kết hợp `font-medium` để chữ sắc nét, đậm vừa phải, không gây mỏi mắt).
      - **Placeholder và icon phụ:** Tối thiểu từ `text-slate-500` trở lên, tuyệt đối không để mờ mịt.
      - **Nền tối:** Dùng `text-white`, `text-slate-100`, `text-slate-200` để đảm bảo độ sáng và tương phản sắc cạnh.
      - Duy trì cấu hình làm nét font chữ (`-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility;`) trên toàn ứng dụng.

11. **Tuyệt đối cấm header khối màu đậm / màu đặc (Solid Color Block Header) cho modal / popup:**
    - Nghiêm cấm bôi một mảng màu tối hoặc màu nền đặc (ví dụ: `bg-[#1b7a42] text-white`, `bg-emerald-700`, `bg-slate-900 text-white`, v.v.) đè lên trên đỉnh của modal, dialog, sheet hay popup làm header.
    - Toàn bộ modal/popup phải có nền sáng đồng nhất, thanh lịch (nền trắng `#ffffff` hoặc phân cách nhẹ bằng `bg-slate-50` kết hợp viền mảnh `border-b border-slate-100`).
    - Tiêu đề modal bắt buộc dùng chữ màu tối tương phản cao (`text-slate-900 font-bold` hoặc `font-black`). Nút đóng (icon X) dùng phong cách tối giản trên nền sáng (`text-slate-400 hover:text-slate-700 hover:bg-slate-100`).
    - Các thông tin bổ trợ như thông báo giữ chỗ, thời gian đếm ngược (countdown) phải trình bày dưới dạng thanh thông báo nhẹ (alert banner thanh lịch như `bg-amber-50 border border-amber-200 text-amber-900`) đặt bên trong nội dung modal, tuyệt đối không được bôi nguyên một khối header màu đặc to đùng che đỉnh modal.
    - **Cấu trúc modal chống tràn màn hình (No Viewport Overflow):** Mọi modal/popup phải có `max-h-[min(90vh,700px)] flex flex-col`. Header và Footer nút hành động phải cố định bằng `shrink-0`, phần thân nội dung nằm giữa phải có `flex-1 overflow-y-auto` để đảm bảo vừa vặn trên mọi độ phân giải màn hình (laptop, tablet, mobile), không bao giờ bị cắt mất đỉnh hay che khuất nút bấm ở chân modal.

12. **Luôn kiểm tra Responsive & Chống xung đột / Tràn màn hình (Responsive & Overflow Safety):**
    - Khi rà soát UI, tạo mới hoặc chỉnh sửa bất kỳ component nào, Agent bắt buộc phải kiểm tra khả năng hiển thị tương thích trên mọi độ phân giải (Mobile 360px-430px, Tablet 768px-1024px, Laptop 1366x768px, Desktop):
      1. **Chống tràn 2 trục (No Overflow X/Y):** Trục ngang không bao giờ xuất hiện thanh cuộn ngang ngoài ý muốn cho toàn trang (`overflow-x-hidden` hoặc kiểm soát width 100%). Trục dọc các modal/popup/drawer phải có `max-h` thông minh kèm cuộn nội bộ (`overflow-y-auto`), không bao giờ bị kéo dài vượt quá khung nhìn viewport làm mất đỉnh hoặc đáy.
      2. **Chống va chạm / đè lấn component (No Clashing Elements):** Các thành phần cố định (`fixed`, `sticky` như Header, BottomNav, Floating Search Bar, AI button) phải có khoảng đệm bảo vệ an toàn (ví dụ: `pb-24` hoặc `pb-28` cho trang chính để BottomNav không che khuất thẻ card cuối cùng). Z-index phải được phân tầng rành mạch (`z-10` nền, `z-20` nội dung nổi, `z-40` navigation, `z-50` modal), tuyệt đối không để component đè che lấp nút bấm hoặc form nhập liệu.
      3. **Tự co giãn & ngắt dòng an toàn (Safe Flex/Grid & Text Truncation):** Mọi văn bản động (tên sân, địa chỉ, người dùng, thời gian) phải sử dụng `truncate` hoặc `line-clamp-*` kết hợp `break-words`. Các nhóm tag, nút bấm, bộ lọc phải có `flex-wrap` hoặc chia cột responsive (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3...`), tuyệt đối không để các khối nội dung xô lệch hoặc đè chen chúc lên nhau trên màn hình hẹp.

13. **Tuyệt đối không dùng nền mờ / pastel nhợt nhạt sau icon (Icon Background Containers):**
    - Cấm tạo các khối nền mờ nhạt, loang lổ dạng pastel (như `bg-amber-50`, `bg-rose-50`, `bg-teal-50`, `bg-emerald-50`, `bg-blue-50/50`, `rounded-lg bg-...-50`) bọc phía sau icon làm giao diện manh mún, sến xẩm hoặc nhợt nhạt.
    - Icon phải hiển thị **trực tiếp, sắc nét, đứng độc lập** trên nền của card/button mà không cần hộp bọc mờ; hoặc nếu thành phần giao diện bắt buộc yêu cầu khối nền riêng cho icon (ví dụ: avatar người dùng/bot, huy hiệu CLB) thì **bắt buộc dùng màu phẳng đặc (Solid Flat Color)** đồng nhất, rõ ràng (ví dụ: `bg-[#1b7a42] text-white`, `bg-slate-700 text-white`, `bg-slate-100 text-slate-700`), tuyệt đối không dùng nền mờ/pastel nhợt nhạt.
    - Khi tạo component mới: Tuyệt đối không thêm hộp nền mờ sau icon.
    - Khi rà soát/check code: Nếu phát hiện component nào đang có khối nền mờ sau icon thì phải chủ động loại bỏ hoặc cải thiện ngay.

14. **Thiết kế UI đơn giản, tường minh, tuyệt đối không chồng lớp phức tạp (No Over-Nested / Layered UI):**
    - **Cấm tạo cấu trúc chồng lớp / lồng hộp nhiều tầng (Matryoshka Boxes):** Tuyệt đối không thiết kế theo kiểu: Nền màu đậm -> Card lơ lửng bán trong suốt (`bg-white/10`, `bg-white/20`) -> Khối lồng bên trong (`rounded-xl bg-white/20`) -> Icon/logo lại nằm trong 1 squircle khác. Tránh việc xếp chồng thẻ bên trong thẻ liên tục, viền trong viền, hoặc các lớp nền màu đậm/nhạt đè lấn lên nhau gây rối mắt, manh mún và nặng nề.
    - **Ưu tiên UI phẳng, tối giản, hiển thị trực diện (Flat & Direct UI):** Mọi thành phần thông tin (avatar, tên người dùng, nhãn trạng thái, thông tin chi tiết) phải được đặt trực diện, rõ ràng trên nền chính phẳng (nền trắng `#ffffff` hoặc nền thẻ phẳng `#f8fafc`). Phân cách bằng khoảng trắng (spacing) hợp lý hoặc viền mảnh phân chia nhẹ nhàng (`border-b border-slate-100`, `border-slate-200/80`), không dùng các khối hộp lồng nhau để phân chia.
    - **Quy tắc thực thi cho Agent:**
      - **Khi tạo component mới:** Bắt buộc thiết kế layout phẳng, tối giản, trực diện, không tạo các lớp lồng ghép phức tạp.
      - **Khi rà soát / check code:** Nếu phát hiện bất kỳ component nào đang có kiểu "chồng lớp" (lồng hộp nhiều tầng, nền mờ đè trên nền màu, card trong card không cần thiết), Agent bắt buộc phải chủ động tái cấu trúc và làm phẳng (flatten) giao diện ngay theo quy tắc.

15. **Cấm UI kiểu "khối/cục bo tròn lơ lửng" (Anti AI-Slop / Seamless Unified Workplace Layout):**
    - **Tuyệt đối cấm bọc tiêu đề trang / section vào trong thẻ card lơ lửng:** Cấm tạo các hộp dạng `bg-white p-4 sm:p-5 rounded-2xl border border-slate-200` hoặc thẻ card con chỉ để chứa duy nhất tiêu đề (`h1`, `h2`) và đoạn mô tả (`p`). Tiêu đề trang và section header bắt buộc phải đặt trực tiếp, tự nhiên trên layout phẳng, phân cách bằng khoảng trắng (spacing) hợp lý hoặc viền mảnh phân chia trang nhã (`border-b border-slate-200 pb-4` hoặc `pb-5`).
    - **Cấm băm nát quy trình làm việc thành hàng loạt khối/cục rời rạc lơ lửng:** Tuyệt đối không thiết kế theo kiểu "AI-slop / Chunk soup" (mỗi dòng một cục bo tròn nổi lềnh bềnh trên nền xám: cục header lơ lửng -> cục dải ngày lơ lửng -> cục ghi chú lơ lửng -> cục bảng lơ lửng).
    - **Bắt buộc gom thành một Workplace Canvas thống nhất (Unified Seamless Workplace):** Với các màn hình thao tác nghiệp vụ (đặt sân trực quan, lịch biểu, trang quản trị, form nhiều bước), toàn bộ thanh tiêu đề (Top Bar), dải chọn thời gian (Date Strip), thanh công cụ/chú thích (Toolbar/Legend) và bảng dữ liệu (Data/Grid) phải là các phân vùng kết nối liền mạch trong **MỘT khung làm việc thống nhất duy nhất**, phân cách bằng các đường viền mảnh (`border-b border-slate-200`) hoặc màu nền tinh tế (`bg-slate-50/70`), mang phong cách hiện đại và chuyên nghiệp (Linear, Airbnb, Stripe).
    - **Quy tắc thực thi cho Agent:**
      - Khi tạo component mới: Luôn thiết kế layout phẳng, trực diện, tuyệt đối không đóng hộp các tiêu đề hoặc chia nhỏ màn hình thành các cục lơ lửng.
      - Khi bảo trì / rà soát code: Nếu phát hiện bất kỳ component nào đang bị băm nhỏ thành các khối hộp con lơ lửng, Agent bắt buộc phải chủ động tái cấu trúc và gộp thành một Unified Workplace Canvas liền mạch.
16. **Nghiêm cấm làm UI kiểu có dấu dot chấm phân cách (Bullet/Dot Separators):**
    - **Cấm sử dụng dấu chấm tròn / bullet dot (`•`, `&bull;`, `<span>•</span>`, v.v.):** Tuyệt đối không dùng dấu dot chấm làm ký tự phân cách (divider/separator) hoặc làm breadcrumb vụn vặt trên thanh tiêu đề (header bar), sub-bar, nhãn thông tin, thẻ card hay tiêu đề trang (ví dụ cấm: `SmashCourt • Tài khoản`, `168 sân • 826 buổi chơi`, `Sân 1 • 20:00 - 22:00`, v.v.).
    - **Điều hướng & breadcrumb chuẩn:** Nếu cần phân cấp điều hướng, bắt buộc sử dụng icon chuẩn `ChevronRight` (kích thước nhỏ, thanh lịch từ `lucide-react`) hoặc dấu gạch chéo `/` thanh mảnh; nếu ngữ cảnh đã rõ từ tiêu đề trang thì lược bỏ hoàn toàn, không tạo các cụm breadcrumb lặt vặt đính kèm dấu chấm.
    - **Phân tách thông tin mạch lạc:** Với các chuỗi thông tin phụ (địa chỉ, số điện thoại, ngày giờ, số lượng), ưu tiên dùng Flexbox với khoảng cách tự nhiên (`gap-2`, `gap-3`), viền đứng thanh mảnh (`border-r border-slate-200 pr-2`) hoặc ký tự gạch nối `-` / gạch đứng `|` / dấu phẩy `, ` tự nhiên, tuyệt đối không chèn ký tự bullet `•` thô sơ làm bẩn và rối mắt giao diện.
17. **Tuyệt đối không dùng hiệu ứng zoom / phóng to khi hover vào ảnh hoặc phần tử (No Hover Zoom / Scale):**
    - **Cấm hiệu ứng phóng to (zoom/scale) khi hover:** Tuyệt đối không sử dụng các class phóng to như `hover:scale-...`, `group-hover:scale-...` (ví dụ: `group-hover:scale-102`, `group-hover:scale-105`, `group-hover:scale-110`, `hover:scale-105`, v.v.) lên hình ảnh (`<img>`), ảnh thẻ sân, avatar, thẻ card hay các nút bấm.
    - **Giữ hình ảnh và thành phần tĩnh, sắc nét:** Toàn bộ hình ảnh và các phần tử UI phải giữ nguyên kích thước cố định, ổn định, không phóng to thu nhỏ làm rung lắc hoặc gây khó chịu cho mắt người dùng khi rê chuột.
    - **Hiệu ứng hover chuẩn:** Khi hover vào thẻ card hoặc nút bấm, chỉ áp dụng đổi màu nền nhẹ nhàng (`hover:bg-...`), thay đổi màu chữ/viền hoặc giữ tĩnh, tuyệt đối không zoom/scale phóng to hình ảnh.

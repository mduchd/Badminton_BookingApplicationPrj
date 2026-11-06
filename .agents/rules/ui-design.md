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

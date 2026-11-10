# KẾ HOẠCH & QUY TRÌNH KIỂM THỬ PHÂN QUYỀN ADMIN ỨNG DỤNG (SYSTEM_ADMIN)
**Dự án:** SmashCourt - Badminton Booking Platform  
**Đối tượng kiểm thử:** Phân hệ Quản trị viên Ứng dụng (`SYSTEM_ADMIN`)  
**Tài liệu nghiệm thu bàn giao:** Dành cho Lead & Đội ngũ Kiểm thử  

---

## 1. MA TRẬN PHÂN QUYỀN HỆ THỐNG (ROLE ACCESS MATRIX)

Hệ thống phân định rành mạch 3 vai trò:
1. **`CUSTOMER` (Khách hàng):** Tìm kiếm sân, giữ chỗ, thanh toán trực tuyến, quản lý lịch đặt của cá nhân.
2. **`COURT_OWNER` (Chủ sân):** Quản lý cơ sở sân của mình, thiết lập bảng giá, khóa khung giờ nội bộ, theo dõi doanh thu cụm sân.
3. **`SYSTEM_ADMIN` (Admin App / Quản trị viên tối cao):** Giám sát toàn hệ thống, phê duyệt / tạm đình chỉ cụm sân, quản lý tài khoản người dùng, đối soát giao dịch tài chính, cấu hình chính sách nền tảng.

| Khu vực / Nghiệp vụ | Khách vãng lai (Guest) | Khách hàng (`CUSTOMER`) | Chủ sân (`COURT_OWNER`) | Admin Ứng dụng (`SYSTEM_ADMIN`) |
| :--- | :---: | :---: | :---: | :---: |
| **Trang chủ & Đặt sân (`/`, `/courts/**`)** | ✅ Xem | ✅ Đặt sân & Thanh toán | ✅ Xem & Đặt sân | ✅ Xem & Đặt sân |
| **Khu vực Chủ sân (`/owner/**`)** | ❌ Chặn | ❌ Chặn (403) | ✅ Toàn quyền sân mình | ❌ Chặn (hoặc xem qua Admin) |
| **Khu vực Quản trị (`/admin`)** | ❌ Chặn (Redirect) | ❌ Chặn (Ẩn menu / 403) | ❌ Chặn (Ẩn menu / 403) | ✅ **Toàn quyền 5 Tabs** |
| **API Backend (`/api/admin/**`)** | ❌ 401 Unauthorized | ❌ 403 Forbidden | ❌ 403 Forbidden | ✅ **200 OK** |
| **Kiểm duyệt & Tạm khóa cụm sân** | ❌ | ❌ | ❌ | ✅ **Phê duyệt / Khóa** |
| **Phân quyền / Khóa tài khoản** | ❌ | ❌ | ❌ | ✅ **Toàn quyền** |
| **Điều chỉnh Phí sàn (% GMV)** | ❌ | ❌ | ❌ | ✅ **Lưu cấu hình DB** |

---

## 2. QUY TRÌNH & KỊCH BẢN KIỂM THỬ CHI TIẾT (18 TEST CASES)

### Nhóm 1: Kiểm thử Phân quyền Điều hướng & Bảo vệ URL (RBAC & Route Guard)

#### TC-01: Khách chưa đăng nhập truy cập trang Admin
- **Mục tiêu:** Kiểm tra cơ chế chặn truy cập trái phép khi chưa có phiên đăng nhập.
- **Các bước:**
  1. Mở cửa sổ trình duyệt ẩn danh (Incognito).
  2. Truy cập trực tiếp URL: `https://smashcourt-booking.vercel.app/admin` (hoặc `http://localhost:5173/admin`).
- **Kết quả mong đợi:** 
  - Không truy cập được vào màn hình Dashboard Admin.
  - Hệ thống tự động chuyển hướng về trang chủ hoặc kích hoạt Modal yêu cầu đăng nhập.

#### TC-02: Khách hàng (CUSTOMER) cố truy cập trang Admin
- **Mục tiêu:** Đảm bảo tài khoản người chơi không thấy và không vào được trang quản trị.
- **Các bước:**
  1. Đăng nhập bằng tài khoản role `CUSTOMER`.
  2. Quan sát thanh Menu và Avatar điều hướng.
  3. Gõ trực tiếp URL `/admin` trên thanh địa chỉ trình duyệt.
- **Kết quả mong đợi:**
  - Trên thanh điều hướng và menu avatar **tuyệt đối không xuất hiện** nút hay liên kết "Quản trị / Admin".
  - Khi gõ trực tiếp `/admin`, hệ thống chặn quyền (báo lỗi không có quyền hoặc điều hướng về `/`).

#### TC-03: Chủ sân (COURT_OWNER) cố truy cập trang Admin
- **Mục tiêu:** Ngăn chặn chủ sân can thiệp vào trang điều hành toàn hệ thống.
- **Các bước:**
  1. Đăng nhập bằng tài khoản role `COURT_OWNER`.
  2. Gõ trực tiếp URL `/admin`.
- **Kết quả mong đợi:**
  - Bị chặn truy cập (HTTP 403 Forbidden hoặc điều hướng).
  - Tài khoản chủ sân chỉ được phép hoạt động trong phạm vi cổng `/owner`.

#### TC-04: Quản trị viên (SYSTEM_ADMIN) truy cập hợp lệ
- **Mục tiêu:** Kiểm tra giao diện điều hành của Admin App.
- **Các bước:**
  1. Đăng nhập bằng tài khoản có vai trò `SYSTEM_ADMIN`.
  2. Chọn mục "Quản trị" trên Menu hoặc truy cập `/admin`.
- **Kết quả mong đợi:**
  - Mở thành công **Bảng điều khiển Quản trị viên Ứng dụng** với đầy đủ 5 phân hệ:
    1. Tổng quan hệ thống
    2. Kiểm duyệt Cụm sân
    3. Quản lý Tài khoản
    4. Giao dịch & Đối soát
    5. Cấu hình Hệ thống

#### TC-05: Bảo vệ API Backend (/api/admin/**)
- **Mục tiêu:** Xác minh tính bảo mật ở tầng API server.
- **Các bước:**
  1. Dùng Postman hoặc DevTools (F12) Network.
  2. Dùng Token của `CUSTOMER` hoặc `COURT_OWNER` gửi GET `/api/admin/dashboard` hoặc `/api/admin/users`.
- **Kết quả mong đợi:**
  - Server phản hồi mã lỗi HTTP `403 Forbidden`.
  - Dữ liệu quản trị được bảo vệ tuyệt đối, không bị rò rỉ.

---

### Nhóm 2: Quản lý & Kiểm duyệt Cụm sân (Facility Moderation)

#### TC-06: Tìm kiếm, lọc và giao diện danh sách cụm sân
- **Mục tiêu:** Kiểm tra bộ lọc và độ hoàn thiện UI (không bị rớt chữ label).
- **Các bước:**
  1. Vào tab **Kiểm duyệt Cụm sân**.
  2. Nhập từ khóa tìm kiếm (theo tên cụm sân, địa chỉ).
  3. Chọn lọc theo Quận/Huyện và trạng thái kiểm duyệt / vận hành.
- **Kết quả mong đợi:**
  - Danh sách trả về đúng điều kiện lọc.
  - Cột "Kiểm duyệt" và cột "Vận hành" hiển thị nhãn trạng thái ("Đã duyệt", "Đang mở", "Đang khóa") **thẳng hàng trên 1 dòng duy nhất**, không bị ngắt chữ "Đang" và "mở" thành 2 hàng.

#### TC-07: Xem chi tiết hồ sơ cụm sân
- **Mục tiêu:** Kiểm tra modal chi tiết cơ sở.
- **Các bước:**
  1. Tại một cụm sân bất kỳ, nhấn nút **"Chi tiết"** (icon con mắt).
- **Kết quả mong đợi:**
  - Modal hồ sơ mở lên mượt mà, chiều cao vừa vặn trong màn hình (không bị tràn viewport mất nút đóng).
  - Hiển thị đầy đủ: Ảnh sân, địa chỉ, hotline, quy mô sân con thực tế, giờ mở cửa, danh sách tiện ích đã đăng ký.

#### TC-08: Phê duyệt cụm sân mới chờ duyệt
- **Mục tiêu:** Phê duyệt cụm sân mới đăng ký lên sàn.
- **Các bước:**
  1. Chọn cụm sân đang có trạng thái "Chờ kiểm duyệt".
  2. Nhấn nút **"Duyệt cơ sở"**.
- **Kết quả mong đợi:**
  - Trạng thái kiểm duyệt đổi sang **"Đã duyệt"** (màu xanh).
  - Cụm sân lập tức xuất hiện công khai trên trang Khám phá cho khách hàng tìm kiếm và đặt sân.

#### TC-09: Từ chối cụm sân kèm lý do
- **Mục tiêu:** Từ chối cụm sân chưa đạt chuẩn và lưu lý do.
- **Các bước:**
  1. Chọn cụm sân chờ duyệt -> Nhấn **"Từ chối"**.
  2. Nhập lý do từ chối (VD: *"Ảnh sân mờ, thiếu giấy phép đăng ký kinh doanh"*).
  3. Bấm xác nhận từ chối.
- **Kết quả mong đợi:**
  - Trạng thái đổi sang **"Bị từ chối"**.
  - Lý do từ chối được lưu trữ vào database và hiển thị rõ ràng khi xem lại chi tiết cơ sở.

#### TC-10: Tạm khóa cụm sân & Chặn đặt chỗ (Test nghiệp vụ quan trọng)
- **Mục tiêu:** Xác minh khi Admin tạm khóa cụm sân thì khách hàng không thể đặt bất kỳ sân con nào của cụm đó.
- **Các bước:**
  1. Tại một cụm sân đang "Đang mở", Admin nhấn nút **"Tạm khóa"**.
  2. Trạng thái vận hành chuyển sang **"Đang khóa"** (màu đỏ).
  3. Mở tab trình duyệt khác với tài khoản Khách hàng:
     - Vào cụm sân này xem lịch và tiến hành chọn khung giờ đặt sân.
- **Kết quả mong đợi:**
  - Luồng tạo đơn đặt chỗ bị **chặn đứng cả ở Frontend và Backend**.
  - Backend phản hồi lỗi nghiệp vụ: *"Cụm sân này hiện đang tạm ngừng hoạt động hoặc bị khóa bởi quản trị viên."*
  - Khách hàng không thể tạo đơn hay thanh toán dù biết ID của sân con.

#### TC-11: Mở lại hoạt động cho cụm sân đã tạm khóa
- **Mục tiêu:** Kích hoạt lại cụm sân sau khi giải quyết vi phạm.
- **Các bước:**
  1. Tại cụm sân đang bị khóa, Admin nhấn **"Mở lại"**.
- **Kết quả mong đợi:**
  - Trạng thái vận hành chuyển về **"Đang mở"** (màu xanh).
  - Khách hàng có thể truy cập, xem lịch trống và đặt sân bình thường trở lại.

---

### Nhóm 3: Quản lý Người dùng & An toàn Thao tác (User Management & Protection)

#### TC-12: Thay đổi vai trò người dùng (Change Role)
- **Mục tiêu:** Phân quyền người dùng linh hoạt.
- **Các bước:**
  1. Vào tab **Quản lý Tài khoản**.
  2. Tìm kiếm một người dùng có vai trò `CUSTOMER`.
  3. Tại cột "Phân vai trò", bấm chọn đổi sang `COURT_OWNER`.
- **Kết quả mong đợi:**
  - Hệ thống cập nhật thành công và hiển thị thông báo toast.
  - Người dùng này khi đăng nhập lại sẽ truy cập được phân hệ quản lý sân `/owner`.

#### TC-13: Khóa tài khoản vi phạm & Chặn đăng nhập / thao tác
- **Mục tiêu:** Vô hiệu hóa tài khoản vi phạm chính sách.
- **Các bước:**
  1. Tại một tài khoản khách hàng, nhấn nút **"Khóa"**.
  2. Trạng thái chuyển sang **"Bị khóa"** (màu đỏ).
  3. Dùng tài khoản vừa bị khóa thực hiện đăng nhập hoặc gọi API đặt sân.
- **Kết quả mong đợi:**
  - Không thể đăng nhập hoặc bị từ chối thao tác với thông báo: *"Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ quản trị viên."*

#### TC-14: Bảo vệ: Admin không thể tự khóa chính mình
- **Mục tiêu:** Ngăn chặn sơ suất tự hủy quyền của tài khoản Admin đang thao tác.
- **Các bước:**
  1. Tìm dòng tài khoản của chính Admin đang đăng nhập.
  2. Nhấn nút "Khóa".
- **Kết quả mong đợi:**
  - Hệ thống chặn thao tác và cảnh báo: *"Không thể tự khóa tài khoản quản trị viên đang đăng nhập."*

#### TC-15: Bảo vệ: Không thể hạ quyền Admin cuối cùng
- **Mục tiêu:** Chống nguy cơ hệ thống bị mất tài khoản quản trị tối cao.
- **Các bước:**
  1. Thử đổi vai trò của tài khoản `SYSTEM_ADMIN` duy nhất còn lại sang `CUSTOMER`.
- **Kết quả mong đợi:**
  - Hệ thống từ chối cập nhật và giữ nguyên quyền Admin tối thiểu.

---

### Nhóm 4: Đối soát Tài chính & Cấu hình Hệ thống (Finance & System Settings)

#### TC-16: Đối soát giao dịch tài chính & Phí sàn
- **Mục tiêu:** Kiểm tra bảng thống kê giao dịch.
- **Các bước:**
  1. Vào tab **Giao dịch & Đối soát**.
  2. Kiểm tra các trường: Mã đơn (payOS / orderCode), Khách hàng, Cụm sân thụ hưởng, Phương thức, Tổng tiền, Phí sàn, Trạng thái.
  3. Lọc theo phương thức (PAYOS, MOCK) và trạng thái (Thành công, Đang chờ, Thất bại).
- **Kết quả mong đợi:**
  - Danh sách hiển thị chính xác từng khoản thu chi và số tiền phí sàn tương ứng.
  - Các nhãn trạng thái hiển thị chuẩn, không bị vỡ bố cục.

#### TC-17: Tính toàn vẹn số liệu tài chính (Snapshot Tỷ lệ Hoa hồng)
- **Mục tiêu:** Đảm bảo khi đổi tỷ lệ hoa hồng mới không làm sai lệch số liệu lịch sử quá khứ.
- **Các bước:**
  1. Vào tab **Cấu hình Hệ thống**.
  2. Đổi Tỷ lệ hoa hồng từ `5.0%` lên `7.5%` -> Nhấn **"Lưu cấu hình"**.
  3. Quay lại tab Giao dịch và Dashboard Tổng quan.
- **Kết quả mong đợi:**
  - Toàn bộ các giao dịch đã hoàn tất trước đó **vẫn giữ nguyên số tiền phí sàn theo tỷ lệ 5.0% ban đầu** (do đã được lưu snapshot tại thời điểm thanh toán).
  - Chỉ các giao dịch mới phát sinh sau thời điểm đổi cấu hình mới áp dụng tỷ lệ 7.5%.

#### TC-18: Lưu cấu hình bền vững vào Database (Persistence)
- **Mục tiêu:** Cấu hình hệ thống không bị mất khi khởi động lại backend.
- **Các bước:**
  1. Đổi Thời gian giữ chỗ thành `15` phút và Phí hoa hồng `6.0%`.
  2. Bấm "Lưu cấu hình".
  3. Tải lại trang (F5) hoặc restart backend service.
- **Kết quả mong đợi:**
  - Các giá trị cấu hình vẫn được giữ nguyên vẹn từ Database, không bị reset về giá trị mặc định trong code.

---

## 3. TIÊU CHÍ ĐÁNH GIÁ NGHIỆM THU (ACCEPTANCE CHECKLIST)

- [ ] **Giao diện (UI):** Thiết kế phẳng hoàn toàn, nút bấm có con trỏ bàn tay `cursor-pointer`, badge trạng thái không bị rớt dòng.
- [ ] **Bảo mật (RBAC):** Mọi API `/api/admin/**` đều chặn 403 nếu không phải `SYSTEM_ADMIN`.
- [ ] **Tính năng Tạm khóa sân:** Khi Admin khóa cơ sở, khách hàng bị chặn đặt sân tức thì cả ở Frontend và Backend.
- [ ] **Toàn vẹn Tài chính:** Hoa hồng được lưu snapshot từng giao dịch, không làm thay đổi lịch sử đối soát khi cập nhật cấu hình.

# Cấu hình hồ sơ, email, Push và Google Calendar

Cập nhật 10/11/2026. Code chạy khi chưa cấu hình dịch vụ: hồ sơ vẫn lưu bình thường; Push và Calendar không thể bật; yêu cầu email trả thông báo chưa khả dụng. Không có thành công giả.

## Chuẩn bị backend

Flyway áp dụng `V17__account_recovery.sql` và `V18__account_integrations.sql` trên PostgreSQL. Profile `h2` dùng Hibernate tạo schema để kiểm thử local. Migration đã được kiểm chứng riêng trên PostgreSQL 17 trong container tách biệt: đủ 18 migration từ schema trống và Hibernate validate đạt.

Tham khảo `backend/account-integrations.env.example` và đặt biến cho tiến trình backend hoặc dashboard hosting. Spring Boot **không tự đọc** file mẫu này. Không commit giá trị bí mật. `FRONTEND_URL` phải đúng origin frontend đang dùng, ví dụ `http://127.0.0.1:5173`; `localhost` và `127.0.0.1` là hai origin khác nhau. Production dùng HTTPS và cấu hình `APP_CORS_ALLOWED_ORIGINS` cho frontend.

## Email đặt lại mật khẩu

1. Tạo thông tin SMTP từ nhà cung cấp email; xác thực địa chỉ gửi và domain theo yêu cầu nhà cung cấp.
2. Đặt `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, `MAIL_FROM`. Mẫu dùng cổng 587, SMTP AUTH và STARTTLS; điều chỉnh theo nhà cung cấp.
3. Đặt `PASSWORD_RESET_ENABLED=true`, khởi động lại backend. `GET /api/v1/auth/capabilities` phải trả `passwordReset: true`.
4. Dùng tài khoản kiểm thử có email bạn kiểm soát: Đăng nhập → Quên mật khẩu → nhận email → mở link → lưu mật khẩu mới → đăng nhập lại. Kiểm tra link không dùng lại được và phiên đăng nhập cũ bị từ chối.

Token ngẫu nhiên 256 bit, DB chỉ lưu SHA-256, hết hạn sau 20 phút. Mỗi tài khoản chỉ gửi tối đa một yêu cầu/phút; mỗi IP tối đa 8 yêu cầu trong 15 phút. Giới hạn IP nằm trong từng instance; triển khai nhiều instance cần thêm giới hạn tại gateway. Email được gửi bất đồng bộ sau commit. Lỗi SMTP được ghi log tổng quát; người dùng vẫn nhận phản hồi giống email không tồn tại. Chưa có hàng đợi gửi lại email bền vững; có thể yêu cầu liên kết mới sau một phút.

Thời gian kết nối/gửi SMTP có timeout. Tránh log query string chứa `reset_token` tại proxy hoặc công cụ phân tích. Không gửi token vào log/chat.

## Google Calendar

1. Bật Google Calendar API cho Google Cloud project. Cấu hình OAuth consent screen, thêm tài khoản kiểm thử nếu ứng dụng còn ở trạng thái Testing.
2. Tạo OAuth client kiểu Web application. Dùng cùng `GOOGLE_CLIENT_ID` với đăng nhập Google nếu cùng project; giữ cấu hình Google Sign-In frontend tương ứng.
3. Đăng ký redirect URI **khớp tuyệt đối**, ví dụ `https://api.example.com/api/v1/auth/calendar/callback`. Đặt `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI` ở backend.
4. Tạo khóa mã hóa 32 byte ngẫu nhiên, mã hóa Base64 rồi đặt `INTEGRATIONS_ENCRYPTION_KEY`. Có thể dùng PowerShell dưới đây trên máy an toàn; lưu kết quả vào secret manager, không đưa vào chat:

   ```powershell
   $calendarKey = [byte[]]::new(32)
   [System.Security.Cryptography.RandomNumberGenerator]::Fill($calendarKey)
   [Convert]::ToBase64String($calendarKey)
   ```

5. Tài khoản → Cài đặt → Kết nối lịch → chọn tài khoản Google → cấp quyền. Chỉ hiển thị kết nối sau khi backend xác minh consent và lưu refresh token mã hóa AES-GCM. State dùng một lần, hết hạn sau 10 phút, gắn với người dùng đang đăng nhập.
6. Xác nhận một đơn sắp tới, chờ khoảng một phút: sự kiện phải xuất hiện đúng giờ Việt Nam. Hủy đơn: sự kiện phải được xóa. Chạy lại worker không được tạo thêm bản sao. Ngắt kết nối: bỏ refresh token lưu tại hệ thống, gửi yêu cầu thu hồi tới Google; các sự kiện đã thêm được giữ lại.

Worker xét đơn từ hôm nay trở đi với trạng thái CONFIRMED, COMPLETED hoặc CANCELLED. Có lease DB, retry khi lỗi và ID sự kiện ổn định theo tài khoản Google/đơn. Thông báo có thể được gửi lại nếu tiến trình chết sau khi nhà cung cấp nhận nhưng trước khi DB ghi nhận; Calendar dùng ID ổn định để tránh sự kiện trùng. Nếu người dùng thu hồi quyền bên Google, cần ngắt/kết nối lại trong SmashCourt. Không đổi khóa mã hóa tùy tiện: refresh token cũ cần khóa cũ để giải mã. Sao lưu DB và khóa cùng chính sách bảo mật.

Phạm vi xin quyền là `openid email` và `calendar.events`. Ứng dụng công khai có thể cần quy trình xác minh OAuth của Google; refresh token trong chế độ Testing có giới hạn theo chính sách Google. Xem [OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server).

## Firebase Web Push

1. Tạo Firebase project và Web app; bật Firebase Cloud Messaging API v1. Tạo Web Push certificate/VAPID public key trong Cloud Messaging.
2. Điền các giá trị **công khai** vào `frontend/.env.local` theo `frontend/.env.integrations.example`; build lại frontend. Chỉ cài module Firebase App và Messaging; không kéo Firestore vào dự án.
3. Tạo service account đúng project có quyền gửi Cloud Messaging. Mount JSON dưới dạng secret file ngoài repository. Đặt đường dẫn tuyệt đối vào `FIREBASE_CREDENTIALS_FILE`, đặt `PUSH_ENABLED=true`, khởi động lại backend. Không đặt JSON/service-account key vào biến `VITE_*`.
4. Frontend phải được phục vụ qua HTTPS (localhost được hỗ trợ khi phát triển). Đảm bảo `/firebase-messaging-sw.js` trả JavaScript cùng origin, không redirect sang trang đăng nhập hoặc SPA HTML. Nếu có CSP, cho phép các endpoint Firebase cần thiết theo hướng dẫn nhà cung cấp.
5. Tài khoản → Cài đặt → Bật thông báo → cấp quyền trình duyệt. Xác nhận/hủy/hoàn thành đơn kiểm thử; kiểm tra tab đang mở và khi tab ở nền. Payload chỉ chứa thông báo chung, không gửi thông tin cá nhân hoặc chi tiết lịch lên thông báo màn hình khóa.

Token được đăng ký theo tài khoản hiện tại. Tắt thông báo xóa đăng ký của mọi thiết bị cho tài khoản; đăng xuất gỡ token của trình duyệt hiện tại. Token không còn hợp lệ được worker xóa. Nếu quyền trình duyệt bị thu hồi hoặc token thay đổi, tắt/bật lại để đăng ký. Chỉ gửi cập nhật trạng thái đơn; chưa có nhắc trước giờ chơi.

Tham khảo [Firebase Web Push](https://firebase.google.com/docs/cloud-messaging/web/get-started) và [Firebase Admin gửi tin](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk).

## Chạy kiểm chứng local

```powershell
# Trong backend
.\mvnw.cmd test '-Dspring.profiles.active=h2'
# Trong frontend
npm run lint
npm run build
node --test scripts/check-ui-rules.test.mjs scripts/calendar-export.test.mjs
```

Các test tích hợp dùng H2 và mock nhà cung cấp: kiểm tra quyền truy cập, lưu hồ sơ, token reset hết hạn/dùng lại, thu hồi phiên cũ, state OAuth, mã hóa token, retry, đồng bộ hủy đơn, loại token Push hết hạn và CRUD chủ sân. Test HTTP Calendar kiểm tra request/response thực của adapter bằng server giả. Chưa xác nhận gửi/nhận với SMTP, Firebase hay tài khoản Google thật khi chưa có cấu hình.

Đã chạy bổ sung `PostgresConcurrencyIntegrationTest` (3 ca) và `AccountPostgresFlowsIntegrationTest` (10 ca) trên PostgreSQL 17 riêng: tất cả đạt. Để lặp lại, đặt `RUN_POSTGRES_TESTS=true`, cấu hình `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` tới database kiểm thử riêng, rồi chạy:

```powershell
.\mvnw.cmd test '-Dtest=PostgresConcurrencyIntegrationTest,AccountPostgresFlowsIntegrationTest' '-Duser.timezone=Asia/Ho_Chi_Minh'
```

Các test này tạo/sửa/xóa fixture và chạy migration; chỉ trỏ vào database kiểm thử. `user.timezone` dùng tên múi giờ chuẩn để tránh lỗi handshake của JDBC với alias Asia/Saigon trên một số PostgreSQL image.

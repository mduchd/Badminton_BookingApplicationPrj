# Vận hành AI và booking

Tài liệu phản ánh mã nguồn ngày 09/11/2026. Những mục cần xác minh thực tế không được xem là đã nghiệm thu.

## Cấu hình

- Production dùng PostgreSQL và Flyway; triển khai migration V15 (idempotency booking) và V16 (quota AI) trước khi nhận traffic phiên bản mới.
- `AI_ENABLED=false` tắt gọi AI; tìm bằng bộ lọc và booking hoạt động độc lập. Cần khởi động lại backend khi đổi biến môi trường.
- `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`, `DEEPSEEK_TIMEOUT_SECONDS` cấu hình provider. Không đưa khóa vào frontend hoặc log.
- `AI_DISTRIBUTED_RATE_LIMIT=true` mặc định ở profile prod: quota 15 request/phút theo phút lịch của DB, dùng chung giữa instance. Client được hash SHA-256 trước khi lưu; bucket cũ được dọn mỗi phút. Profile local dùng cửa sổ trượt trong RAM.
- Giới hạn đồng thời gọi DeepSeek hiện là 4 trên mỗi instance; output tối đa 800 token. Đây chưa phải ngân sách tổng theo ngày/tháng.
- Sau ba lỗi liên tiếp, circuit breaker tạm ngừng gọi provider trong 30 giây trên instance đó. Có test HTTP local cho tình huống này; chưa có diễn tập provider production.
- Với reverse proxy, cấu hình trusted forwarding ở hạ tầng trước khi chuyển remote address thành IP client. Nếu không cấu hình, guest dùng chung quota của IP proxy; không đọc tùy ý X-Forwarded-For do client gửi.
- Không bật distributed rate limit trong H2. SQL atomic upsert của quota dành cho PostgreSQL.

## Kiểm tra trước phát hành

1. Backup DB và chạy restore trên môi trường riêng. Kiểm tra `flyway_schema_history` không có migration thất bại.
2. Chạy toàn bộ backend test trên PostgreSQL staging. CI đã có job PostgreSQL 17; workflow chưa được thực thi trên GitHub trong phiên làm việc này.
3. Trên local có thể chạy `backend/mvnw.cmd -Dspring.profiles.active=h2 test`; đây là kiểm tra hồi quy, không xác nhận exclusion constraint hoặc concurrency PostgreSQL.
4. Chạy `npm ci` và `npm run build` trong frontend.
5. Chuẩn bị hai tài khoản thử, một sân con và giá có ranh giới không trùng 30 phút. Không dùng lịch/đơn khách thật cho kiểm thử ghi.
6. Hỏi ngày và giờ cụ thể: xác nhận đúng ngày Việt Nam, sân con, tổng tiền; chọn card phải mở đúng interval và kiểm tra lại giá trước khi xác nhận.
7. Gửi lại POST `/api/bookings` với cùng `Idempotency-Key` và payload: chỉ một booking. Dùng lại key với payload khác phải nhận 409. Kiểm tra hai request đồng thời cùng slot khác khách chỉ có một HOLD thành công.
8. Gửi request AI trên hai instance: tổng quota theo client không vượt 15/phút. Xác nhận migration V16 và profile prod đang dùng.
9. Thử provider timeout/JSON lỗi: 503 hoặc thông báo fallback, không tạo booking. Quota: 429. Lỗi không trả stacktrace/secret.
10. Kiểm tra mobile, tablet và desktop. Bốn ca E2E local đã đạt tại 360/768/1366/1920 px; xem docs/basic-ai-verification.md.

## Theo dõi và sự cố

- API AI trả `X-Request-ID`. Log hoàn tất chứa request ID, HTTP status và elapsedMs; không log raw chat.
- Meter `ai.http.duration` ghi thời gian request và status. Cần cấu hình backend thu thập metric, dashboard và cảnh báo ở môi trường chạy; chưa có dashboard hay cảnh báo đã kích hoạt.
- Provider lỗi hoặc chi phí bất thường: đặt `AI_ENABLED=false`, restart/rollout backend, kiểm tra tìm thủ công và booking. Hạn mức AI theo ngày/tháng, token usage và cảnh báo ngân sách còn phải làm.
- Migration lỗi: dừng rollout, xem lỗi trên staging; không sửa checksum hoặc xóa lịch sử Flyway để bỏ qua lỗi.
- Sự kiện WebSocket chỉ phát sau commit. Mất kết nối vẫn cần refetch lịch, không xem sự kiện là nguồn quyết định giữ chỗ.
- Booking retry khóa theo tài khoản bằng row lock; key unique theo customer. Transaction tạo booking và ghi key cùng commit. Đã kiểm thử tám retry cùng key và hai khách tranh slot trên PostgreSQL thực tế.
- Rollback app cần phiên bản tương thích cột bổ sung; không xóa cột/key hoặc hủy đơn người dùng để quay code.

## Những phần chưa được coi là hoàn tất

Chưa triển khai: lưu hội thoại phía server với TTL; ngân sách theo đầu người; slot/giờ qua đêm; xếp hạng đa tiêu chí; giải phóng HOLD nhiều instance; cảnh báo/backup vận hành thật; bộ đánh giá 150–300 câu; load test; cá nhân hóa; RAG có nguồn; tìm kiếm ngữ nghĩa; notification theo slot; đặt lặp/nhiều sân; tích hợp nguồn ngoài; multi-provider; sửa/hủy trong chat. Ngân sách cả buổi, batch availability và gợi ý giờ gần nhất đã có mã và test; chưa nghiệm thu trên PostgreSQL thực tế.

Lịch ngoài không được suy ra trống từ bản ghi thiếu hoặc lịch cũ. Mọi thông tin lịch AI hiện được lấy từ dữ liệu nội bộ, chưa có ingest lịch ngoài.

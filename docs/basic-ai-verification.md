# Nghiệm thu phần cơ bản AI tìm và đặt sân

Ngày kiểm tra: 09/11/2026. Môi trường: DB riêng `badminton_ai_test`, PostgreSQL 17.11 trong Docker, backend thật và Microsoft Edge qua Playwright.

## Kết quả đã xác minh

- Toàn bộ backend suite chạy với PostgreSQL: **75 test đạt, không lỗi, không bỏ qua**. Một ca phân trang có cấu hình H2 riêng; các test migration/booking cạnh tranh chạy PostgreSQL thực tế.
- Frontend build thành công sau các chỉnh sửa giao diện.

- Flyway chạy đủ 16 migration trên DB mới, bao gồm V15 và V16.
- Ba test PostgreSQL đạt, không bỏ qua:
  - Hạn mức 15 request/phút dùng chung giữa hai instance service.
  - PostgreSQL từ chối occupancy chồng lấn và cho phép hai khoảng liền kề.
  - Tám yêu cầu booking cùng key trả cùng một ID; một khách khác không đặt được khoảng đã giữ; hai khách gửi đồng thời cho khoảng mới chỉ có một người thành công.
- Bốn test trình duyệt đạt ở độ rộng 360/768/1366/1920 px:
  - Đăng ký tài khoản thử qua API thật, mở chat và gửi yêu cầu.
  - Backend đọc fixture từ PostgreSQL, trả đúng sân con và giá 240.000đ cho 19:00–21:00.
  - Chọn kết quả mở đúng sân, ngày và khoảng giờ; hộp đặt sân gọi kiểm tra lại khoảng giờ thực tế.
  - Xác nhận tạo HOLD thật; kiểm tra ID sân, tổng tiền và trạng thái.
  - Gửi lại cùng payload/key trả cùng mã đơn; hủy đơn fixture khi hoàn thành test.
  - Trang không tràn ngang; đã xem ảnh kiểm tra trên màn hình nhỏ.

Provider trong các ca E2E là HTTP fixture có chủ đích (`frontend/e2e/provider-fixture.mjs`). Tìm lịch, tính tiền, đăng ký, xác thực và booking dùng dịch vụ thật. Những ca này **không xác nhận khả năng hiểu tiếng Việt hoặc độ ổn định của DeepSeek thật**.

## Kiểm tra host và DeepSeek thật

Sau khi người dùng xác nhận khóa đã được cấu hình trên host, đã gọi endpoint triển khai `https://badminton-booking-api-pjtn.onrender.com`:

- `/actuator/health` trả 200, trạng thái UP.
- POST `/api/v1/ai/search` với yêu cầu tiếng Việt về Cầu Giấy, ngày mai 19–21h, tối đa 150.000đ/giờ trả HTTP 200 sau khoảng 3,2 giây, success=true và trích xuất đúng quận, giờ, ngân sách.
- Phản hồi vẫn có cấu trúc API cũ: chưa có date, status và alternatives. Do đó kiểm tra này xác nhận AI thật trên bản đang triển khai hoạt động, chưa nghiệm thu các thay đổi mới trong workspace với provider thật.
- Không truy xuất hoặc sao chép giá trị khóa. Local chưa có khóa không đồng nghĩa host chưa cấu hình.

Bước còn lại để nghiệm thu bản mới: triển khai phiên bản mới theo quy trình phát hành rồi kiểm tra lại bộ câu tiếng Việt trên sân thử.

Chưa phát hành production và chưa sửa DB đang phục vụ người dùng. Toàn bộ dữ liệu ghi trong đợt kiểm tra nằm trong DB riêng.

## Chạy lại

1. Chuẩn bị PostgreSQL riêng, trỏ `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` vào DB đó.
2. Chạy backend test với `RUN_POSTGRES_TESTS=true`. Test đọc cấu hình local và thực hiện Flyway. Không dùng DB production.
3. Chạy `node e2e/provider-fixture.mjs` trong frontend, lắng nghe cổng 19191.
4. Chạy backend trên cổng 18080 với `DEEPSEEK_API_KEY=test-placeholder`, `DEEPSEEK_BASE_URL=http://127.0.0.1:19191`. Nếu backend chạy trong Docker, dùng `http://host.docker.internal:19191`.
5. Nhập `backend/src/test/resources/sql/basic-ai-fixture.sql` vào DB thử. File có ID cố định dành riêng cho fixture.
6. Trong frontend, chạy `npm ci`, rồi `npm run test:e2e`. Windows dùng Edge sẵn có. Linux cần `npx playwright install --with-deps chromium` và `PLAYWRIGHT_CHANNEL=chromium`.
7. Ảnh và trace nằm trong `frontend/test-results/` (đã bỏ khỏi Git). CI có bước dựng fixture, chạy backend và thực hiện test này tự động; workflow từ xa chưa được chạy trong phiên local.

Toàn bộ P1/P2 trong roadmap vẫn có các phần riêng chưa hoàn thành; kết quả này chỉ nghiệm thu luồng cơ bản theo phạm vi và giới hạn nêu trên.

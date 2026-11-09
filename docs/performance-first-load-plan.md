# Kế hoạch tối ưu tải trang lần đầu — 09/11/2026

## Trạng thái thực hiện

- Đã tách 22 màn/modal thành dynamic imports; chỉ mount modal khi mở. Chat AI và sidebar giữ state sau lần mở đầu tiên.
- Bootstrap bắt đầu tải danh sách công khai song song với React; dùng chung request để không tải trùng. GET công khai không gửi token hay Content-Type gây preflight.
- Tổng JavaScript bắt buộc cho trang chủ trong smoke test: 127.530 byte gzip (~125 KiB), so với bundle production cũ khoảng 254 KiB trong Lighthouse. Đây là so sánh dung lượng, chưa phải kết quả LCP production sau triển khai.
- 16 logo PNG: 1.596.031 byte → 69.300 byte WebP; tên file có hash. Font chỉ còn hai subset WOFF2 Latin/Vietnamese, tổng khoảng 58,5 KB, tự phục vụ cùng website.
- Cache immutable cho JS/CSS/font có hash và logo có hash; thumbnail tên cố định revalidate sau 1 giờ. Không cache API đặt sân hoặc thanh toán.
- API phân trang trả DTO thẻ sân gọn; không truy vấn sân con và toàn bộ gallery cho danh sách. API chi tiết và API legacy vẫn giữ dữ liệu đầy đủ.
- Frontend production build đạt. 57 backend test đạt trước lần bổ sung assertion response gọn; integration test được chạy lại và đạt sau bổ sung đó.
- Smoke test Chrome dùng artifact build local được phục vụ qua interception tại origin production, API công khai production: một request catalog ban đầu; không tải hidden feature chunks, không tải Google Fonts hoặc logo PNG gốc ở trang chủ; cache vẫn hiển thị thẻ khi API bị trì hoãn 2 giây; filter/map/explore/sidebar không có page errors.
- Netlify deployment `6af0bbd08ede2157588e47a3` bị bỏ qua vì `Skipped due to account credit usage exceeded`. Đây là nguyên nhân production còn ở commit cũ. Không thay đổi gói hay billing. Sau khi khôi phục hạn mức, cần deploy commit mới và đo Lighthouse production lại.

## Phạm vi và phương pháp

- Production: https://smashcourt-booking.netlify.app/
- API: https://badminton-booking-api-pjtn.onrender.com/api/facilities/page?page=0&size=24
- Đo HTTP từ máy thực thi và một lượt Lighthouse mobile mô phỏng, với browser profile mới, chưa đăng nhập. Đây là số đo phòng thử nghiệm, chưa phải thống kê người dùng thực hay p75.
- Lượt này khảo sát và lập kế hoạch; chưa sửa code ứng dụng, cấu hình hosting hay triển khai.

## Kết quả đã xác nhận

| Hạng mục | Kết quả |
|---|---|
| Production commit | Netlify hiện phục vụ `70ecd99`, chưa có bản sửa tải đầu trang `a4e7066` đã push |
| Kiểm tra bundle production | Có màn hình tải cũ; chưa có key cache `smashcourt.home.facilities.v1` |
| Lighthouse performance | 75/100 |
| FCP / LCP | 2,0 giây / 4,5 giây |
| Speed Index / TBT / CLS | 5,2 giây / 210 ms / 0 |
| Tải trang lần đầu trong Lighthouse | 30 request, khoảng 1.375 KiB |
| JavaScript chính | 1.003.795 byte chưa nén; khoảng 254 KiB tải trong Lighthouse |
| JavaScript chưa dùng trong lượt đo | Khoảng 167 KiB nén, 67% bundle theo Lighthouse; đây là ước lượng, không phải toàn bộ đều có thể xóa |
| LCP element | Ảnh thumbnail sân BMC Nguyễn Xiển |
| Trace LCP | Ảnh bắt đầu được phát hiện muộn khoảng 2,08 giây sau TTFB; thời gian tải ảnh khoảng 0,16 giây. Các giá trị trace không cộng trực tiếp với LCP mô phỏng |
| API đang hoạt động, 3 lượt HTTP | TTFB 0,486 / 0,575 / 0,374 giây; khoảng 5 KB gzip, 36,6 KB chưa nén ở lượt kiểm tra khác |
| HTML, 3 lượt HTTP | TTFB 1,419 / 1,518 / 0,526 giây; không đủ để kết luận nguyên nhân biến động |
| Cache-Control tài nguyên đã kiểm tra | `public,max-age=0,must-revalidate` cho JS/CSS và ảnh Netlify |

Các file ảnh bìa đã có WebP thumbnail. Tuy nhiên logo vẫn là PNG gốc, ví dụ Phúc Long khoảng 121 KB, Cảnh Hồ khoảng 103 KB, Station khoảng 91 KB. Lighthouse ước lượng còn tiết kiệm được khoảng 456 KiB ảnh trong lượt tải này. Lazy loading vẫn cho phép trình duyệt tải ảnh ở gần vùng xem, nên không thay thế việc giảm dung lượng logo.

## Thứ tự thực hiện

### P0 — Đưa đúng phiên bản lên production và đo lại

1. Kiểm tra vì sao production đang dừng ở `70ecd99`; triển khai đúng commit đã kiểm thử, tối thiểu bao gồm `a4e7066`.
2. Xác nhận trực tiếp file JS mới: có skeleton, cache trang đầu và ưu tiên ảnh đầu; không còn component màn hình tải có thời gian giữ cố định. HTML vẫn có loader bootstrap trước khi React mount; phải đánh giá riêng thời gian JS khởi động.
3. Lặp Lighthouse ít nhất 3 lần trên cùng cấu hình; ghi median, tốc độ API và tài nguyên production đang dùng.

Kết quả cần đạt: người dùng nhận đúng bản sửa đã push, không nhầm cải thiện trong code với cải thiện đã triển khai.

### P1 — Giảm phần tải bắt buộc của trang chủ

1. Dùng dynamic import/React.lazy và Suspense cho bản đồ, admin, owner, checkout, chi tiết sân và các modal chỉ dùng khi mở. Không tải Leaflet/luồng quản trị chỉ để hiển thị danh sách sân.
2. Tạo thumbnail WebP cho logo theo kích thước hiển thị, có biến thể khoảng 96–128 px phục vụ màn hình mật độ cao. Giữ alpha và fallback phù hợp; bổ sung srcset/sizes cho ảnh bìa khi cần.
3. Thu gọn font: xác minh family/weight đang dùng, ưu tiên một family và WOFF2 hỗ trợ tiếng Việt; chỉ preload font thực sự cần ở đầu trang.
4. Chỉ khởi động request phụ khi cần: lịch đặt của người dùng ở tab đặt sân, dữ liệu modal khi modal mở; giữ auth cần thiết và request danh sách trang đầu chạy song song.

Ngân sách đề xuất: JS bắt buộc trang chủ dưới 150 KiB nén; logo thẻ sân dưới 10 KiB/file khi chất lượng cho phép. Đo thực tế trước khi chốt ngân sách ảnh.

### P2 — Cho trình duyệt phát hiện nội dung đầu trang sớm hơn

1. Cắt chuỗi HTML → toàn bộ JS → mount React → API → tạo thẻ ảnh. Sau khi tách bundle, đo phần chờ còn lại; nếu đáng kể, cho request danh sách trang đầu khởi động sớm và dùng chung promise/cache với React Query để tránh request trùng.
2. Nếu cần cải thiện thêm lần mở hoàn toàn mới, cân nhắc snapshot danh mục công khai hoặc prerender/SSR trang đầu. Không preload cứng ảnh của một sân nếu thứ tự dữ liệu thực tế có thể thay đổi.
3. Dùng DTO gọn cho thẻ danh sách. Hiện API trang vẫn gọi `toFacilitySummaries`, tải cả courts và gallery, tạo URL bản đồ, trả description và các trường chi tiết. Chuyển các trường này sang API chi tiết; đo query count và thời gian database trước/sau. Kiểm tra collection amenities EAGER có phát sinh truy vấn phụ không.
4. Giữ sắp xếp ổn định khi chia trang, tổng số và tìm kiếm/bộ lọc đúng trên toàn bộ tập dữ liệu; giữ endpoint tương thích cho bản đồ và các consumer cũ.

### P3 — Cache an toàn và kiểm tra cold start

1. JS/CSS có hash trong tên: cấu hình browser cache dài hạn với immutable. Ảnh thumbnail/logo chưa có hash: thêm version/hash trước khi dùng immutable; HTML tiếp tục revalidate.
2. Chỉ cân nhắc cache ngắn cho danh mục công khai (ví dụ 30–60 giây), kèm invalidation khi duyệt/sửa sân. Không dùng chính sách này cho tồn lịch, giá chốt đơn, đăng nhập, đặt sân hoặc thanh toán.
3. Xác nhận gói Render và vùng Render/database. Kênh Render MCP chưa chọn workspace nên chưa xác nhận được gói hay metrics nội bộ. Nếu là Free và có spin-down, kiểm thử một lần sau thời gian không hoạt động; chỉ đề xuất đổi gói sau khi có bằng chứng và đánh giá chi phí.
4. Cloudinary ưu tiên cho ảnh upload động và tạo biến thể; chưa có bằng chứng việc chuyển toàn bộ thumbnail hiện tại sang Cloudinary sẽ xử lý phần chờ lớn nhất.

## Cách nghiệm thu

- So sánh trước/sau trên production cùng máy, cùng cấu hình mạng/CPU: 3 lượt profile mới, 3 lượt quay lại có cache; thêm một lượt backend cold nếu môi trường thực sự có spin-down.
- Đặt mục tiêu LCP ≤2,5 giây, CLS ≤0,1; theo dõi INP ≤200 ms bằng dữ liệu người dùng thực. Một lượt Lighthouse không chứng minh INP/p75.
- Đo thêm mốc riêng: thời gian có thẻ sân đầu tiên và thời gian ảnh sân đầu tiên hiển thị; loader/skeleton không được xem là danh sách đã tải xong.
- Kiểm tra tab trang chủ/khám phá/yêu thích/bản đồ, tìm kiếm, bộ lọc, chuyển trang, đăng nhập, dữ liệu cache cũ/lỗi, API lỗi và ảnh lỗi.
- Xác minh commit live sau mỗi deploy; build thành công và push không đồng nghĩa website đã nhận bản mới.

## Tài liệu tham khảo

- Google Web Vitals: https://web.dev/articles/vitals
- Render Free: https://render.com/docs/free

## Giới hạn khảo sát

Chưa có dữ liệu người dùng thực, số đo cold-start đã kiểm soát, vùng/gói Render và query timings PostgreSQL production. Các số HTTP là phép đo tại máy thực thi, có ảnh hưởng từ DNS/TLS/đường truyền. Không quy mọi độ trễ cho backend hay ảnh khi chưa có dữ liệu.

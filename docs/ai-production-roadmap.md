# Kế hoạch hoàn thiện AI tìm và đặt sân

Ngày lập: 09/11/2026. Phạm vi: backend Spring Boot, frontend React, PostgreSQL và tích hợp DeepSeek hiện có.

Cập nhật schema 11/11/2026: V21 loại bỏ bảng dự phòng `alobooking_schedule_slots`
vì chưa có luồng nhập/đọc lịch ngoài. Khi triển khai tính năng này cần thiết kế
schema và thêm migration mới, thay vì dựa vào bảng cũ đã loại bỏ.

**1. Mục tiêu và mức ưu tiên**

AI phải giúp người dùng đi từ nhu cầu tự nhiên đến một lựa chọn có thể đặt: đúng môn, địa điểm, ngày, khoảng giờ, sân con và giá. Người dùng chọn kết quả để chuyển sang quy trình giữ chỗ/đặt sân hiện có. Việc xác nhận đặt và thanh toán vẫn cần thao tác rõ ràng của người dùng.

| Mức | Ý nghĩa | Điều kiện phát hành |
|---|---|---|
| P0 | Chính xác nghiệp vụ, bảo vệ dữ liệu, khả năng phục hồi tối thiểu | Hoàn thành trước khi cho người dùng thật sử dụng bản thử nghiệm có giới hạn |
| P1 | Hiệu năng, vận hành nhiều instance, quan sát và hỗ trợ vận hành đầy đủ | Hoàn thành trước khi mở rộng công khai theo tải mục tiêu |
| P2 | Cá nhân hóa, tìm kiếm nâng cao và trợ lý thực hiện nhiều bước | Phát hành sau khi P0/P1 đạt nghiệm thu; đánh giá riêng từng tính năng |

Mục tiêu đầu tiên: “Mai 19–21h ở Cầu Giấy, cầu lông, tối đa 150 nghìn/giờ” trả về sân con trống toàn bộ hai giờ, giá tương ứng và nút chọn. Nếu chưa đủ dữ liệu, hỏi lại hoặc nói rõ chưa thể xác minh.

**2. Hiện trạng đã kiểm tra trong repository**

| Thành phần | Đã có | Khoảng trống cần xử lý |
|---|---|---|
| `LlmClient` | Gọi DeepSeek, trích xuất quận, giờ, ngân sách, tiện ích, môn | Chưa có ngày; chưa có schema nghiệp vụ chặt; chưa tách loại yêu cầu; thiếu ngữ cảnh thời gian hiện tại |
| `AiSearchOrchestratorService` | Đọc cụm sân/sân con/bảng giá; lọc trạng thái, duyệt, quận, tiện ích; tối đa 5 kết quả | Chưa kiểm tra lịch trống; chưa dùng môn và giờ để lọc; chưa xếp hạng rõ ràng; gọi LLM bên trong phương thức transactional |
| `SearchCriteriaDto` | Có giờ và `durationHours` | Chưa có ngày; validation thời gian đang so chuỗi; chưa định nghĩa xóa/đổi tiêu chí |
| `AvailabilityService` | Đọc occupancy, kiểm tra giao nhau, giờ mở cửa, trạng thái và bảo trì hệ thống | Cần thống nhất điều kiện đã duyệt ở mọi đường gọi; kiểm tra thời điểm quá khứ; chuẩn hóa chính sách slot |
| Giá | Có luật theo sân/cụm sân, ngày trong tuần, nhóm khách, ngày hiệu lực | AI lấy giá thấp nhất thay vì giá khoảng giờ; hàm giá availability hiện chưa lọc ngày hiệu lực; thuật toán chia đoạn 30 phút cần kiểm tra tại ranh giới luật giá |
| Booking | Tính tiền ở backend, snapshot giá, tạo HOLD, có thời hạn giữ chỗ | Cần nối từ kết quả chat; kiểm thử cạnh tranh, hết hạn, đổi giá, retry và idempotency |
| PostgreSQL | Có exclusion constraint chống occupancy chồng lấn; có index lịch | Cần kiểm thử thật trên PostgreSQL và xác nhận migration đã áp dụng ở môi trường chạy |
| Lịch ngoài | Chưa triển khai ingest/đọc lịch ngoài; bảng dự phòng V13 đã được loại bỏ ở V21 | Khi triển khai cần schema mới có thời điểm quan sát; không được suy ra trống từ việc thiếu dữ liệu |
| Hội thoại/UI | Chat gọi API thật và hiển thị gợi ý; request có `conversationId` | Chưa có quản lý hội thoại phía server; card chưa có ngày/giờ trống/giá cả buổi/nút chọn sân |
| Rate limit | 15 yêu cầu/phút theo khóa, lưu trong RAM | Không dùng chung giữa instance; map chưa dọn khóa không hoạt động; IP đang lấy trực tiếp từ X-Forwarded-For |
| Xử lý lỗi | Có handler chung, timeout gọi AI | Lỗi quota đang là RuntimeException; handler chung có thể trả nội dung exception; chưa có mã lỗi AI ổn định |
| Vận hành | Có Actuator và Docker Compose cho PostgreSQL local | Cần xác minh hạ tầng production, pipeline, cảnh báo, backup/restore và giới hạn chi phí |

Lần kiểm tra trước đã chạy 5 unit test thuộc AI/availability, đều đạt. Đây là test dùng mock, chưa chứng minh hoạt động end-to-end trên DB hoặc DeepSeek thật. Kế hoạch này dựa trên mã nguồn; chưa kiểm kê dữ liệu production, lưu lượng hoặc ngân sách thực tế.

**3. Kiến trúc mục tiêu và nguyên tắc dữ liệu**

Luồng chính:

```text
Tin nhắn + ngữ cảnh hội thoại
  → Kiểm tra quyền, hạn mức, kích thước
  → Nhận diện mục đích và trích xuất tiêu chí
  → Chuẩn hóa, xác thực hoặc hỏi lại
  → Tìm cụm sân/sân con phù hợp
  → Kiểm tra khoảng giờ và tính giá bằng dịch vụ nghiệp vụ dùng chung
  → Xếp hạng và tạo kết quả có cấu trúc
  → Trả card sân + giải thích dựa trên kết quả
  → Người dùng chọn
  → Kiểm tra lại, tính lại giá, tạo HOLD qua BookingService
  → Luồng thanh toán hiện có
```

- LLM diễn giải ngôn ngữ và trình bày. Backend quyết định dữ liệu sân, khả dụng, tiền và quyền thực hiện hành động.
- Không cho LLM chạy SQL tùy ý, tự chọn endpoint hoặc ghi DB trực tiếp. Mọi thao tác đi qua hàm có input được kiểm tra.
- Tái sử dụng dịch vụ availability/pricing/booking; tránh tạo một bộ quy tắc riêng chỉ cho chat.
- Gọi mạng đến LLM ngoài transaction DB; giới hạn transaction vào phần đọc nhất quán hoặc ghi cần nguyên tử.
- Câu trả lời tìm sân được tạo sau khi có kết quả DB. Giai đoạn đầu dùng mẫu câu để giảm chi phí và bảo đảm số liệu khớp; có thể nâng cấp diễn đạt sau.
- Đề xuất là trạng thái tại thời điểm kiểm tra, chưa phải giữ chỗ. Chỉ kết quả tạo HOLD thành công mới bảo đảm quyền giữ chỗ trong thời hạn quy định.

**4. P0 — Các đầu việc bắt buộc trước bản thử nghiệm thực tế**

| ID | Đầu việc và phạm vi | Phụ thuộc | Tiêu chí nghiệm thu |
|---|---|---|---|
| P0-01 | Kiểm kê dữ liệu và chính sách đặt: sân nội bộ, sân ngoài, chủ sở hữu, trạng thái duyệt, giờ mở cửa, giá, slot, thời gian đặt trước | Không | Có danh sách cụm sân đủ điều kiện pilot; từng sân có nguồn lịch rõ ràng và cấu hình hợp lệ |
| P0-02 | Chuẩn hóa contract API AI và tiêu chí: ngày, giờ, thời lượng theo phút, môn, thành phố/quận, loại ngân sách, tiện ích, trạng thái phản hồi | P0-01 | Frontend/backend thống nhất kiểu dữ liệu; phản hồi tương thích hoặc có cơ chế chuyển đổi phiên bản |
| P0-03 | Hiểu tiếng Việt và hội thoại cơ bản: tìm sân, đổi tiêu chí, hỏi thông tin, yêu cầu mơ hồ; thêm/xóa/thay tiêu chí | P0-02 | Bộ câu kiểm thử có ngày tương đối, sửa giờ, bỏ ngân sách; thiếu dữ liệu thì hỏi lại đúng trường |
| P0-04 | Làm chắc availability: khoảng liên tục, chồng lấn, bảo trì, duyệt, quá khứ, giờ hoạt động, HOLD hết hạn | P0-01/02 | Không đề xuất khoảng giờ xung đột trong bộ dữ liệu kiểm thử; kết quả thống nhất với luồng đặt |
| P0-05 | Làm chắc pricing dùng chung: ngày hiệu lực, ưu tiên rule, ngày trong tuần, loại khách, ranh giới giá, fallback đã cấu hình | P0-01/02 | Giá AI, kiểm tra lịch và booking bằng nhau khi dữ liệu không thay đổi; không tự gán giá khi thiếu cấu hình hợp lệ |
| P0-06 | Tìm và xếp hạng sân: SQL lọc trước, kiểm tra lịch và giá, top kết quả, giải thích phù hợp | P0-03/04/05 | Mọi kết quả chính đáp ứng toàn bộ điều kiện bắt buộc; phương án khác được gắn nhãn khác biệt |
| P0-07 | Card chọn sân và chuyển booking: ngày, giờ, sân con, tổng tiền, thời điểm kiểm tra, nút chọn | P0-02/06 | Người dùng chuyển đúng lựa chọn từ chat sang booking; kiểm tra lại khi giữ chỗ |
| P0-08 | Củng cố booking trước khi nhận luồng từ AI: cạnh tranh, hết hạn HOLD, giá đổi, thao tác lặp và ràng buộc DB | P0-04/05 | Hai yêu cầu đồng thời cùng sân/giờ chỉ tạo tối đa một HOLD hợp lệ; retry không sinh đơn trùng |
| P0-09 | Lỗi, bảo mật và chi phí tối thiểu: schema LLM, giới hạn đầu vào, quota, IP tin cậy, timeout, lỗi an toàn, giới hạn concurrent | P0-02 | Không lộ secret/exception nội bộ; quota trả 429; AI lỗi có đường tìm sân thủ công; không gửi request vô hạn |
| P0-10 | Kiểm thử tích hợp, smoke test staging, log/metric tối thiểu, cờ tắt AI và hướng dẫn xử lý sự cố | P0-01…09 | Đạt cổng pilot tại mục 11; có người phụ trách theo dõi và rollback được |

Chi tiết cần chốt cho P0:

- **Ngày/giờ:** dùng `Clock` có thể inject và `Asia/Ho_Chi_Minh` xuyên backend/frontend; truyền thời điểm tham chiếu cho bộ trích xuất. Định dạng ngày `YYYY-MM-DD`, giờ `HH:mm`; không so chuỗi chưa được parse. Sửa việc dùng UTC `toISOString()` để tạo ngày địa phương trong frontend. Hỏi lại “thứ Bảy này” nếu ngữ cảnh chưa đủ rõ; luôn hiển thị ngày tuyệt đối để người dùng kiểm tra.
- **Thiếu tiêu chí:** tìm thông tin cụm sân có thể không cần ngày; để khẳng định giờ trống phải có ngày và khoảng giờ. Nếu có ngày và thời lượng, có thể đề xuất các khoảng giờ cụ thể trong ngày. Không âm thầm áp dụng giờ mặc định trên UI khi người dùng chưa chọn.
- **Ngân sách:** phân biệt “150k/giờ”, “300k cả buổi”, “mỗi người 50k”. Trường hợp theo đầu người phải biết số người hoặc hỏi lại. Chuẩn hóa nghìn/k/triệu và xác định rõ ngân sách theo tổng tiền hay giá theo giờ. Nếu dùng mức trung bình theo giờ, phải ghi rõ; nếu người dùng yêu cầu mọi giờ đều dưới trần thì kiểm từng đoạn.
- **Thời lượng/slot:** dùng phút, hỗ trợ 60/90/120 phút theo chính sách sân; không ép mọi sân về một giờ hoặc 30 phút. Khoảng 19–21h phải trống liên tục trên cùng sân con. Quy ước nửa kín `[start, end)` để 19–20h và 20–21h không xung đột.
- **Qua đêm:** nếu pilot chưa hỗ trợ sân mở qua nửa đêm thì trả thông báo rõ ràng, không tính sai. Muốn hỗ trợ phải dùng cặp datetime và mở rộng quy tắc vận hành, schema và test trước khi bật.
- **Địa điểm:** chuẩn hóa tên không dấu, viết tắt và alias theo danh mục đang có; tách thành phố/quận để tránh trùng tên. Không tự bịa quận/sân khi không khớp. Môn thể thao và tiện ích phải được áp dụng thật trong truy vấn.
- **Hội thoại:** tạo trạng thái có TTL phía server hoặc session token được bảo vệ; giới hạn kích thước, số lượt và dữ liệu gửi LLM. `conversationId` ngẫu nhiên, ràng buộc với tài khoản hoặc guest session. Cho phép reset, bỏ bộ lọc và thay đổi lựa chọn cũ. Chỉ gửi phần ngữ cảnh cần thiết.
- **HOLD hết hạn:** thống nhất thời điểm HOLD không còn hiệu lực và cơ chế giải phóng occupancy. Không chỉ bỏ qua HOLD hết hạn trong kết quả tìm kiếm trong khi constraint DB vẫn chặn giữ chỗ. Kiểm thử cả lúc scheduler chậm và khi thanh toán về sát hạn.
- **Giá:** tách `PricingService` nếu giúp tránh lặp; cắt khoảng theo đúng mốc thay đổi rule, không dựa riêng vào midpoint của mỗi đoạn 30 phút. Dùng `BigDecimal`, quy tắc làm tròn tiền nhất quán. Giá mặc định chỉ dùng nếu là cấu hình nghiệp vụ được chấp thuận; thiếu giá thì đánh dấu chưa thể báo giá/đặt.
- **Giữ chỗ:** dùng giá backend hiện tại, kiểm tra quyền và trạng thái duyệt lần cuối, snapshot giá vào booking. Nếu giá khác lúc gợi ý, cho người dùng xem và xác nhận mức mới trước khi tiếp tục trả tiền. Bổ sung khóa idempotency có scope theo user và payload cho thao tác tạo HOLD; giữ exclusion constraint làm chốt chặn cuối cùng.
- **Sự kiện lịch:** rà soát WebSocket phát sau commit; rollback không được để UI nhận trạng thái giữ chỗ thành công giả. Không viết lại payment, nhưng phải kiểm thử hồi quy hết hạn, hủy, webhook lặp và cập nhật occupancy.
- **Câu trả lời kiến thức:** tách hỏi luật/thông tin khỏi tìm sân. Bản đầu chỉ trả nội dung thuộc phạm vi đã có nguồn hoặc hướng dẫn người dùng; không phát sinh danh sách sân ngẫu nhiên khi người dùng hỏi luật.

**5. Chính sách riêng cho dữ liệu AloBooking và nguồn bên ngoài**

Đây là điều kiện nghiệp vụ quan trọng: dữ liệu giới thiệu sân, lịch quan sát bên ngoài và lịch do hệ thống quản lý có mức bảo đảm khác nhau.

| Loại nguồn | Cách dùng trong AI | Hành động được hiển thị |
|---|---|---|
| Nội bộ, chủ sân cấu hình đầy đủ và hệ thống quản lý occupancy | Có thể xác minh lịch và giữ chỗ qua backend | Chọn sân / giữ chỗ |
| Danh mục bên ngoài, chỉ có hồ sơ sân | Tra cứu thông tin; không khẳng định giờ trống | Xem chi tiết / liên hệ / mở trang đặt chính thức đã xác minh |
| Snapshot lịch ngoài còn trong ngưỡng mới | Hiển thị trạng thái quan sát, nguồn và thời điểm cập nhật | Kiểm tra tại nguồn; chỉ đặt nội bộ nếu có tích hợp đặt được xác nhận |
| Lịch ngoài thiếu, hết hạn hoặc đồng bộ lỗi | Trạng thái chưa biết; loại khỏi danh sách khẳng định còn chỗ | Kiểm tra lại tại nguồn hoặc xem sân khác |

- Khi triển khai kho lịch ngoài mới, thiếu bản ghi phải có nghĩa là **chưa có dữ liệu**, không phải `AVAILABLE`.
- Nếu chưa có quyền truy cập nguồn ổn định, pilot vận hành với sân nội bộ đủ điều kiện; sân ngoài vẫn có thể xuất hiện trong mục tra cứu riêng.
- Khi triển khai đọc lịch ngoài: cần mapping mã sân con, múi giờ, thời điểm quan sát, trạng thái, độ phủ toàn khoảng và ngưỡng hết hạn theo nguồn.
- Cần xác minh quyền truy cập/API, hạn mức, quyền lưu trữ và độ tin cậy của nguồn trước khi xây ingest. Không mặc định website có thể được thu thập liên tục.
- Đồng bộ phải có upsert/idempotency, retry giới hạn, theo dõi lỗi, chống ghi đè bản mới bằng bản cũ và xử lý snapshot thiếu/thu hồi dữ liệu.
- Lịch ngoài muốn đưa vào luồng đặt có bảo đảm phải có xác nhận khả dụng và giữ chỗ phía nguồn. Đồng bộ một chiều không đủ để cam kết chống đặt trùng giữa hai nền tảng.
- Nếu việc đề xuất lịch AloBooking là yêu cầu bắt buộc của đợt mở bán đầu tiên, toàn bộ tích hợp này trở thành điều kiện P0 và lịch triển khai phải cộng thêm thời gian tích hợp thực tế.

**6. Contract API dự kiến**

Giữ `/api/v1/ai/search` và mở rộng tương thích nếu khả thi. Tên trường cuối cùng chốt khi thực hiện P0-02; danh sách sau là thiết kế đề xuất, chưa phải API đã có.

| Nhóm | Trường/chức năng dự kiến |
|---|---|
| Request | `message`, `conversationId`, `currentCriteria` tùy chọn; backend kiểm tra mọi dữ liệu client |
| Criteria | `sportType`, `city`, `district`, `date`, `startTime`, `endTime`, `durationMinutes`, `budgetAmount`, `budgetType`, `amenities` |
| Response chung | `requestId`, `conversationId`, `status`, `reply`, `extractedCriteria`, `missingFields`, `results`, `alternatives`, `remainingQuota` |
| Status | `NEEDS_CLARIFICATION`, `RESULTS`, `NO_MATCH`, `INFO_ONLY`, `TEMPORARILY_UNAVAILABLE` |
| Kết quả đặt được | `facilityId`, `courtId`, tên/địa chỉ, ngày/giờ, tổng giá, tiền tệ, các đoạn giá khi cần, lý do phù hợp |
| Tính mới/nguồn | `availabilityStatus`, `source`, `checkedAt`, `observedAt` khi là dữ liệu ngoài, `bookable`, hành động được phép |
| Phương án khác | Tiêu chí khác yêu cầu: giờ lệch bao nhiêu, địa điểm khác, chênh ngân sách; không trộn vào kết quả khớp hoàn toàn |
| Lỗi | Mã lỗi ổn định, thông báo an toàn, `retryAfter` khi phù hợp và `requestId` để tra cứu |

Các mã HTTP cần phân biệt: 400 input sai; 401/403 quyền; 409 cạnh tranh/đổi trạng thái khi booking; 429 quá hạn mức; 502/503/504 khi phụ thuộc AI lỗi hoặc timeout theo quy ước đã chốt. Thiếu thông tin để tìm sân là phản hồi hỏi lại thành công, không phải 500. API quota dùng cùng scope/cách tính với API search.

**7. P1 — Chạy ổn định khi mở rộng công khai**

| ID | Hạng mục | Công việc cụ thể | Nghiệm thu |
|---|---|---|---|
| P1-01 | Truy vấn và connection pool | Lọc SQL có giới hạn; batch court/rule/occupancy; tránh N+1; đo `EXPLAIN ANALYZE`; bổ sung index qua migration nếu cần | Kết quả đúng; không quét toàn catalog mỗi lần; số query không tăng tuyến tính theo từng sân trong một batch |
| P1-02 | Cache có kiểm soát | Cache metadata/alias; cache parse chỉ khi khóa gồm ngày tham chiếu và tiêu chí; availability đọc mới hoặc TTL ngắn có invalidation | Không tái sử dụng kết quả “mai” sai ngày; giữ chỗ luôn đọc lại nguồn authoritative |
| P1-03 | Hạn mức nhiều instance | Rate limit ở gateway hoặc kho dùng chung; quota user/guest/IP và toàn hệ thống; TTL cleanup, giới hạn concurrent, token và ngân sách | Không vượt quota chỉ bằng đổi instance/restart; không tin X-Forwarded-For tùy ý |
| P1-04 | Phục hồi phụ thuộc | Timeout tổng; circuit breaker; retry giới hạn chỉ lỗi tạm thời, có backoff/jitter; giới hạn output; không retry request sai | DeepSeek lỗi không làm cạn thread/DB pool; fallback tìm thủ công hoạt động |
| P1-05 | Quan sát | Metric request/parse/SQL/LLM latency, timeout, quota, no-match, số token/chi phí; correlation ID xuyên search → booking; dashboard/cảnh báo | Tìm nguyên nhân một request từ ID; phát hiện tăng lỗi/chi phí trước khi mở rộng |
| P1-06 | Bảo mật và riêng tư | Ràng buộc hội thoại theo người dùng; kiểm tra guest token; allowlist dữ liệu gửi LLM; chống prompt injection; escape nội dung; quản lý secret; retention/xóa hội thoại | Không đọc chéo hội thoại, không lộ PII/secret; nội dung người dùng/sân không thể cấp quyền hành động |
| P1-07 | Nhiều instance/scheduler | Kiểm thử job hết hạn cạnh tranh; idempotency; khóa hoặc cơ chế chia công việc phù hợp; đồng bộ event/reconnect | Không phát sinh trạng thái booking sai khi chạy ít nhất hai instance |
| P1-08 | CI/CD và cấu hình | Test/build tự động; môi trường dev/staging/prod; kiểm tra config; migration staging; feature flag và rollout theo nhóm | Có bản build truy vết được; bật/tắt AI không cần deploy lại toàn hệ thống nếu hạ tầng hỗ trợ |
| P1-09 | Backup và khôi phục | Lịch backup, retention, thử restore, mục tiêu RPO/RTO, phân quyền DB, tài liệu chạy sự cố | Restore được trên môi trường tách biệt; người vận hành thực hiện theo runbook |
| P1-10 | Đánh giá chất lượng | Bộ câu tiếng Việt có nhãn, bộ tình huống DB cố định, version prompt/model, chạy hồi quy trước thay đổi | Có báo cáo trích xuất đúng, gợi ý đúng và lỗi theo phiên bản |
| P1-11 | Vận hành dữ liệu sân | Màn hình/báo cáo sân thiếu lịch/giá, cảnh báo cấu hình lỗi, cơ chế chủ sân cập nhật, audit thay đổi quan trọng | Sân thiếu dữ liệu không lọt vào danh sách đặt được; xác định được ai sửa giá/lịch |

P0 phải có phiên bản tối thiểu của logging, rate limit, timeout, bảo mật và rollback. P1 mở rộng độ phủ và quy mô; không dùng P1 để hoãn lỗi nghiệp vụ hoặc lộ dữ liệu đã biết. Nếu production ban đầu có nhiều instance thì P1-03 và P1-07 phải hoàn thành trước lần phát hành đó.

Chi tiết vận hành:

- Guest có quota thấp hơn tài khoản; IP chỉ là một tín hiệu do nhiều người có thể dùng chung mạng. Tin forwarded headers chỉ qua proxy đã cấu hình. Chặn abuse phải nằm trước bước gọi LLM.
- Không cache trạng thái giữ chỗ để quyết định tạo booking. Mất cache không được biến thành “còn trống”.
- Tắt AI riêng khi provider lỗi; tìm sân thủ công và booking vẫn hoạt động. Health/readiness của ứng dụng không bị làm chết toàn bộ chỉ vì provider AI tạm lỗi.
- Ngưỡng cảnh báo cho chi phí/token, lỗi, p95, cạn pool, job giải phóng HOLD chậm, và dữ liệu ngoài quá hạn. Cảnh báo ngân sách có thể tắt AI sinh ngôn ngữ để chuyển sang tìm kiếm bằng bộ lọc.
- Không log raw chat mặc định, Authorization, khóa API hay payload thanh toán. Nếu lưu mẫu để đánh giá phải có chính sách sử dụng dữ liệu, che thông tin và thời hạn lưu cụ thể.
- Cấu hình CORS production theo origin cần thiết; xác minh khả năng tắt origin phát triển. Chỉ công khai health tối giản; không công khai metric hoặc thông tin cấu hình nhạy cảm.
- Hội thoại lưu server cần migration riêng, TTL cleanup và quyền sở hữu. Chỉ thêm bảng event/audit cần thiết; không nhân bản booking hoặc occupancy sang bộ dữ liệu AI.

**8. P2 — Các tính năng nâng cao**

| ID | Tính năng | Giá trị | Điều kiện và giới hạn |
|---|---|---|---|
| P2-01 | Gợi ý giờ gần nhất, nhiều lựa chọn theo ngày | Hết chỗ vẫn có phương án hữu ích | Dùng cùng engine lịch/giá; giới hạn cửa sổ tìm kiếm và ghi rõ khác biệt |
| P2-02 | Tìm gần vị trí, theo bán kính và thời gian di chuyển | Chọn sân thuận tiện hơn | Có tọa độ đáng tin; người dùng cho phép vị trí; nếu dùng dịch vụ bản đồ cần đánh giá chi phí |
| P2-03 | Xếp hạng theo sở thích và lịch sử | Tăng mức phù hợp và khả năng quay lại | Có dữ liệu đủ và cơ chế riêng tư; công khai yếu tố chính của thứ hạng; không ưu tiên sân hết chỗ |
| P2-04 | So sánh sân ngay trong chat | Giúp chọn giữa giá, khoảng cách, tiện ích, lịch | Chỉ dùng trường đã xác minh; thiếu thông tin thì nói thiếu |
| P2-05 | RAG cho thông tin sân, FAQ, luật và chính sách | Trả lời kiến thức có căn cứ | Kho tài liệu có nguồn/ngày cập nhật; nội dung luật phải được đối chiếu nguồn chính thức; lịch/giá động vẫn truy vấn dịch vụ nghiệp vụ |
| P2-06 | Tìm kiếm ngữ nghĩa và tên gần đúng | Hiểu “sân mát, có chỗ đậu xe”, tên sân viết sai | Benchmark so với SQL/alias trước; chỉ thêm vector/embedding nếu cải thiện đo được |
| P2-07 | Giọng nói tiếng Việt hoàn thiện | Thuận tiện khi dùng điện thoại | Tận dụng phần voice đã có; kiểm thử thiết bị/quyền microphone; xác nhận ngày giờ/giá nghe được trước hành động |
| P2-08 | Streaming và tiến độ xử lý | Giảm cảm giác chờ | Không stream khẳng định sân/giá trước khi DB xác minh; hỗ trợ cancel và chống phản hồi cũ ghi đè |
| P2-09 | Theo dõi slot trống và thông báo | Người dùng biết khi sân vừa có chỗ | Opt-in rõ, quota, chống spam, giới hạn thời gian đăng ký; có hạ tầng notification |
| P2-10 | Lịch cố định/lặp hàng tuần | Phục vụ nhóm chơi thường xuyên | Mở rộng nghiệp vụ booking theo chuỗi, giá cố định và xử lý xung đột từng buổi; không giả định đã được hệ thống hiện tại hỗ trợ |
| P2-11 | Đặt nhiều sân cho nhóm | Phù hợp sự kiện/nhóm đông | Cần giữ chỗ nhiều sân nguyên tử hoặc quy định rõ partial success và bù trừ |
| P2-12 | Đồng bộ lịch ngoài có bảo đảm | Mở rộng nguồn sân và độ phủ giờ trống | Chỉ triển khai sau khi xác nhận tích hợp nguồn và quyền đặt; áp dụng quy tắc mục 5 |
| P2-13 | Multi-provider/model routing | Giảm ảnh hưởng provider lỗi và tối ưu chi phí | Cùng contract/schema, bộ eval đạt, giới hạn dữ liệu chia sẻ và chi phí; không đổi provider âm thầm nếu chính sách dữ liệu không cho phép |
| P2-14 | Trợ lý sửa/hủy/đặt trong chat | Hoàn thành nhiều bước trong một nơi | Công cụ có allowlist, kiểm tra quyền backend, xác nhận thao tác, idempotency, audit và áp dụng chính sách hủy |
| P2-15 | Phản hồi chất lượng và thử nghiệm xếp hạng | Cải thiện dựa trên hành vi thật | Gắn phản hồi với request/prompt version; thử nghiệm không thay đổi điều kiện an toàn/khả dụng |

P2 không phải điều kiện để AI tìm và đặt sân hoạt động đúng. Chưa cần huấn luyện model riêng, vector DB hoặc một framework agent mới để giải quyết khoảng trống hiện tại.

**9. Kế hoạch dữ liệu và thay đổi mã nguồn**

| Khu vực | Thay đổi dự kiến |
|---|---|
| `user/ai/dto` | Criteria có ngày/thời lượng/ngân sách; kết quả có sân con/slot/giá/nguồn; trạng thái hỏi lại và mã lỗi |
| `LlmClient` | Intent, schema validation, ngữ cảnh thời gian, output limit, đo thời gian/usage, prompt version; tách gọi mạng khỏi transaction |
| `AiSearchOrchestratorService` | Điều phối parse → validate → query → availability/pricing → rank → reply; không tự tính một loại giá khác |
| `AvailabilityService` | Nguồn dùng chung cho khoảng liên tục và lưới slot; hỗ trợ batch hoặc thêm service search chuyên dụng dùng chung quy tắc |
| Pricing | Tách/chuẩn hóa service; quy tắc ngày hiệu lực, ranh giới giờ, ưu tiên và làm tròn |
| Repositories | Query batch/lọc có giới hạn; đọc occupancy nhiều sân; query giá đầy đủ cấp sân và cấp cụm |
| Booking và scheduler | Điều kiện hợp lệ cuối cùng, idempotency, hết hạn, cạnh tranh nhiều instance, event sau commit |
| Frontend chat/types/filter | Đồng bộ ngày/môn/ngân sách; hội thoại; card slot; thao tác chọn; lỗi/quota; cancel/chống request cũ |
| Security/error/config | Lỗi có mã và request ID, trusted proxy, phân quyền hội thoại, timeout/quota/feature flags |
| Migration | Thêm bảng hội thoại/idempotency/index/chỉ dấu nguồn nếu phương án cuối cần; migration tăng dần, không sửa lịch sử Flyway đã chạy |
| CI/tests/docs | PostgreSQL integration, UI E2E, load test, báo cáo eval, runbook, checklist release |

Không mặc định cần thêm toàn bộ bảng mới. Chốt thiết kế từ P0-01/02 và giữ phạm vi migration nhỏ nhất đáp ứng nghiệp vụ. Không sửa dữ liệu production trước khi có báo cáo kiểm kê và phương án sửa có thể review.

**10. Ma trận kiểm thử bắt buộc**

| Nhóm | Tình huống phải có |
|---|---|
| Tiếng Việt | Không dấu, sai chính tả phổ biến, “mai”, “tối nay”, “cuối tuần”, 19h30, “một tiếng rưỡi”, 150k/h, ngân sách cả buổi, phủ định/bỏ tiêu chí |
| Thời gian | Ranh giới ngày theo VN, client khác múi giờ, ngày quá khứ, giờ vừa qua, thiếu giờ kết thúc, vượt giờ hoạt động, qua đêm chưa hỗ trợ |
| Hội thoại | Đổi quận, đổi môn, đổi ngày, rẻ hơn, muộn 1h, bỏ tiện ích, reset, TTL hết hạn; không kế thừa tiêu chí sai |
| Availability | Đặt kín, HOLD, bảo trì, released, thiếu sân con, chưa duyệt, slot giáp ranh, giao một phần, hai slot rời không tạo thành khoảng liên tục |
| Giá | Cuối tuần, hiệu lực tương lai/hết hạn, rule cấp cụm/cấp sân, nhóm khách, chuyển giá giữa buổi, 90 phút, không có giá, làm tròn |
| Lịch ngoài | Thiếu dòng, thiếu một phần khoảng, dữ liệu cũ, đồng bộ lỗi, mapping sai, bản cập nhật cũ đến sau; không suy ra trống |
| Booking cạnh tranh | Hai người chọn cùng slot; double click; retry sau mất mạng; HOLD hết hạn trước thanh toán; webhook lặp; giá thay đổi sau tìm kiếm |
| LLM và API | JSON lỗi, sai kiểu, field lạ, quá dài, timeout, quota provider, provider 5xx, prompt injection, dữ liệu client giả |
| Bảo mật | Không đọc chéo hội thoại/booking; không giả forwarded IP để né quota; không lộ secret/log/stacktrace; XSS từ chat/tên sân |
| Hiệu năng | Nhiều người dùng và dataset lớn; provider chậm; DB pool giới hạn; hai instance; scheduler chậm; cache/rate-limit store lỗi |
| Trải nghiệm | Mobile, bàn phím, đọc màn hình cơ bản, loading/timeout, gửi lặp, cancel, phản hồi đến sai thứ tự, chọn kết quả và quay lại chat |

Unit test cho logic; integration test trên PostgreSQL cho query, transaction và exclusion constraint; API/frontend E2E cho hành trình thực tế. Không dùng H2 để kết luận chống trùng lịch PostgreSQL. CI dùng provider giả lập có kịch bản; staging có smoke test provider thật với quota riêng để tránh kiểm thử phụ thuộc mạng và phát sinh phí không kiểm soát.

**11. Cổng nghiệm thu và chỉ tiêu vận hành**

Các ngưỡng dưới đây là mục tiêu đề xuất, cần xác nhận sau baseline tải, hạ tầng và ngân sách. Không phải cam kết hiệu năng của hệ thống hiện tại.

| Chỉ tiêu | Mục tiêu ban đầu |
|---|---|
| Tính đúng lịch/giá | 100% bộ kịch bản nghiệp vụ xác định; không còn lỗi nghiêm trọng về đặt trùng, sai tiền, sai quyền |
| Trích xuất tiếng Việt | Tối thiểu 95% đúng các trường bắt buộc trên bộ 150–300 câu có nhãn; câu mơ hồ hỏi lại được tính riêng |
| Kết quả có căn cứ | 100% ID, slot, giá trong gợi ý truy vết được về dữ liệu; không tạo sân/giá giả |
| Tìm kiếm không gọi LLM | p95 ≤ 1 giây trên staging theo dataset/tải đã thống nhất |
| Search có LLM | p95 mục tiêu ≤ 8 giây; có tổng deadline và thông báo lỗi/fallback trong khoảng 15 giây |
| Khả dụng | Mục tiêu SLO tháng 99,5% cho hành trình AI, gồm phụ thuộc provider; báo cáo riêng fallback tìm thủ công và lỗi từng lớp |
| Tải nghiệm thu | Lấy peak dự kiến đã đo/ước tính, kiểm thử 2 lần peak trong tối thiểu 30 phút và thử spike; ghi rõ hạ tầng/dataset/số concurrent |
| Chi phí | Có ngân sách ngày/tháng bằng số tiền cụ thể, dashboard token/request và cơ chế ngắt trước khi mở công khai |
| Khôi phục | Mục tiêu ban đầu RPO ≤ 24h, RTO ≤ 4h; cần điều chỉnh theo mức chấp nhận mất dữ liệu đặt sân và diễn tập thực tế |

Định nghĩa availability cần ghi rõ numerator/denominator, loại trừ request input sai/abuse, cửa sổ đo và cách tính lỗi provider. Với nghiệp vụ thanh toán/đặt sân, RPO 24h có thể không đủ; phải chốt nhu cầu phục hồi theo giao dịch và nâng lên backup liên tục/PITR nếu cần trước khi nhận tiền thật.

Cổng pilot:

- [ ] Toàn bộ P0 đạt; không còn lỗi mức nghiêm trọng/cao liên quan lịch, tiền, quyền hoặc lộ dữ liệu.
- [ ] Có danh sách sân pilot đủ dữ liệu và người chịu trách nhiệm cập nhật lịch ngoài ứng dụng, nếu có.
- [ ] Trích xuất, query, booking và UI E2E đạt; PostgreSQL thật xác nhận chống overlap.
- [ ] DeepSeek thật được kiểm tra với bộ câu nhỏ; có hạn mức chi phí và cờ tắt AI.
- [ ] Log/metric tối thiểu, cảnh báo lỗi/chi phí và hướng dẫn fallback/rollback đã thử.
- [ ] Luồng đặt và thanh toán hiện tại không có hồi quy trong phần AI tác động.

Cổng mở rộng:

- [ ] P1 theo cấu hình production đạt; load test và phục hồi phụ thuộc đạt.
- [ ] Dashboard, cảnh báo và người xử lý sự cố hoạt động; diễn tập restore thành công.
- [ ] Pilot tối thiểu một tuần có dữ liệu đủ đánh giá, bao phủ giờ cao điểm; không có sự cố nghiêm trọng chưa xử lý.
- [ ] Đạt ngưỡng chất lượng/latency/chi phí đã chốt; có phương án tăng tải hoặc hạ cấp dịch vụ.

**12. Lộ trình triển khai và đầu ra review được**

| Giai đoạn | Nội dung | Đầu ra | Ước lượng công phát triển |
|---|---|---|---|
| A | Kiểm kê, quy tắc nguồn dữ liệu, contract, fixture và bộ câu chuẩn | Thiết kế API, danh sách sân pilot, baseline và tiêu chí nghiệm thu | 2–3 ngày |
| B | Ngày/giờ, intent, schema, hội thoại cơ bản, chuẩn hóa criteria | API hỏi lại và cập nhật tiêu chí có test | 3–5 ngày |
| C | Availability + pricing dùng chung + tìm/rank kết quả | API trả slot/giá đúng, PostgreSQL integration test | 5–7 ngày |
| D | Card chat, chọn sân, booking lại lịch/giá, idempotency và cạnh tranh | Hành trình E2E từ chat đến HOLD | 3–5 ngày |
| E | P0 hardening: bảo mật/lỗi/quota/timeout/fallback/quan sát tối thiểu | Bản staging đạt cổng pilot | 3–5 ngày |
| F | Kiểm thử hồi quy và sửa lỗi trước pilot | Báo cáo nghiệm thu, runbook, rollout có giới hạn | 2–3 ngày |
| G | P1 tối ưu, nhiều instance, CI/CD, dashboard/restore và tải | Đạt cổng mở rộng | 7–12 ngày |

Tổng tham chiếu: P0 khoảng 18–28 ngày công; P0 + P1 khoảng 25–40 ngày công cho một lập trình viên nắm codebase, chưa gồm thời gian chờ nguồn ngoài và thời gian quan sát pilot. Tương đương khoảng 5–8 tuần phát triển, cộng lịch pilot/điều phối theo đội thực tế. Đây là ước lượng ban đầu, sẽ hiệu chỉnh sau giai đoạn A. Tích hợp nguồn ngoài, thay đổi chính sách giá hoặc thanh toán lớn có thể tăng phạm vi đáng kể.

Các lát cắt PR nên nhỏ và review độc lập: contract/validation → availability/pricing → search/ranking → UI/booking → hardening → vận hành. Mỗi PR phải có tiêu chí nghiệm thu và kiểm thử phù hợp; không chờ viết xong mọi tính năng mới kiểm thử. Chỉ bật đường gọi mới bằng feature flag sau khi các phụ thuộc đã có.

Trách nhiệm cần có: người phụ trách sản phẩm/nghiệp vụ chốt chính sách; backend phụ trách nguồn lịch/giá/booking; frontend phụ trách hội thoại và hành trình chọn; QA xác nhận ma trận; người vận hành phụ trách môi trường/secret/giám sát/backup. Một người có thể đảm nhiệm nhiều vai trò, nhưng mọi đầu việc phải có người chịu trách nhiệm cụ thể.

**13. Thứ tự phát hành, rollback và việc cần xác nhận trong giai đoạn A**

Phát hành: môi trường dev với dữ liệu cố định → staging với PostgreSQL và provider thật → nhóm nội bộ → nhóm người dùng/sân pilot → mở rộng theo số liệu. Trước hết chỉ bật sân có dữ liệu nội bộ đáng tin; phần lịch ngoài được bật riêng khi qua cổng dữ liệu nguồn.

Rollback: tắt feature flag AI mới, giữ tìm thủ công/booking hoạt động, quay phiên bản app tương thích schema. Migration theo hướng bổ sung trước, chuyển dữ liệu/đọc sau, dọn cấu trúc cũ ở đợt riêng; tránh down migration xóa dữ liệu để rollback ứng dụng. Sau rollback phải kiểm tra HOLD/booking đang tồn tại, scheduler và webhook, không tự hủy giao dịch người dùng.

Những thông tin cần thu thập khi thực hiện A, không ngăn lập kế hoạch:

| Cần xác nhận | Giả định lập kế hoạch hiện tại |
|---|---|
| Sân nào thật sự nhận đặt trong hệ thống, lịch offline có được cập nhật không? | Pilot chọn tập nhỏ sân nội bộ có người quản lý và lịch đầy đủ |
| Có bắt buộc lịch AloBooking ngay đợt đầu không, có API/quyền tích hợp không? | Sân ngoài tra cứu riêng; chưa cam kết lịch trực tiếp hoặc giữ chỗ liên nền tảng |
| Quy tắc slot, giờ qua đêm, horizon đặt trước, ngân sách theo giờ/tổng, giá dự phòng? | Chốt trước khi sửa engine; chưa hỗ trợ qua đêm nếu thiếu mô hình đúng |
| Lưu lượng peak, số sân/sân con, số instance, chi phí AI tối đa? | Đo baseline; không chọn Redis hay kiến trúc mở rộng chỉ theo suy đoán |
| Hạ tầng staging/prod, backup hiện có, yêu cầu mất dữ liệu tối đa? | Phải có môi trường kiểm thử và diễn tập phục hồi trước khi mở rộng |
| Thời hạn lưu chat, thông tin được gửi provider, quyền xóa dữ liệu? | Gửi dữ liệu tối thiểu; không gửi thông tin thanh toán/PII không cần thiết |
| Tiêu chí thành công của sản phẩm? | Đo từ tìm kiếm đủ tiêu chí → chọn sân → HOLD → booking xác nhận; kết hợp tỷ lệ đúng và chi phí |

**14. Tiến độ triển khai thực tế (09/11/2026)**

| Hạng mục | Trạng thái và giới hạn |
|---|---|
| P0-01 | Đã dựng PostgreSQL 17.11 riêng và chạy 16 migration; chưa kiểm kê dữ liệu production |
| P0-02/03 | Có ngày, thành phố, thời lượng phút, ngân sách cả buổi, validate thời gian/giá, status/missingFields, intent, ghi nhớ tiêu chí trong phiên, clearFields và reset; chưa có server session và bộ eval đầy đủ |
| P0-04/05 | Nối availability, kiểm tra duyệt/quá khứ, lọc ngày hiệu lực và tính giá tại ranh giới rule; chưa nghiệm thu HOLD expiry/slot/giá thực tế trên PostgreSQL |
| P0-06/07 | Có kết quả sân con/interval/tổng giá; chọn card giữ nguyên lựa chọn vào modal, recheck interval/giá; có batch availability/rules/occupancy và xếp giá tăng dần, chuẩn hóa tiếng Việt không dấu. Bốn ca UI E2E đã đạt với backend/DB thật và provider giả lập |
| P0-08 | Thêm migration V15, khóa tài khoản và idempotency key; sự kiện sau commit; test booking thật trên PostgreSQL đã xác nhận retry và hai khách tranh cùng slot |
| P0-09 | Có 429/503, giới hạn concurrent/output, validate schema cơ bản, không lộ exception chung; client deadline, chống gửi song song; circuit breaker tạm ngừng 30 giây sau 3 lỗi provider; chưa có ngân sách toàn hệ thống |
| P0-10 | Full suite mới nhất: 75 test đạt, không bỏ qua, môi trường PostgreSQL (ca phân trang dùng H2 riêng). Frontend build và bốn ca UI E2E đạt. Provider thật chưa kiểm tra do thiếu khóa DeepSeek; chưa có staging/load test |
| P1-03 | Migration V16 và quota atomic đã kiểm thử trên PostgreSQL giữa hai service instance; chưa có load test toàn hệ thống nhiều backend process |
| P1-05/08 | Có request ID, timer/status log và workflow CI PostgreSQL/frontend; chưa chạy workflow từ xa, dashboard/cảnh báo chưa cấu hình |
| P1-01 | Đã có batch lịch/giá/sân con cho tìm khoảng giờ cụ thể; vẫn cần đo EXPLAIN, tải và tối ưu thêm nhánh tra cứu catalog |
| P2-01 | Đã có phương án giờ sớm/muộn 60–120 phút trong cùng ngày khi không khớp; trả riêng alternatives, có test xác nhận không coi là khớp chính xác |
| PostgreSQL test | Ba test PostgreSQL thực tế đã đạt, không bỏ qua: exclusion constraint, quota giữa hai service instance và booking cạnh tranh/idempotency. Chi tiết tại docs/basic-ai-verification.md |
| P1 khác và P2 khác | Chưa hoàn thành; xem các bảng yêu cầu phía trên |

Hướng dẫn cấu hình và nghiệm thu: `docs/ai-operations.md`. Kế hoạch chưa được đánh dấu hoàn tất; không đồng nhất test H2 với nghiệm thu PostgreSQL hoặc vận hành production.

# Badminton-Booking-Application

## Danh mục sân AloBooking

Khi backend khởi động với PostgreSQL và Flyway, migration V8 tự nhập 90 cụm sân từ `backend/src/main/resources/data/badminton_venues.json`. Mở tab **Cụm sân** trong trang **Khám phá** để xem danh mục.

Migration bỏ qua cụm sân đã có cùng mã nhập hoặc cùng tên và địa chỉ. Dữ liệu này dùng để tra cứu. Chủ sân cần cấu hình sân con và lịch thật để nhận đặt trực tuyến.

Migration V9 bổ sung bảng `alobooking_public_facility_profiles` cho các cụm sân nhập ở V8. Bảng lưu mã sân, số sân được công bố và thông tin liên hệ từ bản danh mục. Các liên kết đặt sân đối chiếu được theo mã có kèm địa chỉ bài viết chính thức của AloBooking. Số sân công bố chỉ dùng để tra cứu và không tạo sân con có thể đặt trực tuyến.

# UserManagement

[Tải ZIP mới nhất — US8 lịch họp và email](UserManagement_US8.zip)

US8 thêm lịch họp HR/Mentor/Intern, email mời/cập nhật/hủy/nhắc, gửi lại và file lịch ICS. Trong backend: `npm ci` → `npm run migrate:meetings` → `npm start`. Giữ cấu hình riêng, không import lại schema/seed vào DB đang dùng. [Thay đổi, kết quả test và giới hạn US8](UserManagement/FIXES_US8.md).

[US7 xuất Excel/PDF](UserManagement/FIXES_US7.md).

HR xác nhận kết quả riêng từng khóa; hoàn thành A không tự hoàn thành B. Chặn xếp trùng lịch và giữ kết quả đã chốt. Báo cáo có lọc, drill-down và CSV.

**Nâng cấp bản cũ:** giữ cấu hình DB/email riêng, dừng backend cũ, chạy trong backend: `npm ci` → `npm run migrate:program-completion` → `npm start`. Không import lại schema/seed vào DB đang dùng. Lượt cũ cần HR rà soát, không tự suy ra từ trạng thái hồ sơ.

[Mã nguồn](UserManagement/) · [Migration, định nghĩa, kết quả kiểm thử và giới hạn](UserManagement/FIXES_US6.md)

[Thống nhất định dạng và xử lý lỗi](UserManagement/FIXES_CODE_STYLE.md) — Prettier/LF, bỏ export thừa, handler lỗi dùng chung và kết quả kiểm thử.

[Giao diện mobile và màu chủ đạo](UserManagement/FIXES_RESPONSIVE.md) — menu thu gọn, bố cục điện thoại và màu thống nhất ba trang.

# UserManagement

[Tải ZIP mới nhất — US6 kết quả từng chương trình](UserManagement_US6_program_results.zip)

HR xác nhận kết quả riêng từng khóa; hoàn thành A không tự hoàn thành B. Chặn xếp trùng lịch và giữ kết quả đã chốt. Báo cáo có lọc, drill-down và CSV.

**Nâng cấp bản cũ:** giữ cấu hình DB/email riêng, dừng backend cũ, chạy trong backend: `npm ci` → `npm run migrate:program-completion` → `npm start`. Không import lại schema/seed vào DB đang dùng. Lượt cũ cần HR rà soát, không tự suy ra từ trạng thái hồ sơ.

[Mã nguồn](UserManagement/) · [Migration, định nghĩa, kết quả kiểm thử và giới hạn](UserManagement/FIXES_US6.md)

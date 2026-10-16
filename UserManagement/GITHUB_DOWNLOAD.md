# Tải và chạy dự án

Tải UserManagement_US6_program_results.zip tại thư mục gốc GitHub (UserManagement_US6.zip cũng là bản mới nhất).

Giữ cấu hình DB/email riêng; ZIP không chứa mật khẩu riêng. Nếu dựng máy mới, tạo db_config.json/mail_config.json từ tệp example.

Nâng cấp DB cũ: không import schema.sql hoặc seed_data.sql. Trong backend chạy npm ci rồi npm run migrate:program-completion, sau đó npm start. Xem FIXES_US6.md trước khi nâng cấp và rà soát các lượt cũ.

# Thống nhất định dạng và xử lý lỗi

## Thay đổi

- Chạy Prettier 3.6.2 cho `backend` và `Frontend`, dùng `.prettierrc.json` của repo (printWidth 80, 2 spaces, endOfLine lf) và `.prettierignore` hiện có. Không thêm dependency của ứng dụng. Các tệp JSON, uploads và node_modules vẫn được bỏ qua theo cấu hình repo.
- Đã định dạng các controller/service, khối support/leave/attendance trong db.js và script trong Frontend/index.html. Bốn tệp demoData.js, templates.js, emailQueue.js, cleanup_test_data.js hiện dùng LF; quét toàn bộ JS ngoài node_modules không còn byte CR.
- `findWeeklyReportByWeek` vẫn được upsertWeeklyReport gọi nội bộ: giữ hàm và chỉ bỏ export không có nơi dùng. Không xóa chức năng đọc lại báo cáo sau upsert.
- Tập trung phân loại lỗi vào publicError trong backend/errors.js. Lỗi 4xx giữ status/thông báo nghiệp vụ/metadata; lỗi không xác định và mọi 5xx (kể cả HttpError(500/503)) chỉ trả thông báo an toàn, ghi chi tiết ở server.
- endpoint.sendError và sendRouteError cùng dùng chính sách này, giữ các dạng JSON đã có để tương thích client. Metadata không được ghi đè success/message/error của endpoint.
- supportRequests.controller bỏ fail/action tự xử lý lỗi riêng, dùng makeEndpoint/sendError. Download cũng xử lý lỗi bất đồng bộ từ res.download; nếu đã gửi header thì đóng kết nối thay vì gửi thêm JSON.
- Thêm test_error_handling_unit.js, script test:error-handling-unit và đăng ký trong runner mặc định.

## Kết quả đã chạy

- `prettier --check backend Frontend`: đạt.
- `node tests/run_all.js --unit`: **29 suite PASS / 0 FAIL / 0 SKIP**, gồm 5 test mới về lỗi 500, thông báo 4xx, metadata, controller hỗ trợ và lỗi tải tệp.
- test_completion_rate_browser.js: 5 nhóm kiểm tra đạt; test_intern_origin_browser.js: đạt, gồm nhãn an toàn, nhóm Khác và cuộn ngang 30 cột.
- Đối chiếu AST bằng Acorn với bản Git trước sửa: 87 tệp JS tương đương sau định dạng (db.js được đối chiếu sau khi loại export đã chủ đích bỏ). Các tệp cố ý đổi logic xử lý lỗi/đăng ký test không được tính là chỉ định dạng.
- test_support_requests_api.js trên MySQL 8 riêng: **36 kiểm tra đạt, 1 kiểm tra thông báo không đạt**, tiến trình trả mã 1. Đã chạy lại cùng suite trên bản Git trước sửa: cũng 36 đạt và lỗi thông báo tương tự. Log server xác định findUserIdsByInternIds ghép email users/intern_profiles có collation utf8mb4_0900_ai_ci và utf8mb4_unicode_ci không tương thích. Đây là lỗi có sẵn, chưa sửa SQL thông báo trong phạm vi dọn style/error handler. Kiểm tra tải tệp thật và 404 đều đạt.
- permissions.json không thay đổi nội dung; không có tệp test mới còn sót trong uploads. Không dùng hoặc sửa DB của người dùng.

## Dòng dài và phạm vi

printWidth là mục tiêu định dạng, không phải giới hạn cứng. Prettier không tự chia chuỗi SQL/HTML/email literal hoặc comment dài. Số dòng trên 120 ký tự ở bản Git được xử lý lần này: db.js 134 → 65; templates.js 47 → 45; supportRequests.service.js 39 → 0. Các literal còn lại được giữ để tránh đổi nội dung truy vấn/email. Không khẳng định mọi dòng đều dưới 80/120 ký tự.

Chưa chạy toàn bộ các suite API hoặc toàn bộ npm test. Không thay đổi schema, seed hoặc kết quả chương trình trong lần dọn này. Các bước migration US6 vẫn như FIXES_US6.md.

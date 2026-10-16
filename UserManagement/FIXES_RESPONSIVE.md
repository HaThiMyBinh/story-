# Giao diện mobile và màu chủ đạo

## Thay đổi

- `index.html`: ở chiều rộng tối đa 1024px, sidebar chuyển thành menu trượt phủ lên trang; vùng nội dung dùng toàn bộ chiều rộng. Desktop tiếp tục dùng sidebar 272px.
- Nút menu và nút đóng dùng SVG, hoạt động cả khi Font Awesome chưa tải. Có đóng bằng Esc, bấm nền che hoặc chọn trang. Khi menu mở, nền không nhận tương tác; Tab/Shift+Tab ở trong menu, đóng trả focus về nút mở. Các mục menu dùng được bằng Enter/Space.
- Tự cập nhật trạng thái và focus khi đổi giữa mobile và desktop. Không để hiệu ứng chuyển visibility của các nút làm chữ menu xuất hiện trên nội dung khi menu đã đóng.
- Giảm padding trên điện thoại; form và thẻ báo cáo co theo chiều rộng. Bảng rộng cuộn ngang trong vùng riêng. Header tự xuống hàng, bao gồm nút ứng tuyển của vai trò Intern.
- Đăng nhập, đăng ký và màn hình chính dùng cùng `--primary: #2563eb` và `--primary-hover: #1d4ed8`; các liên kết, biểu đồ và viền focus liên quan dùng cùng tông. Giữ màu trạng thái thành công/cảnh báo/lỗi.

## Kiểm tra

- `node tests/run_all.js --unit --browser --only responsive-browser`: đạt. Suite mới được đăng ký trong runner dưới dạng optionalBrowser; có lệnh `npm run test:responsive-browser`.
- Kiểm tra Chromium với viewport 320px, 390px, 768px: nội dung không bị sidebar chiếm chỗ, form không vượt màn hình, bảng báo cáo cuộn được đến cột cuối; menu, Esc, nền che, bàn phím và focus đều hoạt động. Kiểm tra header Intern với nút ứng tuyển ở cả ba kích thước.
- Kiểm tra đổi về desktop 1440px: sidebar trở lại vị trí 0 với chiều rộng 272px, nền nhận tương tác và nút mở mobile được ẩn.
- Kiểm tra cùng màu primary/hover của ba trang và không có lỗi JavaScript chưa bắt. Đã mở ảnh chụp để quan sát màn hình báo cáo 390px, form hồ sơ 390px/768px, menu 390px, header Intern 390px, desktop và trang đăng nhập.
- `test_completion_rate_browser.js`: đạt (5 nhóm kiểm tra); `test_intern_origin_browser.js`: đạt, gồm cuộn ngang ma trận 30 cột.
- Prettier đạt cho Frontend và các tệp test/runner sửa.

Các test dùng HTML thật, API giả lập và chặn tài nguyên ngoài (font/icon CDN). Không kiểm tra điện thoại thật, Safari/Firefox hay toàn bộ các màn hình/role; không chạy lại test API/MySQL trong lần sửa giao diện này. Không thêm dependency hoặc sửa dữ liệu DB. Ảnh kiểm tra nằm ngoài project, không đưa vào ZIP.

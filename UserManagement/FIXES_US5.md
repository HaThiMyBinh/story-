# Kiểm tra và hoàn thiện bản sửa US5

## Đã kiểm tra / sửa
- Giữ ánh xạ các biến thể thô bằng normalizeKey + BINARY IN để số liệu biểu đồ và danh sách dùng cùng quy tắc.
- Sửa thêm nhóm Chưa cập nhật: NULL, rỗng, tab, biến thể dấu/hoa thường/nhiều khoảng trắng đều được khớp theo normalizeKey.
- Giữ data-* đã escape + listener chung; kiểm tra Chromium với tên O'Brien, dấu nháy kép, < và &.
- Giới hạn ba status hợp lệ; groupBy chọn phần dữ liệu tương ứng; sửa thêm /interns trả 400 khi thiếu cả university và major.
- Nhãn phổ biến nhất được tính từ các nhóm SQL BINARY; khóa __proto__/constructor có test đơn vị.
- Esc đóng modal; bảng 30 cột thực sự cuộn ngang trên Chromium (clientWidth=700, scrollWidth=4765, scrollLeft=250).

## Kết quả đã chạy
Trong backend sau npm ci:
- node tests/test_intern_origin_report_unit.js: 24 PASS, 0 FAIL.
- node tests/test_intern_origin_regressions.js: 3 kiểm tra đạt, chạy hàm DB thực với query giả lập; không phải tích hợp MySQL.
- node tests/test_intern_origin_browser.js: kiểm tra renderer/listener thật trong DOM cô lập bằng Playwright + Chromium đạt. Hàm mở modal được thay bằng spy, nên test này không xác nhận request API hoặc toàn bộ luồng đăng nhập.
- ESLint 9 no-unused-vars trên service và bốn tệp test US5 (unit/API/regressions/browser): 0 lỗi.

Test browser cần gói playwright có thể require được và Chromium tại /usr/bin/chromium, hoặc đặt CHROMIUM_PATH. Không thêm phụ thuộc browser vào ứng dụng.

## Bổ sung vòng này
- Đổi SELECT sang ANY_VALUE(...) với GROUP BY BINARY (getInternOriginCounts, getCandidateFunnelByUniversity, listInternsByOrigin) để tương thích ONLY_FULL_GROUP_BY của MySQL 8.
- Frontend: thêm iorIsClickable/iorTriggerAttrs; test browser có thêm kiểm tra nhóm Khác (chưa chạy được ở đây vì thiếu Chromium).

## Chưa xác nhận / giới hạn
- Chưa chạy trên MySQL 8 thật: cần chạy server rồi node tests/test_intern_origin_report_api.js để xác nhận ANY_VALUE + GROUP BY BINARY không lỗi 1055.
- Không có MySQL tại 127.0.0.1:3306 (ECONNREFUSED). Chưa chạy test API tích hợp. Đã thêm assertion status=Foo, groupBy=major và thiếu nhóm vào test API để chạy trên môi trường MySQL theo README.
- Nhóm tổng hợp Khác không có ánh xạ thành viên: frontend không còn cho bấm (biểu đồ, bảng, ma trận); ô ma trận vẫn hiện số. Backend vẫn trả rỗng nếu gọi trực tiếp university/major=Khác.
- Không truy cập hoặc sửa DB cục bộ của người dùng.

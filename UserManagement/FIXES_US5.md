# Kiểm tra và hoàn thiện bản sửa US5

## Đã kiểm tra / sửa
- Giữ ánh xạ các biến thể thô bằng normalizeKey + BINARY IN để số liệu biểu đồ và danh sách dùng cùng quy tắc.
- Sửa thêm nhóm Chưa cập nhật: NULL, rỗng, tab, biến thể dấu/hoa thường/nhiều khoảng trắng đều được khớp theo normalizeKey.
- Giữ data-* đã escape + listener chung; kiểm tra Chromium với tên O'Brien, dấu nháy kép, < và &.
- Giới hạn ba status hợp lệ; groupBy chọn phần dữ liệu tương ứng; sửa thêm /interns trả 400 khi thiếu cả university và major.
- Nhãn phổ biến nhất được tính từ các nhóm SQL BINARY; khóa __proto__/constructor có test đơn vị.
- Esc đóng modal; bảng 30 cột thực sự cuộn ngang trên Chromium (clientWidth=700, scrollWidth=4765, scrollLeft=250).

## Kết quả đã chạy trong lần rà soát mới
- test_intern_origin_report_unit.js: 24 PASS / 0 FAIL.
- test_intern_origin_report_api.js: 33 PASS / 0 FAIL trên MySQL 8.0.46 bật ONLY_FULL_GROUP_BY, DB kiểm thử riêng; xác nhận ANY_VALUE + GROUP BY BINARY và truy vấn chi tiết chạy được.
- test_intern_origin_regressions.js: đạt (DB query mock, không thay cho API tích hợp).
- test_intern_origin_browser.js: đạt sau khi sửa thứ tự dựng dữ liệu trong test. Trước đó test dựng ma trận 30 cột rồi ghi đè bằng ma trận 2 cột trước khi đo cuộn; nay đo đúng ma trận 30 cột. Kiểm tra nhãn có dấu nháy/HTML, Esc, nhóm Khác không bấm được và cuộn ngang.

Browser dùng Playwright/Chromium ngoài ứng dụng, không thêm dependency. Test này kiểm tra renderer/listener thật trong DOM cô lập, không phải toàn bộ luồng đăng nhập/API.

## Bổ sung vòng này
- Đổi SELECT sang ANY_VALUE(...) với GROUP BY BINARY (getInternOriginCounts, getCandidateFunnelByUniversity, listInternsByOrigin) để tương thích ONLY_FULL_GROUP_BY của MySQL 8.
- Frontend: thêm iorIsClickable/iorTriggerAttrs; test browser có thêm kiểm tra nhóm Khác.

## Chưa xác nhận / giới hạn
- Nhóm tổng hợp Khác không có ánh xạ thành viên: frontend không còn cho bấm (biểu đồ, bảng, ma trận); ô ma trận vẫn hiện số. Backend vẫn trả rỗng nếu gọi trực tiếp university/major=Khác.
- Không truy cập hoặc sửa DB cục bộ của người dùng.

Giao diện phễu đã ghi rõ trạng thái thực tập sinh không áp dụng cho ứng viên; chỉ lọc ngày nộp và từ khóa tên trường. normalizeKey gom khác dấu/hoa thường/khoảng trắng, không tự sửa các lỗi chính tả tùy ý.

# Tách Frontend/index.html

## Phạm vi và số liệu

Refactor từ commit `69984ae`, chỉ chuyển CSS/JavaScript và định dạng bằng Prettier. Không đổi tên hoặc logic hàm/biến, handler, id/class hay style inline. Không sửa login.html/register.html, Font Awesome, backend chạy thật, permissions.json, schema, uploads, dependency hoặc lockfile.

| Đo trực tiếp | Trước | Sau |
| --- | ---: | ---: |
| Dòng index.html | 18.584 | 4.900 |
| Byte UTF-8 index.html | 744.794 | 183.428 |
| Khối CSS trực tiếp trong HTML | 1 | 0 |
| Khối JavaScript inline | 1 | 0 |
| Khai báo hàm cấp cao | 424 | 424 |
| Binding let/const cấp cao | 142 | 142 |
| Handler trong HTML tĩnh | 184 | 184 |
| Thuộc tính style trong HTML tĩnh | 289 | 289 |

CSS cũ 70.736 byte, JavaScript inline cũ 492.100 byte. Các số 2 khối style/307 handler/478 style trong yêu cầu là ước lượng: khối `<style>` thứ hai tìm bằng văn bản nằm trong template HTML **trang in**, không phải stylesheet của trang chính. Giữ nguyên template này và cả ba stylesheet tạo động bằng JavaScript. Nếu đếm thô cả các chuỗi HTML sinh động trong source gốc có 325 thuộc tính on* và 487 style; chúng cũng giữ nguyên. Bộ kiểm tra tìm được 212 tên gọi trực tiếp từ handler, gồm cả hàm trình duyệt, không thiếu tên nào.

## File và thứ tự nạp

`Frontend/assets/css/app.css`: **2.946 dòng**, thay đúng vị trí khối style cũ trong head, sau Font Awesome. So sánh CSSOM xác nhận **469 rule cùng nội dung và thứ tự**; chỉ định dạng lại khoảng trắng bên ngoài chuỗi.

Các script dưới `Frontend/assets/js/` nạp theo bảng, ở đúng vị trí script cũ cuối body, đều là **classic script**, không module/import/export/defer/async. Mỗi file JavaScript dưới 1.500 dòng (lớn nhất 809).

| Thứ tự | File | Dòng |
| ---: | --- | ---: |
| 1 | `core.js` | 108 |
| 2 | `meetings.js` | 257 |
| 3 | `report-export.js` | 223 |
| 4 | `navigation.js` | 809 |
| 5 | `accounts.js` | 221 |
| 6 | `applications.js` | 322 |
| 7 | `mentors.js` | 296 |
| 8 | `interns.js` | 537 |
| 9 | `tasks.js` | 612 |
| 10 | `weekly-reports.js` | 667 |
| 11 | `evaluations.js` | 297 |
| 12 | `email.js` | 325 |
| 13 | `documents.js` | 409 |
| 14 | `intern-schedule.js` | 482 |
| 15 | `contracts.js` | 492 |
| 16 | `programs.js` | 501 |
| 17 | `attendance.js` | 294 |
| 18 | `final-reports.js` | 414 |
| 19 | `work-scope.js` | 72 |
| 20 | `attendance-report.js` | 201 |
| 21 | `completion-report.js` | 285 |
| 22 | `origin-report.js` | 478 |
| 23 | `work-schedules.js` | 344 |
| 24 | `notifications.js` | 57 |
| 25 | `leaves.js` | 122 |
| 26 | `allowances.js` | 382 |
| 27 | `support.js` | 524 |
| 28 | `entry.js` | 615 |

Các file trước entry chỉ chứa khai báo hàm. `entry.js` giữ nguyên **147 statement khởi tạo**, gồm các khai báo biến, gắn listener và chèn CSS động, theo thứ tự cũ. Nạp toàn bộ hàm trước rồi mới chạy entry mô phỏng việc hoist hàm của script ban đầu; tránh gọi hàm ở file chưa nạp hoặc biến chưa khởi tạo. Không bọc trong IIFE, không chuyển let/const thành thuộc tính window.

`server.js` hiện dùng `express.static(FRONTEND_DIR)` mặc định: ETag, Cache-Control `public, max-age=0`, không immutable. Đã kiểm tra HTTP 200/MIME/nội dung file và 304 khi gửi If-None-Match cho 28 JS cùng hai CSS được tham chiếu (kể cả Font Awesome). Không thêm hậu tố phiên bản hoặc sửa backend.

## So sánh cơ sở và test đã chạy

Trước sửa đã lưu HTML gốc, AST, tên hàm/biến, handler, log console/pageerror và 12 ảnh HR/Mentor/Intern/Admin × 390/768/1366px vào `/tmp/frontend-split-baseline`. Sau CSS: so sánh đạt rồi mới tách JS. Sau JS:

- AST của **424 hàm** và **147 statement khởi tạo** giữ nguyên; thứ tự khởi tạo giữ nguyên; đủ 227 comment cũ. Chuỗi/template giữ nguyên giá trị, kể cả HTML/CSS bên trong. HTML còn lại giống bản gốc sau khi bỏ thẻ style/script đã chuyển và chuẩn hóa khoảng trắng giữa thẻ.
- Tập hàm trên window giống hệt (1.212 tên, gồm hàm trình duyệt/công cụ test) và đủ 142 lexical binding cho từng vai. Handler hiện có trong DOM và trong toàn bộ source HTML/template đều tìm được hàm toàn cục tương ứng, không thiếu/thừa so với nguồn gốc.
- **12/12 ảnh sau CSS và 12/12 ảnh sau JS: 0 pixel khác**. Không có pageerror hoặc console error/warning mới. Hai thông báo verbose autocomplete sẵn có của Chromium giữ nguyên.
- `node --check`: **211 file JS PASS** (toàn bộ backend ngoài node_modules và JS frontend mới). `prettier --check backend Frontend`: **PASS**. ESLint no-unused-vars cho các tệp test/helper thêm/sửa: **0 lỗi**.
- `npm run test:unit`: **31 suite PASS / 0 FAIL / 0 SKIP**.
- `npm test -- --unit --browser --only browser --only frontend-split`: **6 suite PASS / 0 FAIL / 0 SKIP**: frontend-split mới, intern-origin, meetings, export, responsive, completion-rate. Các kiểm tra nghiệp vụ cũ được giữ nguyên; chỉ thay cách đọc/phục vụ tài nguyên.
- `test_program_completion_browser.js`: **PASS** bằng Chromium/API/MySQL **8.0.46** thật, DB riêng `us6_test_frontend_split`, cờ US6_TEST_DB_ALLOW_WRITES=1, server trong bản sao /tmp. Xác nhận hoàn thành A, khóa lịch sử A, B bắt đầu mới, tỷ lệ 50%, drill-down và escape. Tổng cộng **7 bộ browser** đã chạy và đạt.

Thêm helper `tests/frontend_static.js` phục vụ HTML/assets thật từ đĩa, dùng chung cho sáu browser test cũ; file thiếu trả 404, không rơi vào JSON giả. Intern-origin tiếp tục kiểm tra renderer/listener trong DOM cô lập, đọc CSS và script từ file ngoài. Program-completion vẫn dùng API thật, helper chỉ phục vụ tài nguyên frontend. Thêm `tests/test_frontend_split.js` (optionalBrowser), `frontend_split_fixture.js`, đăng ký trong package.json/run_all.js; đồng thời đăng ký intern-origin-browser vốn trước đây chưa nằm trong runner.

Chạy trong backend:

```sh
npm run test:unit
npm run test:frontend-split
npm test -- --unit --browser --only browser --only frontend-split
```

Browser cần Playwright/Chromium có sẵn, có thể đặt CHROMIUM_PATH; không thêm dependency. Muốn so sánh lại đúng cơ sở của lần chạy này khi /tmp vẫn còn: `FRONTEND_SPLIT_BASELINE_DIR=/tmp/frontend-split-baseline npm run test:frontend-split`. Test sẽ đối chiếu tập hàm/biến, handler, log và byte ảnh. Ảnh/log cơ sở không đưa vào ZIP.

## Giới hạn

Chưa thử Safari/Firefox, điện thoại thật hoặc luồng chạy toàn ứng dụng qua file://. Đã giữ đường dẫn tài nguyên tương đối và classic script; API của hệ thống vẫn cần backend như trước. Không chạy toàn bộ API suite vì không đổi logic backend; đã chạy đủ sáu browser test cũ, test mới và toàn bộ unit. Không cần migration hay cài thêm dependency cho bản refactor này.

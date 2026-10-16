# US6 — Tỷ lệ hoàn thành chương trình

## Bước 0: định nghĩa từ dữ liệu đang có
Đã đọc schema.sql, seed_data.sql và các luồng programs, finalReports, evaluations, attendance, weeklyReports trước khi triển khai.

- intern_profiles.status là VARCHAR, UI và US5 hiện dùng Đang thực tập / Hoàn thành / Tạm dừng. Hoàn thành trong báo cáo này nghĩa là TRIM(status) = Hoàn thành, không tự cập nhật dữ liệu.
- program_interns là quan hệ thành viên HR xếp; listProgramInterns và phạm vi PROGRAM của listFinalReportInterns cũng dùng bảng này. Dùng quan hệ này, không suy ra thành viên từ internship_contracts.program_id. Hồ sơ chưa có quan hệ nằm ở nhóm Chưa cập nhật (chưa xếp chương trình).
- internship_programs.status DRAFT/OPEN/ONGOING/CLOSED là trạng thái chương trình, không phải kết quả từng người.
- final_reports.status DRAFT/FINALIZED là trạng thái tài liệu tổng hợp và snapshot, không phải chứng nhận hoàn thành của từng người.
- intern_evaluations có điểm kỹ năng/thái độ 1–5, không có cột đạt/rớt hoặc ngưỡng hoàn thành. Không tự đặt ngưỡng.
- attendance COMPLETED chỉ là ca đã check-out; weekly_reports SUBMITTED/LATE/MISSING và intern_schedules COMPLETED là tiến độ riêng, không phải kết quả toàn chương trình.
- Schema không có kết quả theo từng cặp program/intern. Vì vậy US6 là tỷ lệ trạng thái hồ sơ hiện tại trong tập thành viên chương trình, không phải kết quả lịch sử độc lập cho từng khóa. Không suy ra hoàn thành từ ngày kết thúc, hợp đồng hay báo cáo được chốt.
- seed_data.sql chỉ nạp vai trò/quyền/ứng viên, không nạp intern_profiles hoặc program_interns. Trên database chỉ có schema + seed này, US6 phải trả tổng 0, tỷ lệ 0.

## Quy tắc thống kê
- Tổng chung và nhóm mentor đếm DISTINCT intern id; nhóm chương trình đếm mỗi người một lần mỗi chương trình. Người thuộc nhiều chương trình được tính ở nhiều nhóm nên tổng các nhóm chương trình có thể vượt tổng chung.
- Đã hoàn thành: status trim đúng Hoàn thành; đang thực tập: đúng Đang thực tập; tạm dừng/không hoàn thành: tất cả trường hợp còn lại. unknownStatus đếm riêng trạng thái ngoài ba trạng thái chuẩn, bao gồm NULL/rỗng, nhưng vẫn nằm trong nhóm chưa hoàn thành. Không tạo trạng thái mới trong DB.
- Tỷ lệ = completed / total * 100, làm tròn 1 chữ số; total=0 trả 0. Sắp xếp theo tỷ lệ giảm dần, hòa theo tên tiếng Việt rồi khóa.
- from/to bao gồm hai đầu và áp dụng DATE(intern_profiles.created_at), giống US5; không phải ngày hoàn thành (không có cột này).
- programId lọc ID thành viên program_interns. q tìm chuỗi literal trong tên/MSSV/trường/mentor/tên chương trình; escape %, _ và backslash. Khi q chỉ khớp tên chương trình, chỉ các quan hệ chương trình khớp mới nằm trong tập kết quả.
- Mentor được nhóm theo mentor_id; tên cũ khi không có mentor_id được gom theo normalizeKey như US5. Thiếu tên được gom Chưa cập nhật. ID/khóa nhóm được dùng cho drill-down, không dùng nhãn tên làm điều kiện lọc.
- Không có nhóm tổng hợp Khác hoặc cắt top-N. Chi tiết lấy đúng tập dữ liệu và quy tắc nhóm của thống kê, phân trang sau khi loại trùng intern id.

## Cấu trúc và API
- backend/routes/completionRate.routes.js → controllers/completionRate.controller.js → services/completionRate.service.js → getCompletionRateRows/getCompletionRatePrograms trong db.js.
- GET /api/reports/completion-rate: programId, status, from, to, q.
- GET /api/reports/completion-rate/interns: các bộ lọc trên + groupBy=program|mentor, groupKey, page, pageSize (1–100). Bắt buộc groupBy/groupKey. Khóa lấy từ kết quả báo cáo, không đoán từ nhãn.
- GET /api/reports/completion-rate/export.csv: cùng bộ lọc với báo cáo; BOM đúng một lần, dùng csvCell hiện có.
- Chỉ HR có VIEW_REPORTS; anonymous 401, Admin/Mentor/Intern 403 dù có quyền khác. Header private, no-store được đặt trước xác thực, cả khi lỗi.
- Report Hub có tab tab-completion-rate, bộ lọc, 5 thẻ tổng quan, bảng kèm thanh tỷ lệ cho chương trình/mentor, modal phân trang, đóng Esc, giữ focus, xuất CSV theo đúng bộ lọc đã áp dụng. Không ghép nhãn vào onclick; dữ liệu được gán textContent/DOM properties, ô bảng dùng escapeHtml.
- Không thêm dependency; package-lock.json, schema.sql và seed_data.sql giữ nguyên. API mới chỉ SELECT, không migration hoặc ghi dữ liệu.

## Tương thích MySQL 8
SQL báo cáo không GROUP BY nên không phụ thuộc việc tắt ONLY_FULL_GROUP_BY. Tham số hóa tất cả bộ lọc, escape LIKE %, _ và backslash.

Khi thử schema gốc trên MySQL 8 mặc định, phát hiện lỗi có sẵn: mentors/users dùng utf8mb4_0900_ai_ci nhưng intern_profiles dùng utf8mb4_unicode_ci, làm initDatabase dừng ở backfillInternMentorIds/syncInternsWithAccounts. Bổ sung COLLATE utf8mb4_unicode_ci vào các phép so sánh tên/email/điện thoại sẵn có trong hai hàm này và COALESCE mentor của US6. Không thêm lệnh ghi hay đổi schema. Đã khởi tạo thành công một DB kiểm thử mới từ schema/seed gốc mà không ALTER collation các bảng, rồi chạy lại API.

## Chạy kiểm thử
Trong backend, sau npm ci:
```sh
npm run test:completion-rate-unit
npm run test:completion-rate-api
node tests/run_all.js --only completion-rate
```
API cần backend và MySQL được cấu hình qua DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME hoặc db_config.json; TEST_PORT/TEST_BASE_URL chọn backend kiểm thử. Nên dùng DB kiểm thử riêng, không có tiến trình ghi đồng thời. Test API chỉ đọc dữ liệu, không tạo/xóa hồ sơ hay sửa quyền. Runner bỏ bước cleanup toàn DB khi chỉ chọn API US6.

Browser là tùy chọn, không tự chạy trong suite mặc định, không thêm Playwright vào package.json. Nếu môi trường đã có Playwright và Chromium:
```sh
npm run test:completion-rate-browser
node tests/run_all.js --only completion-rate --browser
```
Đặt CHROMIUM_PATH nếu Chromium không ở /usr/bin/chromium. Test browser tải toàn bộ index.html thật với API mock; không thay hàm render/mở modal bằng spy.

Fixture bổ sung backend/tests/fixtures/completion_rate_seed.sql chỉ được import thủ công vào DB kiểm thử mới, tuyệt đối không nạp vào DB của người dùng. Sau runtime seed mặc định (1 intern), fixture thêm 7 hồ sơ/3 chương trình/2 mentor. Dùng US6_EXPECT_FIXTURE=1 khi chạy test API để kiểm tra chính xác tổng 8, hoàn thành 3, đang thực tập 3, chưa hoàn thành 2, thiếu trạng thái 1, tỷ lệ 37.5% và các nhóm 1/3, 2/3, 1/1. Không bật biến này trên dữ liệu khác.

## Kết quả thực tế
- MySQL 8.0.46 trong container kiểm thử riêng, bật ONLY_FULL_GROUP_BY, STRICT_TRANS_TABLES, NO_ZERO_IN_DATE, NO_ZERO_DATE, ERROR_FOR_DIVISION_BY_ZERO, NO_ENGINE_SUBSTITUTION.
- Khởi tạo DB mới từ schema.sql + seed_data.sql với client utf8mb4: đạt sau sửa phép so sánh collation nêu trên. SQL seed không có intern; initDatabase sẵn có tự tạo hồ sơ cho tài khoản Intern mẫu, nên baseline runtime có 1 đang thực tập, tỷ lệ 0. API baseline: 51 kiểm tra đạt.
- test_completion_rate_unit.js: 17 test đạt, 0 lỗi/skip. Công thức, làm tròn, trạng thái thiếu, sắp xếp, khóa prototype, validation, CSV injection, phân trang và phân quyền HR thiếu VIEW_REPORTS.
- test_completion_rate_api.js trên DB mới + fixture: 64 kiểm tra đạt, 0 lỗi. Có 200/401/403/400, dữ liệu chuẩn xác, lọc ngày inclusive, ký tự LIKE literal, chart/detail và phân trang, CSV BOM và chống công thức, header cache. Test xác nhận danh sách id/status trong DB không bị thay đổi bởi suite.
- test_completion_rate_browser.js: 4 nhóm kiểm tra đạt, 0 lỗi JavaScript. Report Hub/render, nhãn dấu nháy và <>&, bấm nhóm, phân trang, giữ bộ lọc đã áp dụng, Esc, CSV download/BOM, rỗng/lỗi, phản hồi cũ, HR mất quyền.
- Chạy cả ba suite qua run_all.js --only completion-rate --browser: 3 PASS / 0 FAIL / 0 SKIP.
- Chromium nối backend/DB thật: kiểm tra tỷ lệ 37.5%, bấm nhóm và tổng danh sách, đóng Esc: đạt. Backend kiểm thử dùng initDatabase + app Express thật, không bật tác vụ email/reminder hoặc tự nạp demo.
- 8 suite hồi quy đạt: intern-filter-unit, weekly-reports-unit, evaluations-unit, attendance-unit, final-reports-unit, programs-unit, mentor-assignment-unit, intern-origin-unit.
- ESLint no-unused-vars/no-undef cho 6 tệp JS US6 mới: 0 lỗi. JavaScript inline toàn bộ index.html parse thành công.

## Giới hạn và phạm vi chưa chạy
- Chưa chạy toàn bộ npm test, các API nghiệp vụ khác hoặc tác vụ nền email/reminder. Không kiểm thử trên MySQL/DB cục bộ của người dùng và không sửa/xóa dữ liệu ở đó.
- Không có dữ liệu hoàn thành theo từng cặp chương trình/người và không có ngày hoàn thành. Báo cáo dùng trạng thái hồ sơ hiện tại; một người Hoàn thành thuộc nhiều chương trình sẽ được ghi nhận Hoàn thành trong từng nhóm. Đây là giới hạn mô hình dữ liệu, không tự suy ra ngưỡng điểm/điểm danh.
- Các trạng thái cũ/thiếu không được tự chuyển đổi; vẫn hiện trong nhóm chưa hoàn thành và được đếm cảnh báo riêng.
- Tổng hợp/chi tiết xử lý tập quan hệ thành viên đã lọc trong bộ nhớ để đảm bảo cùng cách đếm. Chưa benchmark tập dữ liệu lớn; không cắt top-N hoặc tạo nhóm Khác.
- Số liệu giữa hai lần truy vấn có thể đổi nếu dữ liệu nghiệp vụ được cập nhật đồng thời.


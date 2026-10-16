# US6 — Kết quả hoàn thành riêng từng chương trình

## Quyết định nghiệp vụ đã chốt
Một người chỉ tham gia một chương trình tại một thời điểm, nhưng sau chương trình A có thể được HR xếp sang B. Vì vậy kết quả phải gắn với từng cặp (program_id, intern_id), không dùng intern_profiles.status. HR xác nhận kết quả riêng từng chương trình; không tự đặt ngưỡng điểm hoặc tự suy ra kết quả từ báo cáo/điểm danh.

Đã đọc schema.sql, seed_data.sql, programs, finalReports, evaluations, attendance và weeklyReports trước thiết kế:
- program_interns là quan hệ thành viên do HR xếp, phù hợp luồng listProgramInterns hiện tại.
- intern_profiles.status là trạng thái hồ sơ toàn cục, không đủ lưu lịch sử A/B.
- internship_programs.status là vòng đời DRAFT/OPEN/ONGOING/CLOSED, không phải kết quả từng người.
- final_reports FINALIZED là chốt tài liệu tổng hợp; điểm evaluations không có ngưỡng đạt; attendance COMPLETED chỉ là ca đã check-out; weekly_reports và intern_schedules là tiến độ riêng.
- seed_data.sql chỉ có vai trò/quyền/ứng viên, không có kết quả chương trình. Không đổi seed_data.sql hoặc tự chuyển trạng thái cũ sang kết quả mới.

## Dữ liệu được bổ sung
Thêm vào program_interns bằng migration cộng thêm, chạy lại được:
- completion_status: IN_PROGRESS (mặc định), COMPLETED, PAUSED, NOT_COMPLETED.
- completed_at: thời điểm HR xác nhận COMPLETED, không nhận ngày do client gửi.
- completed_by: ID HR chốt COMPLETED/NOT_COMPLETED, lấy từ người đăng nhập.
- completion_note: ghi chú tối đa 500 ký tự; NOT_COMPLETED bắt buộc có lý do.
- result_updated_at: thời điểm cập nhật kết quả.
- result_mentor_id/result_mentor_name: chụp mentor khi chốt, để đổi mentor ở B không đổi phân tích kết quả A.

Các lượt cũ được thêm trạng thái mặc định IN_PROGRESS, completed_at/result_updated_at để NULL. Không sao chép trạng thái Hoàn thành ở hồ sơ vào mọi chương trình; HR phải rà soát. Giao diện đếm các lượt chưa có cập nhật kết quả. IN_PROGRESS là lượt chưa chốt, bao gồm cả trường hợp được xếp trước ngày bắt đầu.

## Quy trình HR
1. Đặt đủ ngày bắt đầu/kết thúc chương trình trước khi xếp người.
2. Chương trình thực tập → Thực tập sinh & mentor → cột Kết quả chương trình.
3. Chọn Đang thực tập / Hoàn thành / Tạm dừng / Không hoàn thành, nhập ghi chú và Lưu kết quả. Khi chốt có hộp xác nhận.
4. Chỉ HR có VIEW_REPORTS được ghi kết quả. Chỉ chốt khi chương trình có đủ lịch, đã bắt đầu và có status ONGOING/CLOSED. HR chịu trách nhiệm xác nhận, không tự động đánh giá đạt theo điểm/điểm danh.
5. COMPLETED và NOT_COMPLETED là kết quả đã chốt: không ghi đè; gửi lại cùng trạng thái/ghi chú là idempotent và không đổi thời gian/người chốt. PAUSED có thể quay lại IN_PROGRESS.
6. A được giữ nguyên khi xếp B. Trạng thái hồ sơ và mentor hiện tại thay đổi không ghi đè kết quả A.

Để bảo vệ lịch sử, ứng dụng chặn gỡ thành viên đã chốt, xóa chương trình có thành viên, đổi ngày chương trình có kết quả chốt, xóa hồ sơ/tài khoản Intern có kết quả chốt. Không có quy trình sửa lại kết quả đã chốt trong phiên bản này; cần nghiệp vụ hiệu chỉnh có lưu vết nếu muốn bổ sung sau.

## Một chương trình trong một khoảng thời gian
- Kiểm tra giao hai khoảng ngày, tính cả ngày đầu/cuối. A kết thúc 31/01 thì B bắt đầu 01/02 được; B bắt đầu 31/01 bị 409.
- Áp dụng cả khi thêm lẻ/thêm nhiều và sửa ngày chương trình có thành viên. Một người xung đột làm cả batch không được ghi một phần.
- Dùng lịch chương trình đã đặt, không tự cắt khoảng tại ngày HR bấm hoàn thành sớm. Có thể xếp trước chương trình tương lai nếu lịch không trùng.
- Chưa có đủ ngày ở chương trình mới hoặc lịch chương trình khác chưa rõ thì chặn xếp mới. Dữ liệu cũ trùng/chưa rõ lịch được giữ nguyên, script migration in số lượt cần rà soát, không tự xóa hoặc sửa. Chặn chốt kết quả cho lượt còn lịch trùng/chưa rõ để HR xử lý trước khi khóa lịch sử. Cho phép sửa lịch còn thiếu từng chương trình một, vẫn kiểm tra các khoảng đã xác định.
- Ghi thành viên/kết quả/ngày/xóa được tuần tự bằng MySQL GET_LOCK theo database trước khi mở transaction; khóa tồn tại qua nhiều tiến trình backend. Direct SQL/import hoặc phiên bản backend cũ có thể bỏ qua quy tắc này; khi triển khai cần dừng phiên bản cũ.

## Báo cáo
- Tổng, hoàn thành, đang thực tập, tạm dừng/không hoàn thành và tỷ lệ đều đếm LƯỢT THAM GIA (ID program_interns), chỉ gồm người đã xếp chương trình.
- Số người duy nhất được hiển thị riêng. A hoàn thành + B đang học của cùng một người = 2 lượt, 1 hoàn thành, 1 người duy nhất, tỷ lệ 50%; nhóm A 100%, B 0%.
- Tỷ lệ = completed / total * 100, làm tròn 1 chữ số; total=0 trả 0. Sắp xếp giảm theo tỷ lệ rồi tên.
- Phân tích chương trình và mentor. Mentor của kết quả đã chốt dùng snapshot; lượt chưa chốt dùng mentor hiện tại. Nhãn thiếu được gom Chưa cập nhật; khóa Map an toàn với __proto__/constructor. Không có nhóm Khác.
- from/to lọc chương trình có khoảng ngày giao với khoảng chọn, không còn lọc created_at hồ sơ. Nếu lọc một đầu, đầu còn lại không giới hạn; ngày thiếu không thể xác định giao theo đầu được lọc. Ngày hoàn thành được hiển thị riêng trong chi tiết.
- Có programStatus DRAFT/OPEN/ONGOING/CLOSED; mặc định tất cả, mỗi nhóm hiện trạng thái chương trình. HR chọn CLOSED để xem khóa đã đóng, tránh lẫn khóa đang chạy.
- Drill-down dùng cùng tập dữ liệu/bộ lọc/khóa nhóm với biểu đồ, phân trang theo lượt; hiển thị chương trình, lịch, kết quả, ngày hoàn thành, ID HR chốt và ghi chú.
- CSV có đúng một BOM, dùng csvCell chống công thức/nháy kép. q escape %, _ và backslash, tất cả giá trị lọc tham số hóa. SQL không phụ thuộc việc tắt ONLY_FULL_GROUP_BY.
- UI dùng DOM/textContent và escapeHtml, không ghép dữ liệu người dùng vào onclick. Phễu US5 có ghi chú trạng thái thực tập sinh không áp dụng cho ứng viên.

## API và cấu trúc
- PUT /api/programs/:id/interns/:internId/completion — body {"completion_status":"COMPLETED","note":"HR xác nhận"}; 400 khi sai trường/trạng thái/ghi chú, 404 nếu không phải thành viên, 409 khi kết quả đã chốt hoặc chưa đủ điều kiện.
- GET /api/reports/completion-rate — programId, programStatus, status (nhãn tiếng Việt của kết quả), from, to, q.
- GET /api/reports/completion-rate/interns — cùng bộ lọc + groupBy=program|mentor, groupKey, page, pageSize (1–100).
- GET /api/reports/completion-rate/export.csv — cùng bộ lọc.
- Routes → controllers → services → db.js. Báo cáo và ghi kết quả chỉ HR có VIEW_REPORTS; 401/403/400 được phân biệt, Cache-Control private, no-store.

## Nâng cấp bản đang dùng
Không import lại schema.sql/seed_data.sql vào DB người dùng. schema.sql mới chỉ để dựng DB mới.
1. Giữ bản sao DB và các cấu hình db_config.json/mail_config.json riêng; dừng backend cũ.
2. Thay mã bằng ZIP mới, giữ cấu hình riêng của máy.
3. Trong backend chạy npm ci, rồi npm run migrate:program-completion với cấu hình DB đang dùng (cần quyền ALTER). Script chỉ thêm cột còn thiếu và đọc cảnh báo, không seed tài khoản, không UPDATE/DELETE hồ sơ/thành viên/kết quả cũ. Khi chạy lại không thêm trùng cột.
4. npm start. initDatabase hiện có cũng gọi migration lặp an toàn sau khi tạo bảng program_interns. Các bước seed/sync tài khoản vốn có của ứng dụng không thuộc script migration độc lập.
5. HR rà soát các lượt cũ, lịch trùng/thiếu và xác nhận kết quả từng khóa.

Không thêm dependency; package-lock.json và seed_data.sql giữ nguyên. Playwright chỉ dùng nếu môi trường kiểm thử đã có, không khai báo thêm vào ứng dụng.

## Test tự động và kết quả thực tế
Môi trường kiểm thử riêng MySQL 8.0.46 bật ONLY_FULL_GROUP_BY và STRICT_TRANS_TABLES; không dùng DB cục bộ của người dùng.
- Migration từ schema cũ: chạy lặp, giữ nguyên các trường/bản ghi cũ; hồ sơ cũ Hoàn thành vẫn có kết quả khóa IN_PROGRESS/NULL, không bị suy diễn. Đạt.
- Dựng schema.sql mới + seed_data.sql rồi initDatabase: đạt; kiểm tra 401 và no-store cho endpoint ghi kết quả: đạt.
- test_completion_rate_unit.js: 20 test đạt (công thức, 0, làm tròn, sắp xếp, validation, CSV, ID/khóa nhóm, phạm vi thành viên, kết quả A/B độc lập, body HR).
- test_program_completion_api.js: 26 nhóm kiểm tra đạt. Bao gồm A → B, actor/time/mentor snapshot, idempotent, khóa lịch sử, gỡ/xóa/đổi lịch/xóa hồ sơ và tài khoản bị chặn, PAUSED/resume, NOT_COMPLETED cần lý do, lịch tương lai/thiếu ngày, ngày giao nhau, batch atomic và 2 yêu cầu xếp trùng đồng thời qua 2 tiến trình backend (201 và 409).
- test_completion_rate_api.js: 68 kiểm tra đạt khi có fixture vòng đời; 53 kiểm tra đạt sau dọn fixture. Số kiểm tra phụ thuộc số nhóm/chương trình thực tế. Suite này chỉ đọc, đối chiếu kết quả DB, phân quyền, bộ lọc, ngày chương trình, phân trang, rỗng và CSV.
- test_completion_rate_browser.js: 5 nhóm kiểm tra đạt, toàn bộ index.html với API mock: render, nhãn nháy/<>&, drill-down/phân trang/Esc, CSV, rỗng/lỗi, khóa HR thiếu quyền và xác nhận kết quả.
- test_program_completion_browser.js: đạt với Chromium + API + MySQL thật: HR bấm xác nhận A, A khóa, xếp B, tổng 2 lượt/1 người/50%, A 100% và B 0%, drill-down/nhãn an toàn. Có tệp test để chạy lại, không chỉ kiểm tra thủ công.
- Chạy cả 5 suite qua runner: 5 PASS / 0 FAIL / 0 SKIP.
- Hồi quy programs-unit, program-dates-unit, mentor-assignment-unit, program-mentor-unit, intern-origin-unit: 5 suite đạt. US5 API: 33 PASS / 0 FAIL trên MySQL 8; test browser US5 và DB-query mock đã đạt trong lần rà soát, đã sửa thứ tự dựng dữ liệu đo cuộn ngang.
- ESLint no-unused-vars/no-undef trên 13 tệp liên quan mới/cập nhật: 0 lỗi. Script inline index.html parse được.

Chạy thông thường trong backend:
  npm run test:completion-rate-unit
  npm run test:completion-rate-api
  node tests/run_all.js --only completion-rate

Các test ghi fixture KHÔNG chạy mặc định; chỉ chạy trên DB kiểm thử tên us6_test_* và đặt US6_TEST_DB_ALLOW_WRITES=1:
  npm run test:program-completion-api
  npm run test:program-completion-browser
  node tests/run_all.js --only completion-rate --only program-completion --browser --program-results-write-tests
Đặt TEST_PORT/TEST_BASE_URL và DB_* cho DB/backend kiểm thử; US6_SECOND_BASE_URL cho backend thứ hai nếu kiểm tra qua hai tiến trình. Browser cần Playwright có sẵn và Chromium (/usr/bin/chromium hoặc CHROMIUM_PATH). Test ghi từ chối chạy nếu không có cả cờ cho phép và tên DB thử; chỉ dọn ID do chính test tạo. Runner không gọi global cleanup cho các suite US6 này. Không sửa permissions.json.

## Giới hạn còn lại
Chưa chạy toàn bộ npm test, email/reminder hoặc hệ thống DB của người dùng. Chưa benchmark dữ liệu lớn; tổng hợp/chi tiết dùng tập thành viên đã lọc trong bộ nhớ. Chưa có đánh giá hoàn thành tự động theo điểm/chuyên cần; HR chịu trách nhiệm xác nhận. Báo cáo phản ánh kết quả khóa, không tự khẳng định chất lượng đào tạo chỉ bằng một tỷ lệ. Thống kê giữa hai request có thể đổi nếu dữ liệu nghiệp vụ đang được cập nhật.

# US8 — Lịch họp và email tự động

## Thay đổi

- Thêm module theo routes → controllers → services → db.js, dùng `makeEndpoint`, `HttpError` và handler lỗi chung. HR quản lý toàn bộ; Mentor chỉ xem/thay đổi cuộc họp có toàn bộ người tham dự hiện thuộc mình phụ trách, kể cả cuộc họp HR tạo. Intern chỉ đọc `/api/me/meetings` và chi tiết của mình. Admin không có quyền lịch họp. Không sửa permissions.json.
- Danh sách lọc ngày, trạng thái, từ khóa và phân trang. Ngày lọc tính theo thời gian cuộc họp giao với ngày chọn, giờ Việt Nam. Từ chối tham số lạ/lặp, ngày sai, phân trang vượt giới hạn. Tiêu đề tối đa 200 ký tự, mô tả 4.000, 1–200 người hợp lệ không trùng, thời lượng tối đa 12 giờ; link HTTP/HTTPS không chứa thông tin đăng nhập. Không sửa/hủy cuộc họp đã bắt đầu hoặc đã hủy. Nếu chọn chương trình thì người tham dự phải thuộc chương trình đó.
- Cuộc họp, thành viên và email chờ gửi được ghi cùng transaction; worker chỉ chạy sau commit. `request_key` chống tạo trùng khi gửi lại cùng yêu cầu. SQL tham số hóa, escape LIKE; không dùng GROUP BY phụ thuộc chế độ SQL.
- Mời khi tạo/thêm người; cập nhật khi đổi giờ/địa điểm/link; hủy khi hủy họp hoặc bỏ người. Chỉ đổi tiêu đề/mô tả/chương trình hoặc lưu y nguyên không sinh email mới. Thêm người không làm mất thư đang chờ của người còn lại. Snapshot lưu đủ dữ liệu để dựng lại đúng nội dung sau restart; `_rebuildJob` chọn rõ từng loại, loại lạ bị chặn, không biến thành thư từ chối.
- Email từng người có PENDING/RETRYING/SENT/FAILED. SMTP thiếu/lỗi không làm API tạo/sửa/hủy thất bại. Giữ retry 5/15/45 giây và hạn mức bốn lượt tự động. HR gửi lại từ nhật ký; HR/Mentor gửi lại trong cuộc họp thuộc phạm vi của mình. Gửi lại chạy nền, có kiểm tra người nhận/sự kiện còn hợp lệ và khóa nhận việc trong DB để tránh hai worker cùng gửi. Email thiếu/sai được ghi FAILED, không gửi.
- Nhắc 24 giờ/1 giờ qua reminders.service, kiểm tra mỗi phút, khóa chống trùng lưu DB theo cuộc họp/phiên bản/mốc/người nhận. Nếu hệ thống hoạt động trở lại trong giờ cuối thì chỉ tạo mốc gần nhất. Sửa lịch tạo phiên bản mới; email sự kiện đã lỗi thời bị chặn. Có thông báo trong ứng dụng qua internNotify, cùng khóa chống trùng. Người chưa có tài khoản không nhận được thông báo trong app; việc gửi email vẫn độc lập.
- Email tiếng Việt có HTML đã escape, text, subject loại ký tự điều khiển và `.ics`: UID ổn định, SEQUENCE, REQUEST/CANCEL, TZID Asia/Ho_Chi_Minh, escape và gập dòng UTF-8. Giờ nhập không có hậu tố được hiểu là giờ Việt Nam; API cũng nhận +07:00 hoặc Z.
- Giao diện “Lịch họp” cho HR/Mentor, “Lịch họp của tôi” chỉ đọc cho Intern; modal tạo/sửa, tìm/chọn người, hủy có xác nhận, trạng thái email và gửi lại. Có Esc/focus trap, lỗi dễ hiểu, bảng cuộn ngang. Nhật ký HR hiển thị/lọc đủ bốn loại email mới và xử lý nhãn lạ an toàn. Dùng màu/tài nguyên cục bộ hiện có, không thêm dependency.

## Migration và chạy

Giữ cấu hình DB/email riêng. Trong `backend`: `npm ci`, dừng backend cũ, chạy `npm run migrate:meetings`, sau đó `npm start`. Không import lại schema/seed vào DB đang có. Migration cũng được gọi trong initDatabase; script riêng chỉ nâng schema, không nạp dữ liệu mẫu hay đồng bộ hồ sơ.

Migration thêm `meetings`, `meeting_attendees` và mở rộng email_logs: bốn giá trị ENUM mới (giữ giá trị cũ), meeting_id/intern_id nullable, snapshot, event_key duy nhất, cờ thông báo, thời điểm thử lại và khóa worker có hạn. application_id của email họp là NULL. Chạy lại không tạo trùng và không sửa/xóa bản ghi nghiệp vụ. schema.sql đồng bộ cho cài mới. Không thay đổi dữ liệu DB của người dùng hoặc backend/uploads.

## Kiểm thử đã chạy

Môi trường: Node.js, MySQL **8.0.46** riêng (`us8_test_meetings`), SMTP giả lập loopback bằng smtp-server; server chạy trong bản sao `/tmp`, chặn SMTP ngoài môi trường test.

- `npm run test:unit`: **31 suite PASS / 0 FAIL / 0 SKIP**, gồm bảy nhóm US8 về validate, múi giờ, phát hiện thay đổi/thành viên, email/ICS/escape/subject, khóa nhắc, dựng lại mọi template và migration lặp.
- `test_meetings_api.js`: **PASS**. RBAC/IDOR HR/Mentor/Intern/Admin, rollback người không tồn tại, giờ Việt Nam, POST đồng thời cùng request_key, thông báo app, thiếu SMTP vẫn 201, khôi phục job bằng server thứ hai, MIME thực của mời/cập nhật/hủy và `.ics`, không gửi khi chỉ sửa mô tả/không đổi, thêm/bỏ người, retry đúng template, SMTP 550 và 451 (thực sự chờ backoff đầu 5 giây), gửi lại không chờ SMTP chậm, hai yêu cầu gửi lại đồng thời chỉ gửi một thư, ngăn retry sự kiện cũ, cuộc họp quá giờ, nhắc 24h/1h không trùng khi chạy lại tiến trình và migration hai lần. Không chờ thực tế cả backoff 15/45 giây.
- Hồi quy API: **PASS** cho `test_email_api.js`, `test_applications.js`, `test_review_documents_api.js`, `test_support_requests_api.js`, `test_work_schedule_api.js` (**105 PASS / 0 FAIL**, có nghỉ phép), `test_final_reports_api.js` (**31 PASS / 0 FAIL**).
- `test_meetings_browser.js`: **PASS**, Chromium/Playwright, HTML thật với API fixture cô lập, không ghi DB: HR/Mentor/Intern ở **390/768/1366px**, không tràn trang, dữ liệu dấu nháy/HTML hiển thị an toàn, tạo/sửa/hủy/gửi lại, chỉ đọc và Esc; Admin không có menu. Đã xem ảnh modal 390px để xác nhận bố cục/cuộn.
- Hồi quy browser xuất báo cáo và responsive: **PASS** (cùng meetings-browser: **3 suite PASS / 0 FAIL / 0 SKIP**). `prettier --check backend Frontend`: **PASS**. ESLint `no-unused-vars` cho các tệp JS thêm/sửa: **0 lỗi**.
- Đã đăng ký unit/API/browser trong package.json và tests/run_all.js. API cần `--meeting-write-tests`; browser là optionalBrowser và cần Playwright/Chromium có sẵn (CHROMIUM_PATH nếu cần), không thêm dependency ứng dụng.

Chạy unit/browser trong backend:

```sh
npm run test:unit
npm run test:meetings-browser
# Hoặc qua runner:
node tests/run_all.js --unit --browser --only meetings-browser
```

API test ghi fixture nên **chỉ chạy trong bản sao backend với cấu hình test riêng**, không có SMTP thật, DB tên bắt đầu `us6_test_`, `us7_test_` hoặc `us8_test_`, đặt `US8_TEST_DB_ALLOW_WRITES=1`. Backend phải chạy cùng DB thử; đặt TEST_BASE_URL trỏ backend đó và MEETINGS_TEST_RUNTIME_DIR trỏ thư mục backend bản sao để test khởi động server thứ hai. Test thay cấu hình SMTP trong bản sao bằng SMTP loopback, tạo và xóa đúng fixture của lượt chạy. Sau khi thiết lập biến môi trường, chạy `npm run test:meetings-api` hoặc `node tests/run_all.js --only meetings-api --meeting-write-tests`. Không chạy các API regression ghi dữ liệu trên DB người dùng.

## Giới hạn

Chưa thử SMTP nhà cung cấp thật, nhập `.ics` trong Outlook/Google Calendar, Safari/Firefox hoặc điện thoại thật. Không chạy toàn bộ các API khác của dự án. Browser dùng API fixture; API riêng đã kiểm tra MySQL và SMTP thật ở loopback.

Khóa sự kiện và lease chống gửi trùng khi tạo job/chạy nhiều worker bình thường. SMTP không có giao dịch chung với DB: nếu tiến trình chết sau khi SMTP nhận thư nhưng trước khi ghi SENT, lần phục hồi có thể gửi lại. Message-ID ổn định giúp nhận diện; không khẳng định exactly-once ở phía hộp thư. Email đang được SMTP xử lý cũng không thể thu hồi khi HR sửa lịch đồng thời; bản cập nhật/hủy có phiên bản mới sẽ được xếp hàng.

# US7 — Xuất Excel và in PDF

## Thay đổi

- Thêm `GET /final-reports/:id/export.xlsx`, `/attendance/report/export.xlsx`, `/reports/completion-rate/export.xlsx`, `/reports/interns-by-origin/export.xlsx`. Giữ kiến trúc routes → controllers → services → db.js, dùng `makeXlsxEndpoint`/`sendError` chung trong endpoint.js và HttpError/publicError. Chỉ HR có VIEW_REPORTS được xuất; có MIME XLSX, filename ASCII + filename* UTF-8, ngày xuất và `Cache-Control: private, no-store` cả khi chưa đăng nhập.
- Mỗi báo cáo có một projection trong `services/export/reportModels.js`, chứa tiêu đề, thời điểm xuất giờ Việt Nam, bộ lọc và các bảng. Endpoint JSON hiện có trả thêm `data.exportModel`; Excel và trang in cùng dùng projection này. Không đưa nguyên DB row, hash mật khẩu, token, đường dẫn tệp hoặc lịch sử gửi nội bộ vào projection.
- `services/export/xlsx.js` dùng chung cho cả bốn báo cáo: mỗi bảng một sheet, tên hợp lệ/không trùng, tiêu đề, metadata, header có nền, freeze, auto filter, độ rộng, wrap, viền, tổng, giá trị number/percent/date đúng kiểu. Chuỗi lưu thành text; không truyền object formula/hyperlink vào ExcelJS. Giới hạn 10.000 dòng tổng các bảng, 100 cột/bảng, 250.000 ô và 20 sheet; vượt giới hạn trả 400 để thu hẹp bộ lọc.
- Giữ nguyên các hàm dựng CSV, không chuyển CSV qua mô hình mới. Đã đối chiếu source exportCsv/toCsv/csvCell với commit trước sửa: không đổi. Báo cáo cuối kỳ tiếp tục cho xuất DRAFT bằng dữ liệu sống và FINALIZED bằng snapshot, đúng điều kiện CSV. Trường/ngành tiếp tục xuất đủ các chiều như CSV dù màn hình chọn một chiều; metadata ghi rõ điều này. Phễu ứng viên không áp dụng trạng thái thực tập sinh.
- Bốn màn hình có nút chữ “Xuất Excel”, “Xuất PDF” cạnh CSV. Một helper fetch/Authorization/blob đọc Content-Disposition phục vụ cả tải Excel và CSV; một helper in iframe dùng JSON hiện có, escape dữ liệu, A4, tự chuyển ngang khi trên 6 cột, lặp header, tránh cắt dòng và có số trang. Nút có trạng thái chờ, báo lỗi và được mở lại sau thao tác. Iframe được dọn sau afterprint, sau khi trở lại cửa sổ hoặc bằng timeout dự phòng; khôi phục tiêu đề trang sau in.
- **PDF do trình duyệt tạo**: chọn “Xuất PDF”, rồi chọn “Lưu thành PDF” trong hộp thoại in. Không có endpoint `.pdf` trên server. Tiêu đề tài liệu in có ngày xuất để gợi ý tên file.

## Dependency và tài nguyên

Chỉ thêm một dependency trực tiếp chạy thật: **exceljs 4.4.0**, ghim chính xác trong package.json và cập nhật package-lock.json. Chọn bản ổn định có sẵn API tạo/đọc XLSX, kiểu ô, style, freeze, buffer; không cần thư viện PDF. Phiên bản các gói đã có trong lockfile không đổi. ExcelJS có các dependency bắc cầu theo lockfile; không thêm thư viện PDF/browser vào ứng dụng.

Bộ Font Awesome **6.4.0 đã dùng trước đây** được chuyển từ CDN sang `Frontend/assets/fontawesome/`, kèm LICENSE.txt. Ba trang bỏ link Google Fonts và dùng font hệ thống khi máy không có Roboto. Không cần CDN lúc chạy, kể cả trang in. Tài nguyên vendor giữ nguyên định dạng gốc và được bỏ qua bởi Prettier.

## Chạy và kiểm thử

Chạy trong `backend`: `npm ci`, cấu hình MySQL theo project rồi `npm start`. US7 không cần migration/schema/seed mới và không sửa permissions.json hay dữ liệu DB người dùng.

- `npm run test:unit`: **30 suite PASS, 0 FAIL, 0 SKIP**. Gồm test_export_unit.js với 5 nhóm: đọc lại cả bốn mô hình bằng ExcelJS, tiếng Việt/ký tự đặc biệt, số/phần trăm/ngày, rỗng/nhiều sheet/1.500 dòng, formula injection, tên sheet/file, giới hạn, HTTP lỗi an toàn và HR thiếu VIEW_REPORTS (mock đọc quyền, không ghi file).
- `npm run test:export-api`: **PASS** trên MySQL **8.0.46**, DB riêng `us7_test_exports`. Kiểm tra HR 200, chưa đăng nhập 401, Admin/Mentor/Intern 403, tham số sai/lặp 400, báo cáo không tồn tại 404, header, đọc lại workbook, bộ lọc và đối chiếu tổng/dòng với CSV. API test mặc định chỉ đọc; cần ít nhất một báo cáo cuối kỳ. Nếu DB thử riêng chưa có báo cáo, có thể dùng `US7_TEST_DB_ALLOW_WRITES=1` với tên DB bắt đầu bằng us6_test_/us7_test_: test chỉ tạo một DRAFT và xóa đúng fixture đó khi xong. Lần chạy này dùng tùy chọn ấy. Server kiểm thử chạy trong bản sao ở /tmp để không ghi vào uploads của project.
- `npm run test:export-browser`: **PASS**, Chromium/Playwright với JSON/XLSX giả lập: 12 lượt tải Excel và 12 trang in trên 390/768/1366px; kiểm tra tên file, nút, Authorization/bộ lọc, nội dung/escaping, lỗi 403/500/in thất bại, khóa/mở nút và dọn iframe. Chặn window.print thật, không mở hộp thoại hệ điều hành. Test không gọi tài nguyên ngoài.
- Test responsive, completion-rate-browser và intern-origin-browser: **PASS**; gồm CSV/BOM, drill-down, bàn phím/modal và ma trận cuộn ngang 30 cột.
- Kiểm tra in riêng bằng Chromium với 150 dòng: tạo PDF thử 6 trang, pdftotext xác nhận header lặp 6 lần và số “Trang 1 / 6” đến “Trang 6 / 6”. Đây là kiểm tra bằng browser headless, không phải thử hộp thoại in thật.
- `prettier --check backend Frontend`: **PASS**. Các test mới đã đăng ký trong tests/run_all.js và package.json; browser cần Playwright/Chromium sẵn trong môi trường (có thể đặt CHROMIUM_PATH), không thêm chúng vào dependency ứng dụng, và là optionalBrowser (`node tests/run_all.js --unit --browser --only export-browser`).

## Giới hạn đã biết

Chưa mở XLSX bằng Excel hoặc LibreOffice thật; đã đọc lại bằng ExcelJS. Chưa chạy toàn bộ các API suite/npm test, Safari/Firefox, điện thoại thật hoặc thao tác lưu PDF trong hộp thoại thật. Số trang dùng CSS @page margin boxes đã kiểm tra trên Chromium; hỗ trợ ở trình duyệt khác tùy phiên bản. Không đóng gói node_modules hoặc cấu hình chứa mật khẩu.

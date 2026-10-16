# Rà soát bản bàn giao

Đã loại 10 tệp mẫu test khỏi backend/uploads trong bản đóng gói; giữ các tệp demo có thật và .gitkeep. Không thay đổi DB.

Tệp permissions.json có nội dung trùng bản US5 gốc và đúng quyền mặc định: HR có VIEW_REPORTS, Admin không có VIEW_REPORTS. Giữ nguyên tệp; thời gian sửa không chứng minh quyền bị thay đổi.

Danh sách tệp test đã loại:
- 11d888ed-13ac-4f4e-8e90-5bc9c03d63dc
- 507d4b13-e4eb-40b1-8e71-326449a1dcdd
- 7619bdd3-6ad5-45c8-bae2-50e5175aae26
- 5383fe16-cb4e-4af0-b846-be1376e27ce3
- eb1a6bad-cfd2-44e1-a74d-f32280835798
- 0dc5f4a4-c66c-4879-bebc-97fbb28f1e08
- 9731dd10-0ffc-48e4-b612-940ae8ea0350
- 53305f47-c719-4a64-a9dd-aa58115cf54b
- 95d8db3a-3716-4a00-9cb4-7290cb00a129
- c7d08620-4268-4d06-b2f5-6e9ff2688c39

Bản kết quả theo chương trình giữ phần dọn này. Các test US6 mới không ghi tệp vào uploads hoặc thay permissions.json. Không thêm dependency, không đóng gói node_modules/cấu hình mật khẩu.

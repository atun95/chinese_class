# Hướng Dẫn Sử Dụng - Quản Lý Lớp Học Tiếng Trung Online (ZhongWen Class)

Phần mềm được thiết kế dành riêng cho **Giáo viên dạy Tiếng Trung Online** với giao diện **tinh tế, đơn giản, dễ nhìn, không lòe loẹt**, tập trung tối đa vào hiệu quả giảng dạy và quản lý học phí.

---

## 🚀 Cách Mở Ứng Dụng Nhanh Nhất
1. **Cách 1 (Đơn giản nhất)**: Nhấp đúp chuột trực tiếp vào file **`index.html`** trên máy tính để mở trên trình duyệt (Google Chrome, Cốc Cốc, Microsoft Edge, Safari,...).
2. **Cách 2**: Chạy qua máy chủ nội bộ (nếu muốn chia sẻ mạng nội bộ hoặc điện thoại):
   ```bash
   python -m http.server 8080
   ```
   Sau đó mở trình duyệt truy cập: `http://localhost:8080`

---

## ✨ Các Chức Năng Nổi Bật

### 1. Góc Giáo Viên (Dành Cho Thầy)
- **Thống Kê Tổng Quan**: Hiển thị nhanh số lớp đang dạy, tổng sĩ số học viên, số buổi đã dạy trong tháng, tổng doanh thu học phí dự thu và thực thu.
- **Quản Lý Lớp Học**:
  - Tạo lớp mới theo cấp độ: HSK 1, HSK 2, HSK 3, HSK 4, HSK 5-6, Giao tiếp thực chiến.
  - Cài đặt thời gian học: Thứ trong tuần, khung giờ học (VD: 19:30 - 21:00).
  - Tích hợp **Link phòng học Online 1-click** (Zoom, Google Meet, Voov Meeting).
  - Chọn cách tính học phí: **Theo từng buổi học** hoặc **Trọn gói cố định theo tháng**.
  - Quản lý danh sách học viên theo từng lớp (kèm Tên tiếng Hán, SĐT, Ngày vào học, Ghi chú mục tiêu học tập).
- **Điểm Danh & Tự Động Tính Tổng Buổi Học**:
  - Ghi nhận buổi học: Ngày học, chủ đề bài học tiếng Trung, bài tập về nhà.
  - Điểm danh học viên (Có mặt / Vắng).
  - **Hệ thống tự động cộng dồn số buổi học thực tế** của từng học viên vào bảng học phí hàng tháng.
- **Quản Lý & Tự Tính Học Phí Hàng Tháng**:
  - Tự động nhân số buổi đã học với đơn giá (hoặc áp dụng gói tháng).
  - Phân loại rõ ràng: *Đã hoàn thành*, *Chưa nộp*, *Nộp thiếu*.
  - Nút **"Nộp phí"** để cập nhật số tiền học viên nộp.
  - Nút **"Nhắc Zalo"**: Tự động soạn sẵn tin nhắn nhắc học phí lịch sự, đầy đủ số buổi, số tiền và thông tin tài khoản ngân hàng để thầy chỉ cần bấm gửi qua Zalo.
  - Nút **"Xuất Bảng Excel/CSV"** để lưu trữ hoặc in ấn.
- **Lịch Dạy & Thời Khóa Biểu Dạng Lịch (Calendar & Sticky Notes)**:
  - Thiết kế dạng **Lịch tường / Google Calendar** trực quan với 7 cột từ Thứ Hai (周一) đến Chủ Nhật (周日).
  - Từng ngày có ca học sẽ được dán **Note ghi chú** mềm mại, nhã nhặn:
    - Hiển thị khung giờ học (VD: ⏰ 19:30).
    - Tên lớp và màu sắc phân biệt theo cấp độ HSK.
    - Huy hiệu: **✓ Đã học** (kèm tóm tắt nội dung bài học) hoặc **⏱️ Lịch học sắp tới**.
  - **Nhấp vào ngày hoặc Note trên lịch**: Mở bảng xem chi tiết toàn bộ các ca dạy trong ngày, vào phòng học online hoặc mở điểm danh nhanh 1-click.
  - Hỗ trợ chuyển đổi linh hoạt giữa **[Lịch Tháng 📅]** và **[Lịch Tuần 📆]**, nút chuyển tháng `<` `>` và nút quay về **"Hôm nay"**.
  - Bộ lọc xem theo từng lớp học riêng biệt.
- **Cài Đặt STK & Thầy Giáo**: Cài đặt tên thầy, số tài khoản nhận học phí, ngân hàng để học viên tự xem khi tra cứu.
- **Sao Lưu & Khôi Phục (Backup/Restore)**: Xuất toàn bộ dữ liệu ra file `.json` để mang sang máy khác dùng mà không lo mất dữ liệu.

---

### 2. Cổng Tra Cứu Dành Cho Học Viên
- Học viên chỉ cần nhập **Số điện thoại** hoặc **Mã học viên**:
  - Xem ngay lớp học và link Zoom/Meet vào lớp.
  - Xem tổng số buổi đã tham gia, lịch sử các bài học gần nhất và bài tập về nhà thầy giao.
  - Xem tình trạng học phí tháng này (Đã nộp đủ hay chưa, số tiền cần nộp, số tài khoản của thầy để chuyển khoản).

---

## 💾 Lưu Trữ Dữ Liệu
- **Local**: Tự động lưu trên trình duyệt (`localStorage`).
- **Đám mây (Google Firebase Firestore)**: Bấm **☁️ Đám Mây** để cấu hình `firebaseConfig`. Dữ liệu lưu vĩnh viễn trên đám mây của Google, **không bao giờ bị tự động tạm dừng/hết hạn** như Supabase free tier. Quy tắc bảo mật xem tại [`firestore.rules`](firestore.rules).
- **Streamlit Cloud**: Thêm `FIREBASE_CONFIG` trong App settings → Secrets — xem [`.streamlit/secrets.toml.example`](.streamlit/secrets.toml.example).
- **Sao lưu file**: Biểu tượng **Download** ở góc trên để xuất `.json` dự phòng về máy bất cứ lúc nào.

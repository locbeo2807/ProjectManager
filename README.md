
# Handover - Hệ thống Quản lý Bàn giao & Dự án

## 1. Giới thiệu
Handover là hệ thống quản lý dự án, bàn giao, công việc, tài liệu, chat và thông báo realtime, hỗ trợ teamwork tối ưu cho doanh nghiệp phần mềm.

## 2. Tính năng nổi bật
- Đăng ký, đăng nhập, xác thực 2 lớp (2FA) qua email (SendGrid).
- Quản lý người dùng, phân quyền (PM, BA, Developer, QA Tester, QC, Scrum Master, DevOps Engineer, Product Owner).
- Quản lý dự án, module, release, sprint, task, tài liệu, lịch sử thay đổi.
- Quản lý nhân sự tham gia từng dự án/sprint/task.
- Chat nhóm, chat cá nhân, thông báo realtime qua Socket.IO.
- Upload tài liệu qua Cloudinary, quản lý file theo từng module/sprint/task.
- Lưu lịch sử hoạt động, nhật ký thay đổi chi tiết.
- Thông báo realtime khi có sự kiện liên quan (giao việc, cập nhật, review, ...).
- Hỗ trợ refresh token, bảo mật JWT, session timeout, kiểm soát đăng nhập đa thiết bị.

## 3. Quy trình Workflow

### 3.1 Luồng Task (Feature/Task)
```
Hàng đợi → Chưa làm → Đang làm → Đang xem xét → Kiểm thử QA → Sẵn sàng phát hành → Hoàn thành
```

**Quy trình chi tiết:**
- **Hàng đợi**: Task mới được tạo, chờ phân công (PM, BA)
- **Chưa làm**: Đã được phân công, chờ bắt đầu làm (Developer)
- **Đang làm**: Developer đang thực hiện (Developer)
- **Đang xem xét**: Hoàn thành coding, chờ reviewer xem xét (Developer)
- **Kiểm thử QA**: Đã code xong, chuyển QA test (QA Tester)
- **Sẵn sàng phát hành**: QA đã kiểm thử pass (DevOps Engineer, PM)
- **Hoàn thành**: Deploy thành công (DevOps Engineer, PM)

### 3.2 Luồng Bug
```
Mới → Đang xác nhận → Đang sửa → Kiểm thử lại → Đã đóng
```

**Quy trình chi tiết:**
- **Mới**: Bug được báo cáo (QA Tester, BA)
- **Đang xác nhận**: BA/QA đang xác nhận bug (BA, Developer)
- **Đang sửa**: Developer đang fix bug (Developer)
- **Kiểm thử lại**: Chờ QA test lại (QA Tester)
- **Đã đóng**: Bug đã được fix (QA Tester, BA)

### 3.3 Workflow Kinh doanh (BA)
Đối với các task loại Feature, cần hoàn thành workflow BA trước khi đóng task:
- BA Confirm Requirements: Business Analyst xác nhận yêu cầu rõ ràng
- BA Approve UI/UX: Business Analyst phê duyệt thiết kế giao diện
- BA Accept Feature: Business Analyst chấp nhận tính năng hoàn thành

### 3.4 Review Process
Sau khi task hoàn thành:
- **Chưa**: Chưa được review
- **Đạt**: Review pass, task thành công
- **Không đạt**: Review fail, task cần làm lại

### 3.5 Quy tắc nghiệp vụ
- Acceptance Criteria bắt buộc cho Feature tasks
- Business Workflow phải hoàn thành trước khi đóng Feature task
- Reviewer không thể là Assignee
- Dependencies phải hoàn thành trước khi đóng task con
- Bắt buộc upload file completion (PDF/Word) khi đóng task

## 3. Công nghệ sử dụng
### Backend:
- Node.js, Express.js, MongoDB (Mongoose)
- Socket.IO (realtime chat, notification)
- JWT, xác thực 2 lớp, phân quyền middleware
- Cloudinary, Multer (upload file)
- SendGrid (gửi email OTP)
- Các thư viện: bcryptjs, dotenv, cors, morgan, archiver, joi, ...

### Frontend:
- ReactJS (CRA), React Router, Context API
- Material UI (MUI), React Toastify, Framer Motion
- Axios (interceptor refresh token, tự động redirect khi hết hạn)
- Socket.IO Client (realtime chat, notification)
- Dayjs, date-fns (xử lý ngày giờ)

## 4. Cấu trúc dự án
```
Project/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Xử lý logic API (auth, user, project, sprint, ...)
│   │   ├── models/           # Định nghĩa schema MongoDB (User, Project, Sprint, ...)
│   │   ├── routes/           # Định nghĩa các endpoint API
│   │   ├── services/         # Xử lý nghiệp vụ (service layer)
│   │   ├── middleware/       # Xác thực, phân quyền, upload, ...
│   │   ├── utils/            # Tiện ích (email, error, token, ...)
│   │   ├── socket.js         # Socket.IO server (realtime)
│   │   ├── app.js, index.js  # Khởi tạo app, server
│   ├── package.json, Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # Giao diện (chat, popup, layout, ...)
│   │   ├── pages/            # Các trang chính (Dashboard, Login, Projects, ...)
│   │   ├── api/              # Gọi API backend, interceptor
│   │   ├── contexts/         # React Context (Auth, Notification, Chat)
│   │   ├── utils/            # Tiện ích (socket, ...)
│   │   ├── asset/            # Ảnh, icon
│   │   ├── App.js, index.js  # Khởi tạo app
│   ├── public/, package.json, Dockerfile
├── docker-compose.yml        # Chạy cả frontend & backend bằng Docker
├── README.md
```

## 5. Hướng dẫn cài đặt & chạy
### Yêu cầu:
- Node.js >= 16
- MongoDB >= 4.x (local hoặc MongoDB Atlas)
- (Tùy chọn) Docker

### Cài đặt thủ công
#### Backend
```bash
cd backend
npm install
# Tạo file .env từ .env.example và cấu hình biến môi trường (MONGODB_URI, JWT_SECRET, ...)
npm run dev   # hoặc npm start
```
#### Frontend
```bash
cd frontend
npm install
npm start
```
- Truy cập: http://localhost:3000

#### MongoDB
- Cài đặt và chạy MongoDB local hoặc cloud (MongoDB Atlas).
- Cấu hình URI trong file `.env` backend.

### Chạy bằng Docker (khuyên dùng)
```bash
docker-compose up
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Lệnh npm tổng hợp (từ thư mục gốc)
```bash
npm run install-all   # Cài đặt cả frontend & backend
npm start             # Chạy đồng thời cả frontend & backend (dev mode)
npm run build         # Build frontend production
```

## 6. Biến môi trường cần thiết (backend/.env)
- `MONGODB_URI`: Kết nối MongoDB
- `JWT_SECRET`, `JWT_AUDIENCE`, `JWT_ISSUER`: Bảo mật JWT
- `SENDGRID_API_KEY`, `SENDGRID_FROM`: Gửi email OTP
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Upload file

## 7. Một số file/thư mục quan trọng
- **backend/src/controllers/**: authController.js, projectController.js, sprintController.js, ...
- **backend/src/models/**: User.js, Project.js, Sprint.js, Notification.js, ...
- **backend/src/routes/**: authRoutes.js, projectRoutes.js, sprintRoutes.js, ...
- **frontend/src/components/**: SprintDetailSection.js, ProjectOverview.js, NewTaskPopup.js, ...
- **frontend/src/pages/**: Login.js, Register.js, Projects.js, ProjectDetail.js, Users.js, Dashboard.js

## 8. Ghi chú
- Hệ thống hỗ trợ realtime cho mọi thay đổi liên quan sprint, task, notes, file, nhân sự, chat.
- Notification realtime, UX tối ưu cho teamwork.
- Có thể mở nhiều tab/trình duyệt để test realtime.
- Dễ dàng mở rộng thêm module mới, tích hợp CI/CD (Jenkinsfile), Docker hóa toàn bộ hệ thống.

---

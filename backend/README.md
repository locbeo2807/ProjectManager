# 🎯 API Quản Lý Dự Án Doanh Nghiệp - Enterprise Edition

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-blue)](https://mongodb.com)
[![Express](https://img.shields.io/badge/Express-4.18+-black)](https://expressjs.com)

**API quản lý dự án cấp doanh nghiệp với workflow nâng cao, cập nhật thời gian thực và phân quyền toàn diện.**

## ✨ Tính Năng Chính

### 🚀 **Workflow Hoàn Thành Task**
- **Hoàn Thành Dựa Trên File**: Tasks yêu cầu upload file công việc/PDF review trước khi đánh dấu "Hoàn thành"
- **Quyền Truy Cập Reviewer**: Quyền truy cập file bảo mật cho người được giao, reviewer, PM và BA
- **Thông Báo Tự Động**: Thông báo thời gian thực khi có file hoàn thành được upload
- **Cập Nhật Tiến Độ Tự Động**: Cập nhật tiến độ tự động từ Task → Module → Project

### 👥 **Hệ Thống Vai Trò Chuyên Nghiệp**
- **8 Vai Trò Doanh Nghiệp**: PM, BA, Developer, QA Tester, QC, Scrum Master, DevOps, Product Owner
- **Phân Quyền ABAC**: Attribute-Based Access Control với quy tắc dựa trên ngữ cảnh
- **Bảo Mật Granular**: Quyền truy cập cụ thể theo vai trò cho tài nguyên

### 📊 **Tính Năng Doanh Nghiệp**
- **Cập Nhật Thời Gian Thực**: WebSocket broadcasting cho các thay đổi workflow tức thì
- **Giám Sát SLA**: Thời hạn bắt buộc (24h review, 72h sửa bug, 4h review PR)
- **Dashboard Metrics**: Năng suất nhóm, theo dõi defects, phân tích hiệu suất
- **Validation Workflow**: Thực thi quy tắc nghiệp vụ và cổng chất lượng tự động

### 🛡️ **Bảo Mật Doanh Nghiệp**
- **Xác Thực MFA**: 2FA dựa trên email cho vai trò quan trọng
- **Audit Logging**: Theo dõi hoạt động toàn diện
- **Thực Thi Workflow**: Validation nghiệp vụ bắt buộc
- **Bảo Mật File**: Lưu trữ Cloudinary với quyền truy cập được kiểm soát

---

## 🚀 Bắt Đầu Nhanh

```bash
# Cài đặt dependencies
npm install

# Thiết lập môi trường
cp .env.example .env
mkdir logs

# Khởi động server phát triển
npm run dev
```

---

## 📋 API Endpoints

### Xác Thực
- `POST /api/auth/register` - Đăng ký người dùng
- `POST /api/auth/login` - Đăng nhập với MFA
- `POST /api/auth/verify-otp` - Xác thực OTP

### Tài Nguyên Cốt lõi
- `GET|POST /api/projects` - Quản lý dự án
- `GET|POST /api/tasks` - Quản lý task
- `GET|POST /api/tasks/:id/completion-files` - **🔥 File hoàn thành task**
- `GET /api/tasks/:taskId/completion-files/:fileId/download` - **🔥 Download file hoàn thành**

### Tính Năng Doanh Nghiệp
- `GET|POST /api/epics` - Quản lý epic
- `GET|POST /api/risks` - Quản lý rủi ro
- `GET|POST /api/technical-debts` - Theo dõi debt kỹ thuật
- `GET /api/metrics/dashboard/:projectId` - Dashboard phân tích

### Tính Năng Thời Gian Thực
- WebSocket events cho cập nhật tức thì
- Hệ thống thông báo thời gian thực
- Theo dõi tiến độ trực tiếp

---

## 📁 Cấu Trúc Dự Án

```
src/
├── controllers/          # Logic nghiệp vụ
│   ├── authController.js       # Xác thực
│   ├── taskController.js       # Tasks với workflow hoàn thành
│   ├── projectController.js    # Dự án
│   └── metricsController.js    # Phân tích
├── models/              # Models dữ liệu
│   ├── Task.js          # Tasks với file hoàn thành
│   ├── User.js          # Users với vai trò
│   └── Project.js       # Dự án
├── routes/              # API routes
├── middleware/          # Middleware tùy chỉnh
├── services/            # Services nghiệp vụ
├── utils/               # Utilities
└── config/              # Cấu hình
```

---

## 🎯 **Task Completion Workflow** 🔥

### Quy Trình:
```
1. Developer đánh dấu task "In Progress"
2. Developer upload file hoàn thành 📎
3. Hệ thống thông báo reviewer 📢
4. Reviewer download và review file 📥
5. Developer có thể đánh dấu "Done" ✅
6. Quy trình review tiếp tục...
```

### API Endpoints Mới:
```javascript
// Upload file hoàn thành (chỉ người được giao)
POST /api/tasks/:id/completion-files

// Download file hoàn thành (người dùng được ủy quyền)
GET /api/tasks/:taskId/completion-files/:fileId/download

// Xóa file hoàn thành (chỉ người được giao)
DELETE /api/tasks/:taskId/completion-files/:fileId
```

### Bảo Mật File:
- **Người được giao**: Có thể upload, download, xóa file của mình
- **Reviewer**: Có thể download file để review
- **PM/BA**: Có thể download file để giám sát
- **Người khác**: Không có quyền truy cập file hoàn thành

---

## 👥 Role-Based Permissions

| Role | Task | Sprint | Module | Release | Project | Risk | Technical Debt |
|------|------|--------|--------|---------|---------|------|----------------|
| **PM** | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD |
| **BA** | CRUD | R/U | CRUD | CRUD | R | C/R/U | R |
| **Developer** | R/U* | R | R | R | R | R | R/U* |
| **QA Tester** | C/R/U | R | R | R | R | R | R |
| **Reviewer** | R | R | R | R | R | R | R |

**Chú thích**: C=Tạo, R=Đọc, U=Cập Nhật, D=Xóa, *=Giới hạn theo ngữ cảnh

---

## 📊 Enterprise Workflows

### Vòng Đời Task
```
Backlog → To Do → In Progress → In Review → QA Test → Ready for Release → Done
   ↓        ↓         ↓           ↓          ↓            ↓            ↓
   PO       DEV       DEV         DEV        QA          PO          SYS
```

### Cập Nhật Tiến Độ Tự Động
- **Task Done** → Tiến độ module được tính tự động
- **Module Hoàn Thành** → Tiến độ dự án được cập nhật tự động
- **Sprint Kết Thúc** → Velocity được tính tự động

### Quy Tắc SLA
- **Review Task**: Trong vòng 24 giờ
- **Sửa Bug**: Trong vòng 72 giờ
- **Review PR**: Trong vòng 4 giờ

---

## 🛠️ Phát Triển

### Điều Kiện Tiên Quyết
- Node.js 18+
- MongoDB 4.4+
- Tài khoản Cloudinary (cho lưu trữ file)

### Biến Môi Trường
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/project-management
JWT_SECRET=your-secret-key
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

### Dependencies Chính
- **express**: Web framework
- **mongoose**: ODM MongoDB
- **jsonwebtoken**: Xác thực JWT
- **socket.io**: Tính năng thời gian thực
- **multer**: Upload file
- **cloudinary**: Lưu trữ file

---

## 🔐 Tính Năng Bảo Mật

### Xác Thực
- JWT với refresh tokens
- MFA dựa trên email cho vai trò quan trọng
- Khóa tài khoản khi thất bại nhiều lần
- Mã hóa mật khẩu bảo mật (bcrypt)

### Ủy Quyền
- Hệ thống phân quyền ABAC
- Kiểm soát truy cập dựa trên vai trò
- Quyền truy cập theo ngữ cảnh
- Validation nghiệp vụ bắt buộc

### Bảo Vệ Dữ Liệu
- Validation và làm sạch input
- Giới hạn upload file
- Lưu trữ Cloudinary an toàn
- Audit logging cho tất cả hoạt động

---

## 📈 Giám Sát & Phân Tích

### SLA Dashboard
- Tuân thủ review task (24h SLA)
- Thời gian sửa bug (72h SLA)
- Thời gian review PR (4h SLA)

### Metrics Năng Suất
- Tasks hoàn thành theo người dùng
- Bugs được tạo/sửa
- Độ chính xác ước lượng
- Tham gia review code

### Cập Nhật Thời Gian Thực
- WebSocket event broadcasting
- Cập nhật tiến độ trực tiếp
- Hệ thống thông báo
- Tính năng hợp tác

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:ci

# Run in watch mode
npm run test:watch
```

---

## 🚀 Deployment

### Production Setup
```bash
# Set production environment
NODE_ENV=production

# Configure production database
MONGODB_URI=mongodb://production-url

# Enable production optimizations
ENABLE_REALTIME=true
ENABLE_METRICS=true
```

### Monitoring
- Winston structured logging
- Performance monitoring
- Error tracking
- Health checks
- SLA compliance alerts

---

## 📝 API Documentation

For detailed API documentation, see the [Full API Reference](#) including:
- Complete endpoint specifications
- Request/response examples
- Error handling details
- Authentication flow
- WebSocket event documentation
- Frontend integration guide

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📞 Support

For technical support or questions:
- Create an issue in the repository
- Contact the development team

---

## 📋 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Built for enterprise project management with modern workflows and real-time collaboration.**

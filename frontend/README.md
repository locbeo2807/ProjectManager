# 🚀 Hệ Thống Quản Lý Dự Án Doanh Nghiệp

Hệ thống quản lý dự án toàn diện cấp doanh nghiệp được xây dựng với Node.js, Express, MongoDB và React. Có các tính năng quản lý workflow nâng cao, phân quyền theo vai trò, theo dõi thời gian thực và bảo mật cấp chuyên nghiệp.

## 📋 Mục Lục

- [Tính Năng](#-tính-năng)
- [Kiến Trúc](#-kiến-trúc)
- [Bắt Đầu Nhanh](#-bắt-đầu-nhanh)
- [Vai Trò Người Dùng & Phân Quyền](#-vai-trò-người-dùng--phân-quyền)
- [Workflow Hoàn Chỉnh](#-workflow-hoàn-chỉnh)
- [Tài Liệu API](#-tài-liệu-api)
- [Tích Hợp Frontend](#-tích-hợp-frontend)
- [Kiểm Thử](#-kiểm-thử)
- [Triển Khai](#-triển-khai)
- [Đóng Góp](#-đóng-góp)

## ✨ Tính Năng

### 🎯 Tính Năng Cốt Lõi
- **8 Vai Trò Chuyên Nghiệp** với phân quyền ABAC chi tiết
- **Workflow Task Nâng Cao** với quản lý trạng thái 7 giai đoạn
- **Theo Dõi Tiến Độ Thời Gian Thực** với cập nhật tự động
- **Giám Sát SLA** với cảnh báo tự động
- **Quản Lý Rủi Ro & Nợ Kỹ Thuật**
- **Quản Lý Epic Dựa Trên User Story**
- **Upload File Đa Định Dạng** với lưu trữ đám mây
- **Thông Báo Thời Gian Thực** qua WebSocket
- **Dashboard Chuyên Nghiệp** với widget theo vai trò

### 🔐 Bảo Mật & Tuân Thủ
- **Xác Thực JWT** với refresh token
- **Xác Thực Đa Yếu Tố (MFA)** cho vai trò quan trọng
- **Kiểm Soát Truy Cập Dựa Trên Vai Trò (RBAC)** + **Kiểm Soát Truy Cập Dựa Trên Thuộc Tính (ABAC)**
- **Xác Thực Đầu Vào** với schema Joi
- **Giới Hạn Tốc Độ** và bảo vệ DDoS
- **Ghi Log Kiểm Toán** cho tất cả hoạt động
- **Mã Hóa Dữ Liệu** khi lưu trữ và truyền tải

### 📊 Phân Tích & Báo Cáo
- **Theo Dõi Tuân Thủ SLA** (Review task trong 24h, sửa bug trong 72h, kiểm tra PR trong 4h)
- **Số liệu năng suất** cho từng người dùng và đội ngũ
- **Theo dõi velocity** với burndown sprint
- **Số liệu chất lượng** (mật độ lỗi, độ phủ mã, tỷ lệ automation)
- **Dashboard thời gian thực** với dữ liệu trực tiếp

### 🚀 Hiệu Suất & Khả Năng Mở Rộng
- **Mở rộng theo chiều ngang** với cân bằng tải
- **Tối ưu hóa cơ sở dữ liệu** với lập chỉ mục phù hợp
- **Chiến lược caching** với tích hợp Redis
- **Tích hợp CDN** cho tài nguyên tĩnh
- **Xử lý công việc nền** với quản lý hàng đợi
- **Nén phản hồi API** và tối ưu hóa

## 🏗️ Kiến Trúc

### Kiến Trúc Backend
```
src/
├── controllers/          # Logic nghiệp vụ controllers
│   ├── authController.js
│   ├── projectController.js
│   ├── taskController.js
│   ├── epicController.js
│   ├── riskController.js
│   ├── technicalDebtController.js
│   └── metricsController.js
├── models/              # Schema MongoDB
│   ├── User.js
│   ├── Project.js
│   ├── Module.js
│   ├── Task.js
│   ├── Epic.js
│   ├── Risk.js
│   └── TechnicalDebt.js
├── routes/              # Định nghĩa route API
├── middleware/          # Middleware tùy chỉnh
│   ├── auth.js
│   ├── permissions.js
│   ├── validation.js
│   └── upload.js
├── services/            # Dịch vụ nghiệp vụ
│   ├── progressService.js
│   ├── metricsService.js
│   └── notificationService.js
├── utils/               # Hàm tiện ích
├── config/              # File cấu hình
└── socket/              # Xử lý WebSocket
```

### Kiến Trúc Frontend
```
src/
├── components/          # Component UI có thể tái sử dụng
│   ├── layout/         # Component layout (Header, Sidebar, etc.)
│   ├── dashboard/      # Widget dashboard
│   ├── workflow/       # Component workflow cụ thể
│   ├── common/         # Component chung
│   └── popups/         # Dialog modal
├── pages/              # Component trang
├── contexts/           # React contexts (Auth, Chat, etc.)
├── api/                # Lớp dịch vụ API
│   ├── services/       # Module dịch vụ API
│   └── axios.js        # Cấu hình HTTP client
├── constants/          # Hằng số ứng dụng
├── hooks/              # Hook React tùy chỉnh
├── utils/              # Hàm tiện ích
└── theme.js           # Cấu hình theme
```

## 🚀 Bắt Đầu Nhanh

### Điều Kiện Tiên Quyết
- Node.js 18+
- MongoDB 6+
- Redis (tùy chọn, cho caching)
- Tài khoản Cloudinary (cho lưu trữ file)

### Cài Đặt

1. **Clone repository**
```bash
git clone https://github.com/your-org/project-management-system.git
cd project-management-system
```

2. **Thiết lập Backend**
```bash
cd backend
npm install
cp .env.example .env
# Cấu hình biến môi trường
npm run dev
```

3. **Thiết lập Frontend**
```bash
cd frontend
npm install
cp .env.example .env
# Cấu hình biến môi trường
npm start
```

4. **Thiết lập Cơ Sở Dữ Liệu**
```bash
# Tạo user test
npm run setup-test-users

# Chạy test workflow
npm run test-workflow
```

### Cấu Hình Môi Trường

#### Backend (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/project_management
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-token-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
REDIS_URL=redis://localhost:6379
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=your-sendgrid-api-key
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000
REACT_APP_CLOUDINARY_CLOUD_NAME=your-cloud-name
```

## 👥 Vai Trò Người Dùng & Phân Quyền

### 🎯 PROJECT MANAGER (PM)
**Lãnh Đạo Dự Án Chiến Lược**
- Quản lý toàn bộ vòng đời dự án
- Phân bổ đội ngũ và tài nguyên
- Kiểm soát ngân sách và timeline
- Giao tiếp stakeholder
- Chấp nhận bàn giao cuối cùng

**Quyền Quan Trọng:**
- ✅ Tạo/Chỉnh sửa/Xóa projects, sprints, tasks
- ✅ Quản lý thành viên đội ngũ và vai trò
- ✅ Truy cập tất cả dữ liệu và analytics của dự án
- ✅ Phê duyệt thay đổi dự án và bàn giao

### 👨‍💼 BUSINESS ANALYST (BA)
**Yêu Cầu & Căn Chỉnh Nghiệp Vụ**
- Phân tích và xác thực yêu cầu
- Tạo user story và tiêu chí chấp nhận
- Tạo module và phân công Developer
- Quy trình phê duyệt UI/UX
- Xác thực chấp nhận tính năng

**Quyền Quan Trọng:**
- ✅ Tạo/Chỉnh sửa modules và releases
- ✅ Xác định tiêu chí chấp nhận
- ✅ Phê duyệt workflow nghiệp vụ
- ✅ Truy cập yêu cầu và tài liệu dự án

### 👨‍💻 DEVELOPER
**Triển Khai Code & Chất Lượng**
- Phát triển tính năng và sửa lỗi
- Review code và đảm bảo chất lượng
- Theo dõi thời gian và cập nhật tiến độ
- Tài liệu kỹ thuật
- Tự test và unit test

**Quyền Quan Trọng:**
- ✅ Cập nhật task được phân công và subtasks
- ✅ Tham gia review code
- ✅ Ghi log thời gian và cập nhật tiến độ
- ✅ Truy cập tài liệu kỹ thuật

### 🧪 QA TESTER
**Đảm Bảo Chất Lượng & Xác Thực**
- Lập kế hoạch và thực hiện test
- Test chức năng và hồi quy
- Báo cáo và theo dõi lỗi
- Automation test
- Báo cáo số liệu chất lượng

**Quyền Quan Trọng:**
- ✅ Tạo và cập nhật review task
- ✅ Báo cáo và theo dõi bugs
- ✅ Thực hiện test cases
- ✅ Truy cập số liệu và báo cáo chất lượng

### 🔍 QC (QUALITY CONTROL)
**Kiểm Soát Chất Lượng & Tuân Thủ**
- Review chất lượng code
- Xác thực bảo mật và hiệu suất
- Kiểm tra tuân thủ
- Đánh giá rủi ro
- Thực thi cổng chất lượng

**Quyền Quan Trọng:**
- ✅ Review chất lượng code và bảo mật
- ✅ Đánh giá và giảm thiểu rủi ro
- ✅ Xác thực yêu cầu tuân thủ
- ✅ Truy cập dashboard kiểm soát chất lượng

### 👑 SCRUM MASTER
**Hỗ Trợ Quy Trình & Sức Khỏe Đội Ngu**
- Lên kế hoạch và tổng kết sprint
- Cải tiến quy trình và huấn luyện
- Loại bỏ trở ngại
- Theo dõi velocity đội ngũ
- Thực thi thực hành Agile

**Quyền Quan Trọng:**
- ✅ Tạo và quản lý sprints
- ✅ Hỗ trợ các buổi lễ và cuộc họp
- ✅ Loại bỏ trở ngại của đội ngũ
- ✅ Truy cập số liệu hiệu suất đội ngũ

### 🚀 DEVOPS ENGINEER
**Cơ Sở Hạ Tầng & Triển Khai**
- Quản lý pipeline CI/CD
- Cung cấp môi trường
- Tự động hóa triển khai
- Giám sát và logging
- Cơ sở hạ tầng dưới dạng code

**Quyền Quan Trọng:**
- ✅ Quản lý releases và deployments
- ✅ Cấu hình pipeline CI/CD
- ✅ Giám sát hiệu suất hệ thống
- ✅ Truy cập số liệu cơ sở hạ tầng

### 🎯 PRODUCT OWNER
**Tầm Nhìn Sản Phẩm & Quản Lý Backlog**
- Tầm nhìn và roadmap sản phẩm
- Ưu tiên backlog
- Quản lý stakeholder
- Chấp nhận tính năng
- Giao hàng giá trị kinh doanh

**Quyền Quan Trọng:**
- ✅ Xác định và ưu tiên backlog sản phẩm
- ✅ Tạo và quản lý epics
- ✅ Chấp nhận tính năng đã hoàn thành
- ✅ Truy cập analytics sản phẩm

---

## 🎯 **WORKFLOW QUẢN LÝ DỰ ÁN DOANH NGHIỆP**

### **📋 TỔNG QUAN WORKFLOW**
```
LẬP KẾ HOẠCH CHIẾN LƯỢC → BACKLOG SẢN PHẨM → LẬP KẾ HOẠCH SPRINT → THỰC HIỆN SPRINT → REVIEW SPRINT → RETROSPECTIVE → RELEASE → TRIỂN KHAI
        ↓                    ↓              ↓                ↓              ↓              ↓            ↓          ↓
       PO                   PO             TEAM            TEAM           TEAM          TEAM        DEVOPS     DEVOPS
```

---

## 🎯 **GIAI ĐOẠN 1: LẬP KẾ HOẠCH CHIẾN LƯỢC & TẦM NHÌN**

### **1.1 Xác Định Tầm Nhìn Sản Phẩm**
**Người Tham Gia:** Product Owner, Stakeholders
**Hoạt Động:**
1. Xác định tầm nhìn và mục tiêu sản phẩm
2. Xác định người dùng mục tiêu và nhu cầu thị trường
3. Thiết lập số liệu thành công và KPIs
4. Tạo roadmap sản phẩm ban đầu
5. Xác định epics và tính năng cấp cao

### **1.2 Căn Chỉnh Stakeholder**
**Hoạt Động:**
1. Tiến hành phỏng vấn stakeholder
2. Xác thực yêu cầu kinh doanh
3. Xác định tiêu chí chấp nhận cấp epic
4. Thiết lập kênh giao tiếp
5. Thiết lập cấu trúc quản trị và báo cáo

---

## 📊 **GIAI ĐOẠN 2: QUẢN LÝ BACKLOG SẢN PHẨM**

### **2.1 Tạo & Rút Gọn Epic**
**Người Tham Gia:** Product Owner, Business Analyst
**Hoạt Động:**
1. Chia tầm nhìn sản phẩm thành epics
2. Xác định tiêu chí chấp nhận cấp epic
3. Ưu tiên epics bằng MoSCoW hoặc WSJF
4. Ước tính quy mô epic (kích thước T-shirt)
5. Liên kết epics với mục tiêu kinh doanh

### **2.2 Phát Triển User Story**
**Người Tham Gia:** Product Owner, Business Analyst, Development Team
**Hoạt Động:**
1. Rút gọn epics thành user stories
2. Viết stories tuân thủ tiêu chí INVEST
3. Xác định tiêu chí chấp nhận chi tiết
4. Tạo bản đồ user journey và story
5. Xác định dependencies và rủi ro

### **2.3 Grooming Backlog**
**Hoạt Động:**
1. Các buổi làm sạch backlog thường xuyên
2. Ước tính điểm story bằng Planning Poker
3. Xác thực Definition of Ready (DoR)
4. Đánh giá rủi ro và lập kế hoạch giảm thiểu
5. Báo cáo trạng thái rủi ro cho stakeholders

---

## 🏃‍♂️ **GIAI ĐOẠN 3: LẬP KẾ HOẠCH SPRINT & THỰC HIỆN**

### **3.1 Lập Kế Hoạch Sprint**
**Người Tham Gia:** Scrum Master, Development Team, Product Owner
**Hoạt Động:**
1. Xem xét năng lực và velocity đội ngũ
2. Chọn mục ưu tiên cao nhất từ backlog
3. Xác định mục tiêu và nhiệm vụ sprint
4. Chia user stories thành tasks
5. Cam kết với backlog sprint
6. **Hệ thống tự động thông báo** cho đội ngũ về việc bắt đầu sprint

### **3.2 Daily Scrum**
**Người Tham Gia:** Development Team, Scrum Master
**Hoạt Động:**
1. Các buổi họp standup 15 phút hàng ngày
2. Cập nhật tiến độ trên bảng sprint
3. Xác định trở ngại và blockers
4. Lập kế hoạch lại nếu cần
5. Cập nhật biểu đồ burndown

### **3.3 Workflow Thực Hiện Task**
```
Backlog → To Do → In Progress → In Review → QA Test → Ready for Release → Done
    ↓        ↓         ↓           ↓          ↓            ↓            ↓
   PO       DEV       DEV         DEV        QA          PO          SYS
```

**Luồng Task Chi Tiết:**
1. **Backlog**: Story sẵn sàng phát triển
2. **To Do**: Đội ngũ cam kết trong lập kế hoạch sprint
3. **In Progress**: Developer đang làm việc tích cực
4. **In Review**: Đang review code
5. **QA Test**: Đang xác thực QA
6. **Ready for Release**: Tất cả checks đã pass
7. **Done**: Chấp nhận bởi Product Owner

### **3.4 Quy Trình Review Code**
**Người Tham Gia:** Developer, Senior Developer/Tech Lead
**Hoạt Động:**
1. Developer tạo pull request
2. Checks CI/CD tự động (lint, test, security)
3. Peer code review với checklist
4. Tech lead phê duyệt cuối cùng
5. Merge vào nhánh main

### **3.5 Đảm Bảo Chất Lượng**
**Người Tham Gia:** QA Tester, Developer
**Hoạt Động:**
1. Unit testing trong quá trình phát triển
2. Integration testing
3. System testing
4. User acceptance testing
5. Bug reporting và tracking

---

## 🔍 **GIAI ĐOẠN 4: REVIEW SPRINT & RETROSPECTIVE**

### **4.1 Sprint Review**
**Người Tham Gia:** Development Team, Product Owner, Stakeholders
**Hoạt Động:**
1. Demo công việc đã hoàn thành cho stakeholders
2. Xem xét việc đạt được mục tiêu sprint
3. Thu thập phản hồi về tính năng đã giao
4. Cập nhật backlog sản phẩm với insights mới
5. Điều chỉnh ưu tiên dựa trên phản hồi

### **4.2 Sprint Retrospective**
**Người Tham Gia:** Development Team, Scrum Master
**Hoạt Động:**
1. Phản ánh những gì đã tốt và chưa tốt
2. Xác định cải tiến quy trình
3. Tạo mục hành động cho sprint tiếp theo
4. Cập nhật thỏa thuận làm việc của đội ngũ
5. Cam kết cải tiến cụ thể

---

## 📦 **GIAI ĐOẠN 5: QUẢN LÝ RELEASE**

### **5.1 Lập Kế Hoạch Release**
**Người Tham Gia:** Product Owner, Tech Lead, DevOps Engineer
**Hoạt Động:**
1. Xác định phạm vi và timeline release
2. Tạo nhánh release từ main
3. Test tích hợp cuối cùng
4. Chuẩn bị tài liệu
5. Lập kế hoạch triển khai

### **5.2 Xác Thực Release**
**Hoạt Động:**
1. Thực hiện testing toàn diện
2. Xác thực bảo mật và hiệu suất
3. Testing chấp nhận người dùng
4. Sửa lỗi và hotfixes cuối cùng
5. Release notes và tài liệu

### **5.3 Triển Khai Release**
**Người Tham Gia:** DevOps Engineer, Product Owner
**Hoạt Động:**
1. Triển khai lên môi trường staging
2. Thực hiện smoke testing
3. Thực hiện triển khai production
4. Giám sát số liệu hậu triển khai
5. Thủ tục rollback nếu cần

---

## 🔄 **GIAI ĐOẠN 6: CẢI TIẾN LIÊN TỤC**

### **6.1 Quản Lý Rủi Ro**
**Người Tham Gia:** Project Manager, Business Analyst, Team
**Hoạt Động:**
1. Các buổi đánh giá rủi ro thường xuyên
2. Cập nhật đăng ký rủi ro
3. Thực hiện chiến lược giảm thiểu
4. Giám sát các chỉ số rủi ro
5. Báo cáo trạng thái rủi ro cho stakeholders

### **6.2 Quản Lý Nợ Kỹ Thuật**
**Người Tham Gia:** Tech Lead, Development Team
**Hoạt Động:**
1. Các đánh giá chất lượng code thường xuyên
2. Xác định mục nợ kỹ thuật
3. Ưu tiên giảm nợ
4. Phân bổ thời gian trong sprints để refactoring
5. Theo dõi tiến độ giảm nợ

### **6.3 Cải Tiến Quy Trình**
**Hoạt Động:**
1. Thu thập số liệu và phản hồi
2. Xác định nút thắt và không hiệu quả
3. Thực hiện cải tiến quy trình
4. Đào tạo đội ngũ về thực hành mới
5. Đo lường hiệu quả cải tiến

---

## 📊 **GIAI ĐOẠN 7: GIÁM SÁT & PHÂN TÍCH**

### **7.1 Giám Sát Thời Gian Thực**
**Hoạt Động:**
1. Theo dõi velocity và burndown sprint
2. Giám sát số liệu chất lượng code
3. Theo dõi tỷ lệ giải quyết và thời gian lỗi
4. Giám sát năng suất đội ngũ
5. Giám sát tuân thủ SLA

### **7.2 Báo Cáo & Phân Tích**
**Hoạt Động:**
1. Tạo báo cáo sprint
2. Tạo báo cáo release
3. Sản xuất dashboard sức khỏe dự án
4. Phân tích xu hướng và patterns
5. Dự đoán timeline giao hàng

---

## 🎯 **GIAI ĐOẠN 8: HOÀN THÀNH DỰ ÁN & BÀN GIAO**

### **8.1 Đóng Dự Án**
**Người Tham Gia:** Project Manager, Product Owner, Team
**Hoạt Động:**
1. Testing chấp nhận cuối cùng
2. Hoàn thành tài liệu
3. Buổi handover kiến thức
4. Retrospective dự án cuối cùng
5. Tài liệu đóng dự án

### **8.2 Bàn Giao Cho Operations**
**Hoạt Động:**
1. Chuyển giao cho đội maintenance
2. Cung cấp tài liệu operational
3. Đào tạo nhân viên support
4. Xác định thủ tục support
5. Xác định SLA maintenance

---

## 🔄 **CÁC TRIGGER WORKFLOW TỰ ĐỘNG**

### **Quy Tắc Automation Hệ Thống**
```
Thay Đổi Trạng Thái Task:
├── Done → Tự động tính tiến độ module
├── Tất Cả Tasks Done → Tự động hoàn thành sprint
└── Sprint Hoàn Thành → Tự động tính velocity

Hoàn Thành Module:
├── Tiến Độ 100% → Tự động cập nhật tiến độ dự án
└── Tất Cả Modules Done → Tự động hoàn thành dự án

Sự Kiện Release:
├── Release Được Tạo → Tự động thông báo stakeholders
├── Release Được Deploy → Tự động cập nhật trạng thái module
└── Deploy Thành Công → Tự động thông báo BA + PM

Cổng Chất Lượng:
├── Code Review Được Phê Duyệt → Tự động cho phép merge
├── Tests Pass → Tự động chuyển workflow
└── Security Scan Clear → Tự động phê duyệt deploy
```

### **Automation Thông Báo**
- **Bắt Đầu Sprint**: Thành viên đội ngũ được thông báo
- **Phân Công Task**: Assignee và reviewer được thông báo
- **Cần Review**: Reviewer được thông báo với deadline
- **Task Quá Hạn**: Assignee và PM được thông báo
- **Hoàn Thành Sprint**: Đội ngũ và stakeholders được thông báo
- **Sẵn Sàng Release**: Stakeholders được thông báo để phê duyệt
- **Deploy Thành Công**: Đội ngũ và khách hàng được thông báo
- **Rủi Ro Critical**: PM và team leads được thông báo
- **Vi Phạm SLA**: Các bên chịu trách nhiệm được thông báo

---

## 📈 **KHUNG SỐ LIỆU THÀNH CÔNG**

### **Xuất Sắc Về Giao Hàng**
- **Tỷ Lệ Đạt Mục Tiêu Sprint**: >85%
- **Giao Hàng Đúng Hạn**: >95%
- **Ổn Định Velocity**: ±15%
- **Tỷ Lệ Thay Đổi Phạm Vi**: <10%

### **Xuất Sắc Về Chất Lượng**
- **Mật Độ Lỗi**: <0.5 lỗi/story point
- **Độ Phủ Code**: >85%
- **Tỷ Lệ Automation Test**: >80%
- **Lỗ Hổng Bảo Mật**: 0 critical/high

### **Xuất Sắc Về Quy Trình**
- **Tuân Thủ Sprint Planning**: >90%
- **Tham Gia Daily Standup**: >95%
- **Hoàn Thành Retrospective Action**: >80%
- **Độ Hoàn Chỉnh Tài Liệu**: >95%

### **Xuất Sắc Về Đội Ngu**
- **Sự Hài Lòng Đội Ngu**: >8.0 NPS
- **Chia Sẻ Kiến Thức**: >75% tham gia
- **Đào Tạo Chéo**: >60% phạm vi đội ngũ
- **Đóng Góp Đổi Mới**: >2/quý

---

## 👥 **MA TRẬN TRÁCH NHIỆM VAI TRÒ**

### **🎯 Product Owner (PO)**
**Lãnh Đạo Chiến Lược & Tầm Nhìn Sản Phẩm**
- Xác định và ưu tiên backlog sản phẩm
- Chấp nhận/bác bỏ deliverables
- Đại diện lợi ích stakeholder
- Ra quyết định phạm vi cuối cùng
- Tối đa hóa giá trị sản phẩm

### **👨‍💼 Project Manager (PM)**
**Thực Thi Dự Án & Giao Hàng**
- Lập kế hoạch timeline và tài nguyên dự án
- Quản lý giao tiếp stakeholder
- Giám sát tiến độ và rủi ro dự án
- Điều phối đội ngũ đa chức năng
- Đảm bảo chất lượng và timeline giao hàng

### **👩‍💻 Tech Lead/Kiến Trúc Sư**
**Lãnh Đạo Kỹ Thuật & Chất Lượng**
- Xác định kiến trúc kỹ thuật
- Thiết lập tiêu chuẩn coding
- Lãnh đạo ra quyết định kỹ thuật
- Mentorship cho development team
- Đảm bảo quản lý nợ kỹ thuật

### **👨‍🔧 Developers**
**Triển Khai Code & Đổi Mới**
- Viết code sạch, có thể maintain
- Tham gia code reviews
- Viết comprehensive tests
- Đóng góp thiết kế kỹ thuật
- Học tập và cải tiến liên tục

### **🧪 QA Testers**
**Đảm Bảo Chất Lượng & Xác Thực**
- Tạo kế hoạch test toàn diện
- Thực hiện manual và automated tests
- Báo cáo và theo dõi defects
- Xác thực tiêu chí chấp nhận
- Đảm bảo tiêu chuẩn chất lượng sản phẩm

### **👨‍💼 Business Analyst (BA)**
**Yêu Cầu & Căn Chỉnh Nghiệp Vụ**
- Thu thập và ghi chép yêu cầu
- Tạo user stories và acceptance criteria
- Xác thực business rules và logic
- Cầu nối đội ngũ business và technical
- Đảm bảo giải pháp đáp ứng nhu cầu business

### **🎯 Scrum Master**
**Hỗ Trợ Quy Trình & Sức Khỏe Đội Ngu**
- Điều phối các buổi lễ Scrum
- Loại bỏ trở ngại
- Hướng dẫn thực hành Agile
- Bảo vệ đội ngũ khỏi sự can thiệp bên ngoài
- Nuôi dưỡng văn hóa cải tiến liên tục

### **🚀 DevOps Engineer**
**Cơ Sở Hạ Tầng & Triển Khai**
- Quản lý pipelines CI/CD
- Cung cấp và maintain môi trường
- Tự động hóa quy trình triển khai
- Giám sát hiệu suất hệ thống
- Đảm bảo độ tin cậy cơ sở hạ tầng

### **🔍 QC (Quality Control)**
**Kiểm Soát Chất Lượng & Tuân Thủ**
- Thực hiện reviews chất lượng độc lập
- Xác thực yêu cầu tuân thủ
- Thực hiện đánh giá bảo mật
- Kiểm tra tuân thủ quy trình
- Báo cáo số liệu chất lượng

---

## 🎯 **YẾU TỐ THÀNH CÔNG WORKFLOW**

### **1. Definition of Done Rõ Ràng**
- Code được viết và review
- Unit tests passing
- Acceptance criteria được đáp ứng
- QA validation hoàn thành
- Tài liệu được cập nhật
- PO acceptance thu được

### **2. Giao Tiếp Hiệu Quả**
- Buổi họp daily standup
- Cập nhật stakeholder thường xuyên
- Theo dõi tiến độ minh bạch
- Giao tiếp rủi ro chủ động
- Đường dẫn escalation rõ ràng

### **3. Cải Tiến Liên Tục**
- Buổi họp retrospective thường xuyên
- Ra quyết định dựa trên số liệu
- Thích ứng quy trình
- Cập nhật công nghệ
- Phát triển kỹ năng

### **4. Quản Lý Rủi Ro**
- Xác định rủi ro chủ động
- Đánh giá rủi ro thường xuyên
- Thực hiện chiến lược giảm thiểu
- Lập kế hoạch dự phòng
- Giao tiếp rủi ro stakeholder

### **5. Tập Trung Chất Lượng**
- Test-driven development
- Automated testing
- Yêu cầu code review
- Cân nhắc bảo mật
- Giám sát hiệu suất

---

## 📡 **TÀI LIỆU API**

### Endpoints Xác Thực

#### POST /api/auth/register
Đăng ký user mới với xác thực email
```json
{
  "name": "John Developer",
  "email": "john@company.com",
  "password": "SecurePass123!",
  "role": "Developer",
  "phoneNumber": "+1234567890",
  "gender": "male",
  "companyName": "Tech Corp"
}
```

#### POST /api/auth/login
Đăng nhập user với MFA tùy chọn
```json
{
  "email": "john@company.com",
  "password": "SecurePass123!"
}
```

#### POST /api/auth/verify-otp
Xác thực OTP cho đăng ký hoặc MFA
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "otp": "123456"
}
```

### Endpoints Quản Lý Dự Án

#### POST /api/projects
Tạo dự án mới (chỉ PM)
```json
{
  "projectId": "PROJ-2024-001",
  "name": "E-commerce Platform",
  "description": "Giải pháp e-commerce hoàn chỉnh",
  "startDate": "2024-01-15",
  "endDate": "2024-06-15",
  "version": "1.0.0",
  "members": [
    { "user": "507f1f77bcf86cd799439012" },
    { "user": "507f1f77bcf86cd799439013" }
  ]
}
```

#### GET /api/projects
Lấy tất cả projects (lọc theo role)

#### PUT /api/projects/:id
Cập nhật chi tiết dự án

#### POST /api/modules
Tạo module (role BA)
```json
{
  "moduleId": "MOD-AUTH-001",
  "name": "User Authentication",
  "description": "Login, registration, password reset",
  "status": "Chưa phát triển",
  "startDate": "2024-01-15",
  "endDate": "2024-02-15",
  "owner": "507f1f77bcf86cd799439013",
  "projectId": "507f1f77bcf86cd799439011"
}
```

### Endpoints Quản Lý Task

#### POST /api/tasks
Tạo task mới
```json
{
  "taskId": "TASK-123",
  "name": "Implement user login API",
  "goal": "Tạo RESTful login endpoint",
  "status": "To Do",
  "reviewStatus": "Chưa",
  "priority": "High",
  "estimatedHours": 8,
  "sprintId": "507f1f77bcf86cd799439014",
  "acceptanceCriteria": [
    "User có thể login với credentials hợp lệ",
    "Invalid credentials trả về 401",
    "JWT token được trả về khi thành công"
  ],
  "dependencies": ["507f1f77bcf86cd799439015"]
}
```

#### PUT /api/tasks/:id/status
Cập nhật trạng thái task với validation
```json
{
  "status": "In Progress"
}
```

#### PUT /api/tasks/:id/review-status
Cập nhật trạng thái review task (chỉ QA)
```json
{
  "reviewStatus": "Đạt",
  "comment": "Chất lượng code tuyệt vời, tất cả tests pass"
}
```

### Endpoints Quản Lý Epic

#### POST /api/epics
Tạo epic (Product Owner/BA)
```json
{
  "title": "User Management System",
  "description": "Quản lý toàn bộ lifecycle user",
  "priority": "High",
  "project": "507f1f77bcf86cd799439011",
  "acceptanceCriteria": [
    "Users có thể đăng ký và login",
    "Chức năng quản lý profile hoạt động",
    "Chức năng reset password hoạt động"
  ]
}
```

#### POST /api/epics/:epicId/add-task/:taskId
Liên kết user story với epic

### Endpoints Quản Lý Rủi Ro

#### POST /api/risks
Tạo rủi ro dự án
```json
{
  "title": "Database Performance Issue",
  "description": "Khả năng chậm khi tăng tải user",
  "impact": "High",
  "likelihood": "Medium",
  "mitigationPlan": "Implement database indexing",
  "assignedTo": "507f1f77bcf86cd799439013",
  "project": "507f1f77bcf86cd799439011"
}
```

#### PUT /api/risks/:id/status
Cập nhật trạng thái rủi ro
```json
{
  "status": "Mitigated",
  "mitigationPlan": "Chiến lược giảm thiểu đã cập nhật"
}
```

### Endpoints Metrics & Analytics

#### GET /api/metrics/sla/:projectId
Lấy số liệu tuân thủ SLA
```json
{
  "taskReviewsWithin24h": 8,
  "totalTaskReviews": 10,
  "bugFixesWithin72h": 5,
  "totalBugs": 6,
  "prChecksWithin4h": 0,
  "totalPRs": 0
}
```

#### GET /api/metrics/dashboard/:projectId
Lấy số liệu dashboard
```json
{
  "totalBugs": 15,
  "bugSeverity": { "Low": 5, "Medium": 7, "High": 2, "Critical": 1 },
  "moduleProgress": [
    { "name": "Authentication", "progress": 85 },
    { "name": "User Management", "progress": 60 }
  ],
  "sprintVelocity": [
    { "name": "Sprint 15", "velocity": 85 },
    { "name": "Sprint 14", "velocity": 92 }
  ],
  "projectProgress": 72
}
```

### Enhanced Task Endpoints

#### PUT /api/tasks/:id - Update Task (Enhanced)
- **Auth:** Required
- **Permissions:** Task Update
- **New Fields:**
```json
{
  "taskType": "Feature", // "Feature" | "Bug" | "Improvement" | "Research/Spike"
  "epic": "507f1f77bcf86cd799439014", // Liên kết với epic
  "acceptanceCriteria": ["Criteria 1", "Criteria 2"],
  "dependencies": ["507f1f77bcf86cd799439016"], // Dependencies của task
  "deadline": "2024-02-15T00:00:00.000Z",
  "businessWorkflow": {
    "baConfirmRequirement": true,
    "baApproveUI": false,
    "baAcceptFeature": false
  }
}
```

#### PUT /api/tasks/:id/status - Update Task Status (Enhanced)
- **Auth:** Required
- **Permissions:** Task Update
- **New Statuses:**
```json
{
  "status": "Done" // Triggers auto progress updates và validations
}
```
- **Validations:**
  - `Done` status yêu cầu acceptance criteria
  - Reviewer không thể là assignee
  - Auto-updates module và project progress

### Error Responses

Tất cả endpoints trả về error responses chuẩn hóa:

#### **400 Bad Request**
```json
{
  "message": "Task cannot be marked as Done without acceptance criteria"
}
```

#### **403 Forbidden**
```json
{
  "message": "Access denied. Developer cannot update Task"
}
```

#### **404 Not Found**
```json
{
  "message": "Epic not found"
}
```

#### **500 Internal Server Error**
```json
{
  "message": "Internal server error"
}
```

### WebSocket Events

Cập nhật thời gian thực qua Socket.IO:

#### **Task Events**
```javascript
// taskUpdated
{
  "event": "taskUpdated",
  "data": {
    "sprintId": "507f1f77bcf86cd799439011",
    "updatedTask": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Implement user login",
      "status": "In Review",
      "assignee": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "John Developer"
      },
      "reviewer": {
        "_id": "507f1f77bcf86cd799439014",
        "name": "Jane QA"
      },
      "updatedAt": "2024-01-15T14:30:00.000Z"
    }
  }
}

// taskCompleted
{
  "event": "taskCompleted",
  "data": {
    "taskId": "507f1f77bcf86cd799439012",
    "taskName": "Implement user login",
    "reviewerId": "507f1f77bcf86cd799439014",
    "assigneeId": "507f1f77bcf86cd799439013",
    "completionTime": "2024-01-15T14:30:00.000Z"
  }
}

// businessWorkflowUpdate
{
  "event": "businessWorkflowUpdate",
  "data": {
    "taskId": "507f1f77bcf86cd799439012",
    "action": "baConfirmRequirement",
    "performedBy": {
      "_id": "507f1f77bcf86cd799439015",
      "name": "Bob BA",
      "role": "BA"
    },
    "timestamp": "2024-01-15T14:30:00.000Z",
    "comment": "Yêu cầu đã được xác nhận và validate"
  }
}
```

#### **Progress Events**
```javascript
// moduleProgressUpdate
{
  "event": "moduleProgressUpdate",
  "data": {
    "moduleId": "507f1f77bcf86cd799439016",
    "progress": 75,
    "completedTasks": 6,
    "totalTasks": 8,
    "updatedAt": "2024-01-15T14:30:00.000Z"
  }
}

// projectProgressUpdate
{
  "event": "projectProgressUpdate",
  "data": {
    "projectId": "507f1f77bcf86cd799439017",
    "progress": 65,
    "completedModules": 2,
    "totalModules": 5,
    "riskLevel": "Low",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  }
}
```

### Notifications Endpoints

Base URL: `/api/notifications`

- **GET /** (requires auth)
  - Lấy notifications

- **PATCH /read** (requires auth)
  - Đánh dấu tất cả là đã đọc

- **PATCH /:id/read** (requires auth)
  - Đánh dấu notification là đã đọc

**Notification Types:**
- `project_created`: Dự án mới được tạo (gửi cho tất cả BA)
- `project_confirmed`: Dự án được xác nhận bởi PM
- `module_created`: Module mới được tạo (gửi cho tất cả PM)
- `module_assigned`: Module được assign cho Developer owner (validation: chỉ role Developer)
- `sprint_created`: Sprint mới được tạo (gửi cho tất cả DEV & BA)
- `task_created`: Task mới được tạo (gửi cho tất cả DEV & BA)
- `task_assigned`: Task được assign cho developer (cụ thể)
- `task_review_assigned`: Task review được assign cho QA (cụ thể)
- `task_completed`: Task hoàn thành, chờ review (reviewer, PM, BA)
- `task_reviewed`: Task review hoàn thành (assignee)
- `release_ready_for_approval`: Release sẵn sàng để phê duyệt

### Conversations Endpoints

Base URL: `/api/conversations`

- **POST /** (requires auth)
  - Tạo hoặc lấy cuộc trò chuyện 1-1

- **GET /** (requires auth)
  - Lấy conversations

- **GET /:id/messages** (requires auth)
  - Lấy messages

- **POST /:id/messages** (requires auth, multipart/form-data)
  - Gửi message
  - File: `file`

- **POST /group** (requires auth)
  - Tạo group chat

- **DELETE /:id** (requires auth)
  - Xóa group chat

- **POST /:id/add-members** (requires auth)
  - Thêm members vào group

- **GET /:conversationId/files/:publicId/download** (requires auth)
  - Download chat file

### Activities Endpoints

Base URL: `/api/activities`

- **GET /** (requires auth)
  - Lấy activities của user

## 🎨 Tích Hợp Frontend

### Flow Xác Thực
```javascript
// Login với support MFA
const handleLogin = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });

  if (response.data.mfa) {
    // Show OTP input cho MFA
    setShowOTP(true);
    setUserId(response.data.userId);
  } else {
    // Login trực tiếp thành công
    setUser(response.data.user);
    setTokens(response.data);
  }
};
```

### Cập Nhật Thời Gian Thực
```javascript
// Xử lý event WebSocket
useEffect(() => {
  socket.on('taskUpdated', (data) => {
    if (data.sprintId === currentSprintId) {
      updateTaskInState(data.updatedTask);
      showNotification(`Task "${data.updatedTask.name}" đã cập nhật`, 'info');
    }
  });

  socket.on('businessWorkflowUpdate', (data) => {
    const { action } = data;
    const messages = {
      baConfirmRequirement: 'Yêu cầu đã được xác nhận bởi BA',
      baApproveUI: 'UI designs đã được phê duyệt bởi BA',
      baAcceptFeature: 'Feature đã được chấp nhận bởi BA'
    };
    showNotification(messages[action], 'success');
  });

  return () => {
    socket.off('taskUpdated');
    socket.off('businessWorkflowUpdate');
  };
}, [currentSprintId]);
```

### UI Dựa Trên Phân Quyền
```javascript
// Render component dựa trên role
const TaskActions = ({ task, user }) => {
  const canEdit = hasPermission(user.role, 'Task', 'update', {
    taskAssignee: task.assignee._id
  });
  const canReview = user.role === 'QA Tester' && task.status === 'In Review';

  return (
    <div>
      {canEdit && <button onClick={() => editTask(task)}>Chỉnh sửa</button>}
      {canReview && (
        <button onClick={() => reviewTask(task)}>Review</button>
      )}
    </div>
  );
};
```

### Xử Lý Upload File
```javascript
// Upload file đa file với progress
const uploadFiles = async (files, entityType, entityId) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  const response = await api.post(`/${entityType}s/${entityId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progress) => {
      setProgress(Math.round((progress.loaded / progress.total) * 100));
    }
  });

  return response.data;
};
```

## 🧪 Kiểm Thử

### Chạy Tests
```bash
# Tests backend
cd backend
npm test              # Chạy tất cả tests
npm run test:watch    # Chế độ watch
npm run test:ci       # Với coverage report

# Tests frontend
cd frontend
npm test              # Chạy React tests
npm run test:e2e      # End-to-end tests
```

### Coverage Kiểm Thử
- ✅ Unit tests cho tất cả controllers
- ✅ Integration tests cho API endpoints
- ✅ Authentication workflow tests
- ✅ Permission system tests
- ✅ Real-time WebSocket tests
- ✅ File upload/download tests

### Cấu Trúc Test
```
backend/tests/
├── setup.js              # Cấu hình test và mocks
├── auth.test.js          # Tests xác thực
├── project.test.js       # Tests quản lý dự án
├── task.test.js          # Tests workflow task
├── epic.test.js          # Tests quản lý epic
└── integration.test.js   # Tests workflow đầy đủ

frontend/src/__tests__/
├── components/           # Tests component
├── hooks/               # Tests custom hook
├── utils/               # Tests utility function
└── integration/         # Tests tích hợp
```

## 🚀 Triển Khai

### Thiết Lập Production

1. **Cấu Hình Môi Trường**
```bash
# Biến môi
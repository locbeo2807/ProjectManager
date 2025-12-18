# 🚀 Hệ Thống Quản Lý Dự Án Phần Mềm

Hệ thống quản lý dự án phần mềm toàn diện được xây dựng với kiến trúc **Scrum/Agile**, sử dụng **Node.js**, **Express**, **MongoDB** và **React**. Hỗ trợ 8 vai trò chuyên nghiệp với workflow task nâng cao, bàn giao công việc, và theo dõi thời gian thực qua WebSocket.

## ✨ **Tính Năng Chính**

### 🎯 **Quản Lý Dự Án Scrum/Agile**
- **8 Vai Trò Chuyên Nghiệp**: PM, BA, Developer, QA Tester, QC, Scrum Master, DevOps, Product Owner
- **Workflow Task 7 Giai Đoạn**: Từ "Hàng đợi" đến "Hoàn thành" với validation tự động
- **Business Workflow**: BA phê duyệt yêu cầu, UI/UX cho task Feature
- **Handover Workflow**: Bàn giao task với lịch sử đầy đủ

### 💬 **Chat & Giao Tiếp Thời Gian Thực**
- **Real-time Chatbox**: Chat 1-1 và nhóm với WebSocket
- **File Sharing**: Chia sẻ file trong cuộc trò chuyện
- **Thông Báo Thời Gian Thực**: Cập nhật task, assignment, review request
- **Notification History**: Lịch sử thông báo đầy đủ

### 📊 **Giám Sát & Báo Cáo**
- **Dashboard Thời Gian Thực**: Tiến độ project, module, sprint
- **SLA Monitoring**: Theo dõi deadline review (24h), fix bug (72h)
- **Risk Management**: Quản lý rủi ro với priority levels
- **Technical Debt Tracking**: Theo dõi nợ kỹ thuật
- **Timer functionality** :Đếm ngược thời gian task
- **Real-time persistence** :Timer chạy liên tục ngay cả khi đóng trình duyệt
- **Auto-start** :Tự động bắt đầu khi task có status phù hợp
- **Cross-browser support** : Timer hoạt động qua nhiều phiên trình duyệt

### 📁 **Quản Lý File & Tài Liệu**
- **Upload File Đa Định Dạng**: Hỗ trợ PDF, images, documents
- **Cloud Storage**: Tích hợp Cloudinary cho lưu trữ đám mây
- **File Completion**: Bắt buộc upload file khi hoàn thành task
- **Handover Files**: File bàn giao với review status

### 🔐 **Bảo Mật & Phân Quyền**
- **JWT Authentication**: Access & refresh token
- **Role-Based Access Control**: 8 vai trò với quyền hạn chi tiết
- **Attribute-Based Access Control**: Quyền dựa trên thuộc tính
- **Email Notifications**: Mailjet integration cho thông báo email

## 🔄 **Quy Trình Hoàn Thành Dự Án**

### **Bước 1: Khởi Tạo & Lập Kế Hoạch**
1. **PM tạo dự án** với thông tin cơ bản (tên, mô tả, timeline, budget)
2. **PM thêm thành viên** vào dự án (BA, Developers, QA, etc.)
3. **BA tạo modules** chia dự án thành các phần chức năng


### **Bước 2: Phát Triển Sprint**
1. **Scrum Master/BA tạo sprint** với thời gian và mục tiêu
2. **BA tạo tasks** từ backlog với acceptance criteria
3. **BA gán assignees** (Developers) và reviewers (QA)
4. **Developers thực hiện** tasks theo workflow 7 giai đoạn

### **Bước 3: Workflow Task**
```
Task Creation → Development → Review → Testing → Approval → Completion
     ↓              ↓           ↓         ↓         ↓          ↓
     BA            Dev         QA        QA       PO       System
```


### **Bước 4: Business Approval (cho Feature tasks)**
1. **BA Confirm Requirements** - Xác nhận yêu cầu đầy đủ
2. **BA Approve UI** - Phê duyệt thiết kế giao diện
3. **BA Accept Feature** - Chấp nhận tính năng hoàn thành
4. **PO Final Acceptance** - Product Owner chấp nhận cuối cùng *(mới)*

### **Bước 5: Quality Assurance**
1. **QA review code** và đánh giá "Đạt"/"Không đạt"(Thông qua một file review và code trên github)
2. **QA test functionality** và báo cáo bugs nếu có
3. **SLA monitoring** đảm bảo review trong 24h, fix bug trong 72h

### **Bước 6: Handover & Documentation**
1. **Upload completion files** bắt buộc khi task hoàn thành
2. **Handover workflow** nếu cần chuyển giao task
3. **File documentation** cho tất cả deliverables

### **Bước 7: Sprint Completion**
1. **Tự động cập nhật tiến độ** khi tasks hoàn thành
2. **Sprint review** với stakeholders
3. **Sprint retrospective** để cải tiến quy trình
4. **Velocity tracking** cho sprint tiếp theo

### **Bước 8: Project Completion**
1. **Tất cả modules hoàn thành** (100% progress)
2. **Final acceptance** bởi Product Owner

### **Tự Động Hóa Trong Quy Trình:**
- ✅ **Progress calculation** khi task/module hoàn thành
- ✅ **SLA alerts** khi quá deadline
- ✅ **Notifications** cho tất cả stakeholders
- ✅ **Business rule validation** cho approvals
- ✅ **File requirement checks** cho completion

## 🎯 **PO Final Acceptance - Chấp Nhận Cuối Cùng**

### **Tính Năng Mới**
**Product Owner Final Acceptance** là bước chấp nhận cuối cùng của PO cho tất cả Feature tasks, đảm bảo tính năng đáp ứng đúng yêu cầu kinh doanh.

### **Quy Trình Hoạt Động**
1. **Task hoàn thành** → Trạng thái "Hoàn thành"
2. **PO nhận thông báo** → Task đang chờ final acceptance
3. **PO review** → Xem xét tính năng và yêu cầu
4. **PO quyết định** → Chấp nhận hoặc từ chối

### **Giao Diện Người Dùng**
- **Chỉ PO thấy** nút Accept/Reject khi task hoàn thành
- **Visual indicators** hiển thị trạng thái acceptance
- **Real-time updates** khi PO đưa ra quyết định

### **Notifications Khi Từ Chối**
Khi PO từ chối, hệ thống tự động gửi notification cho:
- **Assignees** (Người thực hiện)
- **Reviewers** (Người đánh giá)
- **Tất cả PMs** (Project Managers)
- **Tất cả BAs** (Business Analysts)

### **Business Rules**
- ✅ **Bắt buộc** cho tất cả Feature tasks
- ✅ **Chỉ PO** có quyền chấp nhận cuối cùng
- ✅ **Validation** - Task không thể "hoàn thành" nếu chưa có PO acceptance
- ✅ **History tracking** - Lưu lịch sử tất cả quyết định

### **Ý Nghĩa**
- **Quality Gate Cuối Cùng** - Đảm bảo alignment với business requirements
- **PO Accountability** - Trách nhiệm của PO trong việc chấp nhận deliverables
- **Transparency** - Toàn bộ team được thông báo về quyết định
- **Continuous Improvement** - Cơ hội điều chỉnh khi có vấn đề

## 📋 Mục Lục

- [Cài Đặt & Chạy](#-cài-đặt--chạy)
- [Cấu Hình Môi Trường](#-cấu-hình-môi-trường)
- [Vai Trò Người Dùng](#-vai-trò-người-dùng)
- [Chạy Chương Trình](#-chạy-chương-trình)
- [Cách test](#-cách-test)
## 🚀 **Cài Đặt & Chạy**

### Điều Kiện Tiên Quyết
- Node.js 18+
- MongoDB 6+
- Tài khoản Cloudinary (cho lưu trữ file)
- 3 tài khoản Gmail đăng ký với 3 role PM, BA , Dev (vì hệ thống sử dụng sendotp để verify user khi đăng nhập đăng ký)
### Cài Đặt

1. **Clone repository**
```bash
git clone https://github.com/your-org/project-management-system.git
cd project-management-system
```

2. **Cài đặt dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
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
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_API_SECRET=your-mailjet-api-secret
MAIL_FROM=your-email@example.com
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000
REACT_APP_CLOUDINARY_CLOUD_NAME=your-cloud-name
```

## 👥 **Vai Trò Người Dùng**

### 🎯 PROJECT MANAGER (PM)
**Lãnh đạo dự án chiến lược**
- Quản lý toàn bộ vòng đời dự án
- Phân bổ đội ngũ và tài nguyên
- Kiểm soát ngân sách và timeline
- Giao tiếp stakeholder

### 👨‍💼 BUSINESS ANALYST (BA)
**Yêu cầu & căn chỉnh nghiệp vụ**
- Phân tích và xác thực yêu cầu
- Tạo user story và tiêu chí chấp nhận
- Tạo module và phân công Developer
- Phê duyệt UI/UX

### 👨‍💻 DEVELOPER
**Triển khai code & chất lượng**
- Phát triển tính năng và sửa lỗi
- Review code và đảm bảo chất lượng
- Theo dõi thời gian và cập nhật tiến độ

### 🧪 QA TESTER
**Đảm bảo chất lượng & xác thực**
- Lập kế hoạch và thực hiện test
- Báo cáo và theo dõi lỗi
- Automation test

### 🔍 QC (QUALITY CONTROL)
**Kiểm soát chất lượng & tuân thủ**
- Review chất lượng code
- Xác thực bảo mật và hiệu suất
- Đánh giá rủi ro

### 👑 SCRUM MASTER
**Hỗ trợ quy trình & sức khỏe đội ngũ**
- Lên kế hoạch và tổng kết sprint
- Loại bỏ trở ngại
- Thực thi thực hành Agile

### 🚀 DEVOPS ENGINEER
**Cơ sở hạ tầng & triển khai**
- Quản lý pipeline CI/CD
- Tự động hóa triển khai
- Giám sát hệ thống

### 🎯 PRODUCT OWNER
**Tầm nhìn sản phẩm & quản lý backlog**
- Xác định và ưu tiên backlog
- Chấp nhận tính năng
- **Final Acceptance** cho tất cả Feature tasks *(mới)*
- Quản lý stakeholder

## ⚡ **Chạy Chương Trình**

### Chạy Backend
```bash
cd backend
npm run start
```

### Chạy Frontend
```bash
cd frontend
npm run start
```

### Chạy Với Docker
```bash
# Chạy tất cả services
docker-compose up -d

# Kiểm tra logs
docker-compose logs -f
```

### Truy Cập Ứng Dụng
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **WebSocket:** ws://localhost:5000

### Cách test
B1: Người dùng đăng ký lần lượt 3 tài khoản email tương ứng 3 role và hệ thống sẽ gửi otp để xác nhận ( Khi tạo tài khoản xong có thể vào trang cá nhân để tắt mfa để đăng nhập thuận tiện hơn)
B2: Vào tài khoản PM, vào dự án và nhấn tạo project điền những thông tin cơ bản để tạo ( người được bàn giao project thường là BA để bắt đầu tạo module,sprint và task)
B3: PM thêm người liên quan như dev và những role liên quan khác vào project để được trực tiếp làm project
B4: Vào tài khoản BA, vào dự án mới dc giao tạo module( điền thông tin) xong vào chi tiết module tiến hành tạo sprint (điền thông tin), sau đó tiếp tục vào chi tiết sprint và bắt đầu tạo task (điền thông tin)
B5: Vào tài khoản Dev, vào dự án mới dc giao tạo module, sprint và task ( điền thông tin) xong vào chi tiết module, sprint và task để bắt đầu làm task nếu hoàn thành push code và nộp một file review những gì đã làm và nhấn hoàn thành hệ thống sẽ gửi thông báo cho người review task này để tiến hành review nếu đạt task hoàn thành, nếu không đạt hệ thống chuyển status của task qua đang sửa và lập lại như trên nếu hoàn thành     
B6: Khi tất cả task hoàn thành thì sprint cũng sẽ hoàn thành, module cũng sẽ cập nhật hoàn thành và project cũng sẽ hoàn thành.
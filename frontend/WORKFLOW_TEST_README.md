# Complete Project Management Workflow Test

Script để test toàn bộ workflow quản lý dự án từ đầu đến cuối.

## 🚀 Cách chạy test

### 1. Chuẩn bị môi trường

```bash
# Terminal 1: Start backend server
cd ../backend
npm install
npm run dev
# Server sẽ chạy trên http://localhost:5000

# Terminal 2: Start frontend
cd ../frontend
npm install
npm start
# Frontend sẽ chạy trên http://localhost:3000
```

### 2. Tạo test users trong database

Trước khi chạy test, cần tạo users test trong MongoDB:

```javascript
// Chạy trong MongoDB shell hoặc tạo script
db.users.insertMany([
  {
    userID: "PM001",
    name: "Project Manager",
    email: "pm@test.com",
    password: "$2a$10$hashed_password", // hash của "123456"
    role: "pm",
    phoneNumber: "0123456789",
    gender: "male",
    companyName: "Test Company"
  },
  {
    userID: "BA001",
    name: "Business Analyst",
    email: "ba@test.com",
    password: "$2a$10$hashed_password",
    role: "ba",
    phoneNumber: "0123456789",
    gender: "female",
    companyName: "Test Company"
  },
  {
    userID: "DEV001",
    name: "Developer",
    email: "dev@test.com",
    password: "$2a$10$hashed_password",
    role: "developer",
    phoneNumber: "0123456789",
    gender: "male",
    companyName: "Test Company"
  },
  {
    userID: "QA001",
    name: "QA Tester",
    email: "qa@test.com",
    password: "$2a$10$hashed_password",
    role: "tester",
    phoneNumber: "0123456789",
    gender: "female",
    companyName: "Test Company"
  }
]);
```

### 3. Cập nhật User IDs

Trong file `test-workflow.js`, thay thế placeholders:

```javascript
// Thay thế các USER_ID placeholders bằng ObjectId thực tế từ database
const membersData = {
  members: [
    { user: 'BA_USER_ID' }, // → Thay bằng ObjectId của BA user
    { user: 'DEV_USER_ID' }, // → Thay bằng ObjectId của DEV user
    { user: 'QA_USER_ID' }   // → Thay bằng ObjectId của QA user
  ]
};
```

### 4. Chạy test script

```bash
# Trong thư mục frontend
node test-workflow.js
```

## 📋 Workflow Test Steps

### Phase 1: Authentication ✅
- Login với 4 roles: PM, BA, Developer, QA
- Xác nhận JWT tokens được tạo thành công

### Phase 2: Project Creation (PM) ✅
- PM tạo project mới với thông tin đầy đủ
- Project status: "Khởi tạo"
- History log được ghi

### Phase 3: Team Management (PM) ✅
- PM thêm BA, Developer, QA vào project
- Members được lưu vào project.members

### Phase 4: Module Creation (BA) ✅
- BA tạo module với status "Chưa phát triển"
- Module được link với project
- History được ghi cho cả module và project

### Phase 5: Release Creation (BA) ✅
- BA tạo release cho module
- Release status: "Chưa bắt đầu"
- Workflow: fromUser → toUser → approver

### Phase 6: Sprint Creation (PM) ✅
- PM tạo sprint cho release
- Sprint status: "Chưa bắt đầu"
- Timeline được set

### Phase 7: Task Creation (PM) ✅
- PM tạo task trong sprint
- Task status: "Chưa làm"
- Assignee và reviewer được assign

### Phase 8: Task Execution Workflow ✅
```
Developer: "Chưa làm" → "Đang làm" → "Đã xong"
     ↓
QA Review: "Chưa" → "Đạt" (hoặc "Không đạt")
```

### Phase 9: Automatic Status Updates ✅
```
Module: "Chưa phát triển" → "Đang phát triển" → "Hoàn thành"
    ↓
Project: "Khởi tạo" → "Đang triển khai" → "Hoàn thành"
```

## 🎯 Expected Results

### Frontend UI Changes
1. **Workflow Progress Bar**: Hiển thị 3 steps với animation
2. **Project Status**: Tự động update theo module status
3. **Module Cards**: Progress bars và status indicators
4. **Real-time Updates**: Socket events cập nhật UI ngay lập tức
5. **Role-based UI**: Buttons chỉ hiện với đúng permissions

### Backend Database Changes
1. **Projects**: Status auto-update dựa trên modules
2. **Modules**: Status được update thủ công
3. **Tasks**: Status workflow Developer → QA
4. **History Logs**: Mọi thay đổi được ghi lại
5. **Notifications**: Users nhận thông báo khi cần action

## 🔍 Test Verification

### Manual Testing Steps
1. **Login as PM**: Tạo project, thêm members, tạo sprint, tạo tasks
2. **Login as BA**: Tạo modules (với owner), tạo releases
3. **Login as Developer**: Update task status (Chưa làm → Đang làm → Đã xong)
4. **Login as QA**: Review tasks (Đạt/Không đạt)
5. **Check Status Cascade**: Task → Sprint → Release → Module → Project auto-update
6. **Verify Permissions**: PM không thể tạo modules, BA không thể tạo projects

### Expected UI States
- **Project Page**: Workflow progress bar, module cards với progress
- **Module Detail**: Release list, status indicators
- **Sprint Detail**: Task table với status workflow
- **Notifications**: Real-time updates khi status thay đổi

## 🐛 Troubleshooting

### Common Issues
1. **"User not found"**: Check user IDs in test script
2. **"Forbidden"**: Verify user roles và permissions
3. **Socket not working**: Check backend WebSocket connection
4. **Status not updating**: Verify backend auto-update logic

### Debug Commands
```bash
# Check backend logs
cd ../backend && npm run dev

# Check frontend console
# Open browser DevTools → Console

# Check database
mongosh
use your_database_name
db.projects.find().pretty()
db.modules.find().pretty()
db.tasks.find().pretty()
```

## 📊 Test Coverage

✅ **Authentication & Authorization**
✅ **Project CRUD Operations**
✅ **Team Member Management**
✅ **Module Management**
✅ **Release Management**
✅ **Sprint Management**
✅ **Task Management & Workflow**
✅ **Status Cascade Logic**
✅ **Real-time Notifications**
✅ **Role-based Permissions**
✅ **UI/UX Enhancements**

## 🎉 Success Criteria

- ✅ All API calls return 200/201 status
- ✅ Database records created with correct relationships
- ✅ Status updates trigger automatically
- ✅ Frontend UI reflects backend changes
- ✅ Socket events update UI in real-time
- ✅ Role permissions enforced correctly
- ✅ Workflow follows specification exactly

Chạy test này để verify toàn bộ hệ thống hoạt động đúng workflow!
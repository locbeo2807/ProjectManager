# 🔄 **HƯỚNG DẪN BÀN GIAO TASK CHO NHAU**

## 🎯 **CÁCH BÀN GIAO TASK TRONG HỆ THỐNG:**

### **📍 Bước 1: Mở Sprint Detail**
1. **Truy cập Module Detail** → Chọn Sprint cần làm việc
2. **Mở Sprint Detail page** để xem danh sách tasks
3. **Tìm HandoverWorkflow component** ở cuối trang

---

### **🔥 Bước 2: Chọn Task Cần Bàn Giao**

#### **📋 Trong Task List:**
- **Tìm task** bạn muốn bàn giao
- **Click nút "Bàn giao"** màu xanh (🔄 icon)
- **Dialog bàn giao** sẽ hiện ra

#### **✅ Điều kiện để thấy nút "Bàn giao":**
- Bạn phải là assignee hiện tại của task
- Hoặc có quyền quản lý (PM/BA/Scrum Master)
- Task không ở trạng thái "Hoàn thành"

---

### **🎯 Bước 3: Thực Hiện Bàn Giao**

#### **📝 Trong Handover Dialog:**

**👤 Chọn người nhận bàn giao:**
- **Dropdown "Người nhận bàn giao"** - Chọn Developer mới
- **Hiển thị danh sách** các thành viên trong project

**👁️ Chọn người xem xét:**
- **Dropdown "Người xem xét"** - Chọn người sẽ review task
- **Có thể chọn chính bạn** hoặc người khác

**💬 Nhập lý do (tùy chọn):**
- **Text area "Ghi chú bàn giao"** - Giải thích lý do
- **Thông tin quan trọng** cho người nhận

---

### **✅ Bước 4: Xác Nhận Bàn Giao**

#### **🔘 Click nút "Bàn giao Task":**
- **Validation check** - Đảm bảo đã chọn đủ người
- **Loading state** - Hiển thị progress bar
- **Success notification** - "Task đã được bàn giao thành công!"

---

## 🎨 **Giao Diện Bàn Giao:**

### **📱 Handover Dialog Layout:**
```
┌─────────────────────────────────────────┐
│  🔄 Bàn giao Task: "Tên Task"            │
├─────────────────────────────────────────┤
│  📋 Thông tin task hiện tại              │
│  • Assignee: Nguyễn Văn A                │
│  • Reviewer: Trần Thị B                 │
│  • Status: Đang làm                     │
├─────────────────────────────────────────┤
│  👤 Người nhận bàn giao                  │
│  [Dropdown chọn Developer mới ▼]        │
│                                         │
│  👁️ Người xem xét                       │
│  [Dropdown chọn Reviewer ▼]             │
│                                         │
│  💬 Ghi chú bàn giao                    │
│  [Text area để nhập lý do]              │
├─────────────────────────────────────────┤
│  [Hủy]        [Bàn giao Task]           │
└─────────────────────────────────────────┘
```

### **🎯 Timeline Steps:**
1. **Bàn giao từ** - Hiển thị người hiện tại
2. **Người nhận bàn giao** - Người được chọn
3. **Người xem xét** - Reviewer được assign
4. **Hoàn thành bàn giao** - Status final

---

## 🔄 **QUY TRÌNH BÀN GIAO TỰ ĐỘNG:**

### **📡 Khi Click "Bàn giao Task":**

#### **🔥 Backend Actions:**
1. **Cập nhật task** với assignee và reviewer mới
2. **Ghi lại handover history** trong task
3. **Gửi notifications** đến tất cả người liên quan

#### **📢 Notifications Tự Động:**
- **👤 New Assignee**: "Task X đã được bàn giao cho bạn bởi..."
- **👁️ New Reviewer**: "Task X đã được bàn giao - cần bạn review"
- **📋 BA & Scrum Master**: "Task X đã được bàn giao từ A sang B"
- **✅ Original Assignee**: "Task X đã được bàn giao thành công"

#### **🎯 Real-time Updates:**
- **Socket.io events** - Instant notifications
- **Toast notifications** - Hiển thị ngay lập tức
- **Desktop notifications** - Nếu tab không active
- **Sound alerts** - Audio feedback

---

## 🎪 **SAU KHI BÀN GIAO:**

### **✅ Đối với Người Nhận:**
1. **Nhận notification** real-time
2. **Task xuất hiện** trong task list của bạn
3. **Status cập nhật** thành "Đang làm"
4. **Có thể bắt đầu làm** ngay lập tức

### **👁️ Đối với Reviewer:**
1. **Nhận notification** cần review
2. **Task xuất hiện** trong review queue
3. **Có 24 giờ** để hoàn thành review
4. **SLA tracking** tự động

### **📋 Đối với Management:**
1. **BA & Scrum Master** nhận notification quản lý
2. **Handover history** được ghi lại
3. **Progress tracking** cập nhật
4. **Reporting** tự động

---

## 🎯 **TÍNH NĂNG ĐẶC BIỆT:**

### **🔄 Batch Handover:**
- **Chọn multiple tasks** để bàn giao cùng lúc
- **Same assignee/reviewer** cho nhiều tasks
- **Bulk notifications** cho efficiency

### **📊 Handover History:**
- **Track tất cả** các lần bàn giao
- **Timeline view** với timestamps
- **Reason tracking** cho audit trail

### **🔔 Smart Notifications:**
- **Role-based targeting** - Đúng người nhận
- **Context-aware** - Thông tin chi tiết
- **Multi-channel** - Toast + Desktop + Sound

---

## 🚀 **TIPS & BEST PRACTICES:**

### **✅ Khi Bàn Giao:**
- **Luôn nhập lý do** rõ ràng
- **Chọn reviewer phù hợp** với expertise
- **Kiểm tra task status** trước khi bàn giao
- **Thông báo trước** cho người nhận nếu cần

### **🔄 Khi Nhận Bàn Giao:**
- **Kiểm tra task details** ngay lập tức
- **Liên hệ người bàn giao** nếu có thắc mắc
- **Bắt đầu làm** trong thời gian hợp lý
- **Update status** khi bắt đầu

### **📋 Management:**
- **Monitor handover frequency** để tracking workload
- **Review handover reasons** cho process improvement
- **Ensure SLA compliance** cho review times
- **Track bottlenecks** trong handover process

---

## 🎉 **KẾT QUẢ:**

**🔥 Bàn giao task trở nên đơn giản:**
- **1 click** để mở dialog
- **2 dropdowns** để chọn người
- **1 click** để hoàn thành
- **Instant notifications** cho tất cả
- **Full audit trail** cho management

**🚀 Quy trình chuyên nghiệp với real-time updates và smart notifications!**

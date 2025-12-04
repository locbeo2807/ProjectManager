const Project = require('../models/Project');
const Module = require('../models/Module');
const { createError } = require('../utils/error');
const User = require('../models/User');
const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary');
const Notification = require('../models/Notification');
const socketManager = require('../socket');
const axios = require('axios');
const { formatVNDate } = require('../utils/dateFormatter');

// Tạo dự án mới
exports.createProject = async (req, res, next) => {
  // Chỉ cho phép PM và TestPM tạo dự án
  console.log('createProject called with user:', { userId: req.user._id, role: req.user.role });
  if (!['PM', 'TestPM'].includes(req.user.role)) {
    return next(createError(403, 'Chỉ PM và TestPM mới có quyền tạo dự án mới.'));
  }
  try {
    const { projectId, name, description, startDate, endDate, version, members, projectManager } = req.body;
    console.log('Request body:', { projectId, name, projectManager });
    if (!projectId || !name || !projectManager) {
      return next(createError(400, 'Vui lòng nhập đầy đủ mã dự án, tên dự án và người phụ trách.'));
    }
    // Kiểm tra xem projectId đã tồn tại chưa
    const existingProject = await Project.findOne({ projectId });
    if (existingProject) {
      return next(createError(400, 'Mã dự án đã tồn tại'));
    }
    // Xử lý members
    let memberList = [];
    let membersArr = [];
    if (typeof members === 'string') {
      try {
        membersArr = JSON.parse(members);
      } catch {}
    } else if (Array.isArray(members)) {
      membersArr = members;
    }
    for (const m of membersArr) {
      const user = await User.findById(m.user);
      if (user) {
        memberList.push({ user: user._id });
      }
    }
    // Xử lý files (Cloudinary)
     let files = [];
     if (req.files && req.files.length > 0) {
       for (const file of req.files) {
           files.push({
           url: file.path,
           publicId: file.filename,
             fileName: file.originalname,
             fileSize: file.size,
             contentType: file.mimetype,
             uploadedBy: req.user._id,
             uploadedAt: new Date()
           });
       }
     }
    // Tạo project
    const project = new Project({
      projectId,
      name,
      description,
      startDate,
      endDate,
      version,
      status: 'Khởi tạo', // Tự động active, không cần xác nhận
      createdBy: req.user._id,
      projectManager, // Người phụ trách project
      members: memberList,
      files,
      history: [{
        action: 'tạo dự án',
        fromUser: req.user._id,
        timestamp: new Date(),
        description: `đã tạo dự án "${name}"`,
        isPrimary: true // Đây là hành động gốc, phải là primary
      }]
    });
    await project.save();

    // Gửi notification cho người phụ trách project (BA được assign)
    try {
      console.log('Bắt đầu gửi notification cho assigned BA:', projectManager);
      const assignedBAUser = await User.findById(projectManager);
      console.log('Assigned BA user tìm thấy:', assignedBAUser);
      if (assignedBAUser) {
        console.log('Gửi workflow notification...');
        const notifications = await require('../services/notificationService').createWorkflowNotification(
          'project_assigned',
          { 
            projectName: project.name,
            refId: project._id.toString()
          },
          { 
            assignedUserId: assignedBAUser._id.toString()
          }
        );
        console.log('Notification sent successfully to BA:', notifications);
        
        // Test direct socket notification
        try {
          const testNotification = {
            _id: new Date().getTime(),
            message: `TEST: Bạn được giao project ${project.name}`,
            type: 'project_assigned',
            refId: project._id.toString(),
            createdAt: new Date()
          };
          console.log('Sending direct socket test to:', assignedBAUser._id.toString());
          socketManager.sendNotification(assignedBAUser._id.toString(), testNotification);
          console.log('Direct socket test sent');
        } catch (socketErr) {
          console.error('Direct socket test failed:', socketErr);
        }
      } else {
        console.log('Không tìm thấy assigned BA user với ID:', projectManager);
      }
    } catch (err) {
      console.error('projectController: failed to create notification for assigned BA', { projectManager, err });
    }

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

// Get all projects
exports.getProjects = async (req, res, next) => {
  try {
    // If the logged-in user is a BA, only return projects assigned to them
    const query = {};
    if (req.user && req.user.role === 'BA') {
      query.projectManager = req.user._id;
    }

    const projects = await Project.find(query)
      .populate('createdBy', 'name email role')
      .populate('members.user', 'userID name email phoneNumber role')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    next(error);
  }
};

// Get a single project
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('members.user', 'userID name email phoneNumber role')
      .populate('files.uploadedBy', 'name email')
      .populate('history.fromUser', 'name email');
    if (!project) {
      return next(createError(404, 'Project not found'));
    }
    res.json(project);
  } catch (error) {
    next(error);
  }
};

// Update project
exports.updateProject = async (req, res, next) => {
  try {
    const { name, description, startDate, endDate, version, members, keepFiles } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return next(createError(404, 'Project not found'));
    }
    const oldValue = {
      name: project.name,
      description: project.description,
      startDate: project.startDate,
      endDate: project.endDate,
      version: project.version,
      files: project.files.map(f => ({ publicId: f.publicId, fileName: f.fileName }))
    };

    // Cập nhật members
    if (Array.isArray(members)) {
      let memberList = [];
      for (const m of members) {
        const user = await User.findById(m.user);
        if (user) {
          memberList.push({ user: user._id });
        }
      }
      project.members = memberList;
    }
    
    // Xử lý overviewDocs (upload/xóa file) chỉ khi keepFiles được cung cấp
    if (keepFiles !== undefined) {
      let keepPublicIds = [];
      if (typeof keepFiles === 'string') {
        try { keepPublicIds = JSON.parse(keepFiles); } catch {}
      } else if (Array.isArray(keepFiles)) {
        keepPublicIds = keepFiles;
      }
      // Xóa file không còn giữ lại
      if (project.files && project.files.length > 0) {
        const toDelete = project.files.filter(f => !keepPublicIds.includes(f.publicId));
        for (const doc of toDelete) {
          if (doc.publicId) {
            try { await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'auto' }); } catch {}
          }
          project.history.push({
            action: `xóa file`,
            fromUser: req.user._id,
            timestamp: new Date(),
            description: `đã xóa file "${doc.fileName}" khỏi dự án "${project.name}"`,
            isPrimary: true
          });
        }
        project.files = project.files.filter(f => keepPublicIds.includes(f.publicId));
      }
    }

    // Thêm file mới
     if (req.files && req.files.length > 0) {
       for (const file of req.files) {
           project.files.push({
           url: file.path,
           publicId: file.filename,
             fileName: file.originalname,
             fileSize: file.size,
             contentType: file.mimetype,
             uploadedBy: req.user._id,
             uploadedAt: new Date()
           });
           project.history.push({
             action: `thêm file`,
             fromUser: req.user._id,
             timestamp: new Date(),
             description: `đã thêm file "${file.originalname}" vào dự án "${project.name}"`,
             isPrimary: true
           });
       }
     }
    // Ghi lịch sử chi tiết cho từng trường thay đổi
    const now = new Date();
    if (name && name !== project.name) {
      project.history.push({
        action: 'cập nhật',
        fromUser: req.user._id,
        timestamp: now,
        description: `đã đổi tên dự án từ "${project.name}" thành "${name}"`,
        isPrimary: true
      });
      project.name = name;
    }
    if (description && description !== project.description) {
      project.history.push({
        action: 'cập nhật',
        fromUser: req.user._id,
        timestamp: now,
        description: `đã cập nhật mô tả của dự án "${name}"`,
        isPrimary: true
      });
      project.description = description;
    }
    if (startDate && startDate !== String(project.startDate?.toISOString()?.slice(0,10))) {
      project.history.push({
        action: `cập nhật`,
        fromUser: req.user._id,
        timestamp: now,
        description: `đã thay đổi ngày bắt đầu dự án "${name}" từ ${formatVNDate(project.startDate)} thành ${formatVNDate(startDate)}`,
        isPrimary: true
      });
      project.startDate = startDate;
    }
    if (endDate && endDate !== String(project.endDate?.toISOString()?.slice(0,10))) {
      project.history.push({
        action: `cập nhật`,
        fromUser: req.user._id,
        timestamp: now,
        description: `đã thay đổi ngày kết thúc dự án "${name}" từ ${formatVNDate(project.endDate)} thành ${formatVNDate(endDate)}`,
        isPrimary: true
      });
      project.endDate = endDate;
    }
    if (version && version !== project.version) {
      project.history.push({
        action: `cập nhật`,
        fromUser: req.user._id,
        timestamp: now,
        description: `đã thay đổi phiên bản dự án "${name}" từ ${project.version || ''} thành ${version}`,
        isPrimary: true
      });
      project.version = version;
    }
    await project.save();
    res.json(project);
  } catch (error) {
    next(error);
  }
};

// Delete project
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).populate('files.uploadedBy');
    if (!project) {
      return next(createError(404, 'Project not found'));
    }

    // Block dangerous change: prevent deleting project with data
    const existingModules = await Module.find({ project: project._id });
    if (existingModules.length > 0) {
      return next(createError(400, 'Cannot delete project that contains modules'));
    }
    // Xóa files khỏi Cloudinary
     if (project.files && project.files.length > 0) {
       for (const doc of project.files) {
         if (doc.publicId) {
         try {
             await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'auto' });
           } catch (deleteError) {
             // Bỏ qua lỗi xóa file
           }
         }
   }
     }
    await project.deleteOne();
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
};


// Download file: trả về file stream với Content-Disposition đúng tên gốc
exports.downloadProjectFile = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return next(createError(404, 'Project not found'));
    const file = project.files.find(f => f.publicId === req.params.fileId);
    if (!file) return next(createError(404, 'File not found'));
    // Lấy file từ Cloudinary
    const fileResponse = await axios.get(file.url, { responseType: 'stream' });
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    fileResponse.data.pipe(res);
  } catch (error) {
    next(error);
  }
};

// Upload file to project
exports.uploadProjectFile = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return next(createError(404, 'Project not found'));
    if (!req.file) return next(createError(400, 'No file uploaded'));
    const fileData = {
      url: req.file.path,
      publicId: req.file.filename,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      contentType: req.file.mimetype,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };
    project.files.push(fileData);
    await project.save();
    res.status(201).json(fileData);
  } catch (error) {
    next(error);
  }
};

// Get project files
exports.getProjectFiles = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return next(createError(404, 'Project not found'));
    res.json(project.files);
  } catch (error) {
    next(error);
  }
};

// Delete file from project
exports.deleteProjectFile = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return next(createError(404, 'Project not found'));
    const fileIdx = project.files.findIndex(f => f.publicId === req.params.fileId);
    if (fileIdx === -1) return next(createError(404, 'File not found'));
    const file = project.files[fileIdx];
    await cloudinary.uploader.destroy(file.publicId, { resource_type: 'auto' });
    project.files.splice(fileIdx, 1);
    await project.save();
    res.json({ message: 'Đã xóa file thành công.' });
  } catch (error) {
    next(error);
  }
};

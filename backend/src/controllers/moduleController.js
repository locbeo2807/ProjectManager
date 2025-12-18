const Module = require('../models/Module');
const Project = require('../models/Project');
const Release = require('../models/Release');
const User = require('../models/User');
const socketManager = require('../socket');
const { createError } = require('../utils/error');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');
const { formatVNDate } = require('../utils/dateFormatter');
const { createWorkflowNotification } = require('../services/notificationService');

// Thêm thành viên vào module

exports.addMembersToModule = async (req, res, next) => {
  try {
    
    const { members } = req.body;
    const moduleId = req.params.id;

    if (!members || !Array.isArray(members) || members.length === 0) {
      return next(createError(400, 'Vui lòng cung cấp danh sách thành viên.'));
    }

    const module = await Module.findById(moduleId).populate('project');
    if (!module) return next(createError(404, 'Module not found'));

    // Kiểm tra quyền - chỉ PM hoặc BA của project mới có thể thêm thành viên
    const currentUser = req.user;
    const project = module.project;
    
    // Kiểm tra xem user có phải là PM của project không
    const isProjectManager = project.projectManager && project.projectManager.toString() === currentUser._id.toString();
    
    // Kiểm tra xem user có phải là BA không
    const isBA = currentUser.role === 'BA';
    
    // Kiểm tra xem user có là owner của module không (BA role)
    const isModuleOwner = module.owner && module.owner.toString() === currentUser._id.toString();
    
    if (!isProjectManager && !isBA && !isModuleOwner) {
      return next(createError(403, 'Bạn không có quyền thêm thành viên vào module này.'));
    }

    // Thêm thành viên mới
    const newMembers = [];
    console.log('Processing members:', members);
    console.log('Current module members:', module.members || []);
    
    // Đảm bảo module.members là mảng
    if (!module.members) {
      module.members = [];
    }
    
    for (const memberData of members) {
      console.log('Processing member data:', memberData);
      const user = await User.findById(memberData.user);
      console.log('Found user:', user);
      
      if (!user) {
        console.log('User not found, skipping');
        continue;
      }

      // Kiểm tra thành viên đã tồn tại chưa
      const existingMember = module.members.find(m => m.user.toString() === user._id.toString());
      console.log('Existing member:', existingMember);
      
      if (!existingMember) {
        console.log('Adding new member to module');
        module.members.push({
          user: user._id,
          role: memberData.role || 'member',
          addedAt: new Date(),
          addedBy: req.user._id
        });
        newMembers.push(user);
      } else {
        console.log('User already exists in module');
      }
    }

    // Lưu module
    await module.save();

    // Gửi thông báo cho thành viên mới
    for (const user of newMembers) {
      await createWorkflowNotification('module_assigned', {
        moduleName: module.name,
        refId: module._id.toString(),
        assignedByName: req.user.name
      }, {
        assigneeId: user._id.toString()
      });
    }

    // Populate thông tin thành viên
    await module.populate('members.user', 'name email role');

    res.json({
      message: `Đã thêm ${newMembers.length} thành viên vào module thành công.`,
      module
    });
  } catch (error) {
    next(error);
  }
};

// Tạo module mới
exports.createModule = async (req, res, next) => {
  // Chỉ BA mới có quyền tạo module
  if (req.user.role !== 'BA') {
    return next(createError(403, 'Chỉ BA mới có quyền tạo module mới.')); // Đã đúng, giữ nguyên
  }
  try {
    const { moduleId, name, description, version, status, owner, projectId, startDate, endDate } = req.body;
    if (!moduleId || !name || !projectId) {
      return next(createError(400, 'Vui lòng nhập đầy đủ mã module, tên module và projectId.'));
    }
    const project = await Project.findById(projectId);
    if (!project) return next(createError(404, 'Project not found'));
    // Xử lý owner theo workflow mới: Owner = BA (Module Owner)
    let ownerUser = null;
    if (owner) {
      ownerUser = await User.findById(owner);
      if (!ownerUser) return next(createError(404, 'Owner user not found'));
      if (ownerUser.role !== 'BA') {
        return next(createError(400, 'Người phụ trách module phải là BA (Module Owner).'));
      }
    } else {
      // Mặc định: BA tạo module là Owner
      ownerUser = await User.findById(req.user._id);
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
    // Tạo module
    const module = new Module({
      moduleId,
      name,
      description,
      version,
      status: status || 'Proposed',
      createdBy: req.user._id,
      owner: ownerUser ? ownerUser._id : undefined,
      project: project._id,
      files,
      startDate,
      endDate,
      history: [{
        action: 'tạo module',
        fromUser: req.user._id,
        timestamp: new Date(),
        description: `đã tạo module "${name}"`,
        isPrimary: false // Log này không phải là log chính
      }],
    });
    await module.save();
    // Ghi lịch sử tạo module vào project
    project.history.push({
      action: 'tạo module',
      module: module._id,
      fromUser: req.user._id,
      timestamp: new Date(),
      description: `đã tạo module "${module.name}" trong dự án "${project.name}"`,
      isPrimary: true // Đây là log chính cho Dashboard
    });
    await project.save();
    // Gửi realtime cập nhật project
    socketManager.broadcastToProjectRoom(project._id, 'project_updated', { project });

    // Gửi thông báo workflow cho các role phù hợp
    await createWorkflowNotification('module_created', {
      moduleName: name,
      projectName: project.name,
      refId: module._id.toString()
    }, {
      projectManagerId: project.projectManager?.toString() || null
    });

    // Thông báo cho người phụ trách module nếu có
    if (ownerUser) {
      await createWorkflowNotification('module_assigned', {
        moduleName: name,
        projectName: project.name,
        refId: module._id.toString(),
        assignedByName: req.user.name
      }, {
        assigneeId: ownerUser._id.toString()
      });
    }
    res.status(201).json(module);
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách module theo project
exports.getModulesByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const modules = await Module.find({ project: projectId })
      .populate('owner', 'name email')
      .populate('members.user', 'name email role');
    res.json(modules);
  } catch (error) {
    next(error);
  }
};

// Lấy chi tiết module
exports.getModule = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('files.uploadedBy', 'name email')
      .populate({
        path: 'project',
        populate: { path: 'members.user', select: 'userID name email phoneNumber role' }
      })
      .populate('history.fromUser', 'name email');
    if (!module) return next(createError(404, 'Module not found'));
    res.json(module);
  } catch (error) {
    next(error);
  }
};

// Cập nhật module
exports.updateModule = async (req, res, next) => {
  try {
    const { name, description, version, status, owner, startDate, endDate, keepFiles } = req.body;
    const module = await Module.findById(req.params.id);
    if (!module) return next(createError(404, 'Module not found'));

    // Xử lý tài liệu docs only if keepFiles is provided
    if (keepFiles !== undefined) {
      let keepPublicIds = [];
      if (typeof keepFiles === 'string') {
        try { keepPublicIds = JSON.parse(keepFiles); } catch {}
      } else if (Array.isArray(keepFiles)) {
        keepPublicIds = keepFiles;
      }

      // Xóa file cũ không còn giữ
       if (module.files && module.files.length > 0) {
         const toDelete = module.files.filter(f => !keepPublicIds.includes(f.publicId));
         for (const doc of toDelete) {
           if (doc.publicId) {
             try { await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'auto' }); } catch {}
           }
           // Ghi lịch sử xóa file
           module.history.push({
             action: `xóa file`,
             fromUser: req.user._id,
             timestamp: new Date(),
             description: `đã xóa file "${doc.fileName}" khỏi module "${module.name}"`,
             isPrimary: true
           });
         }
         // Chỉ giữ lại file còn trong keepPublicIds
         module.files = module.files.filter(f => keepPublicIds.includes(f.publicId));
       }
    }
    
    // Thêm file mới
     if (req.files && req.files.length > 0) {
       for (const file of req.files) {
         module.files.push({
           url: file.path,
           publicId: file.filename,
           fileName: file.originalname,
           fileSize: file.size,
           contentType: file.mimetype,
           uploadedBy: req.user._id,
           uploadedAt: new Date()
         });
         // Ghi lịch sử thêm file
         module.history.push({
           action: `thêm file`,
           fromUser: req.user._id,
           timestamp: new Date(),
           description: `đã thêm file "${file.originalname}" vào module "${module.name}"`,
           isPrimary: true
         });
       }
     }

    // Ghi lịch sử chi tiết cho từng trường thay đổi
    const now = new Date();

    // Cập nhật tên module
    if (name && name !== module.name) {
      module.history.push({
        action: 'cập nhật',
        fromUser: req.user._id,
        timestamp: now,
        description: `đã đổi tên module từ "${module.name}" thành "${name}"`,
        isPrimary: true
      });
      module.name = name;
    }

    // Cập nhật mô tả
    if (description && description !== module.description) {
      module.history.push({
        action: 'cập nhật',
        fromUser: req.user._id,
        timestamp: now,
        description: `đã cập nhật mô tả của module "${name}"`,
        isPrimary: true
      });
      module.description = description;
    }

    // Cập nhật phiên bản
    if (version && version !== module.version) {
      module.history.push({
        action: 'cập nhật',
        fromUser: req.user._id,
        timestamp: now,
        description: `đã thay đổi phiên bản module "${name}" từ "${module.version || ''}" thành "${version}"`,
        isPrimary: true
      });
      module.version = version;
    }

    // Cập nhật trạng thái (kèm validation chuyển trạng thái theo vai trò)
    if (status && status !== module.status) {
      const old = module.status;
      const nextStatus = status;
      const role = req.user.role;
      const allowedTransitions = {
        Proposed: ['Approved'],
        Approved: ['Active'],
        Active: ['Ready for Release'],
        'Ready for Release': ['Released'],
        Released: ['Maintained', 'Archived'],
        Maintained: ['Archived'],
        Archived: []
      };
      const roleGate = {
        Approved: ['PM', 'PO'],
        Active: ['BA', 'Tech Lead'],
        'Ready for Release': ['QA', 'Tech Lead'],
        Released: ['DevOps', 'PM', 'PO'],
        Maintained: ['PM', 'PO'],
        Archived: ['PM', 'PO']
      };
      const canTransition = (allowedTransitions[old] || []).includes(nextStatus);
      const roleAllowed = !roleGate[nextStatus] || roleGate[nextStatus].includes(role);
      if (!canTransition) {
        return next(createError(400, `Chuyển trạng thái từ "${old}" sang "${nextStatus}" không hợp lệ.`));
      }
      if (!roleAllowed) {
        return next(createError(403, `Vai trò ${role} không được phép chuyển sang trạng thái "${nextStatus}".`));
      }
      module.history.push({
        action: 'cập nhật',
        fromUser: req.user._id,
        timestamp: now,
        description: `đã thay đổi trạng thái module "${name}" từ "${old}" thành "${nextStatus}"`,
        isPrimary: true
      });
      module.status = nextStatus;

      // Tự động cập nhật trạng thái project dựa trên trạng thái modules
      await updateProjectStatusBasedOnModules(module.project);
    }

    // Cập nhật người phụ trách - theo workflow mới: chỉ BA được làm Owner
    if (owner && owner !== String(module.owner)) {
      const ownerUser = await User.findById(owner);
      if (!ownerUser) return next(createError(404, 'Owner user not found'));
      if (ownerUser.role !== 'BA') {
        return next(createError(400, 'Người phụ trách module phải là BA (Module Owner).'));
      }

      const oldOwner = module.owner;
      module.owner = ownerUser._id;

      const oldOwnerUser = await User.findById(oldOwner);
      const oldOwnerName = oldOwnerUser ? oldOwnerUser.name : 'không có';

      module.history.push({
        action: 'cập nhật',
        fromUser: req.user._id,
        timestamp: now,
        description: `đã thay đổi người phụ trách module "${name || module.name}" từ "${oldOwnerName}" thành "${ownerUser.name}"`,
        isPrimary: true
      });

      // Gửi thông báo cho người phụ trách mới
      await createWorkflowNotification('module_assigned', {
        moduleName: name || module.name,
        projectName: (await Project.findById(module.project)).name,
        refId: module._id.toString(),
        assignedByName: req.user.name
      }, {
        assigneeId: ownerUser._id.toString()
      });
    }

    // Cập nhật ngày bắt đầu
    if (startDate && startDate !== String(module.startDate?.toISOString()?.slice(0,10))) {
      module.history.push({
        action: 'cập nhật',
        fromUser: req.user._id,
        timestamp: now,
        description: `đã thay đổi ngày bắt đầu module "${name}" từ ${formatVNDate(module.startDate)} thành ${formatVNDate(startDate)}`,
        isPrimary: true
      });
      module.startDate = startDate;
    }

    // Cập nhật ngày kết thúc
    if (endDate && endDate !== String(module.endDate?.toISOString()?.slice(0,10))) {
      module.history.push({
        action: 'cập nhật',
        fromUser: req.user._id,
        timestamp: now,
        description: `đã thay đổi ngày kết thúc module "${name}" từ ${formatVNDate(module.endDate)} thành ${formatVNDate(endDate)}`,
        isPrimary: true
      });
      module.endDate = endDate;
    }

    await module.save();
    res.json(module);
  } catch (error) {
    next(error);
  }
};

// Xóa module
exports.deleteModule = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.id).populate('files.uploadedBy');
    if (!module) return next(createError(404, 'Module not found'));

    // Phân quyền: chỉ PM hoặc BA mới được xóa
    if (req.user.role !== 'PM' && req.user.role !== 'BA') {
      return next(createError(403, 'Bạn không có quyền xóa module này.'));
    }

    const projectId = module.project;

    // Xóa files khỏi Cloudinary
    if (module.files && module.files.length > 0) {
      for (const doc of module.files) {
        if (doc.publicId) {
          try {
            await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'auto' });
          } catch (deleteError) {}
        }
      }
    }
    await module.deleteOne();

    // Tự động cập nhật trạng thái project sau khi xóa module
    await updateProjectStatusBasedOnModules(projectId);

    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Lấy tất cả module (toàn hệ thống)
exports.getAllModules = async (req, res, next) => {
  try {
    const modules = await Module.find()
      .populate({
        path: 'project',
        select: 'name members', 
        populate: {
          path: 'members.user', 
          select: '_id name email'
        }
      })
      .populate('owner', 'name email');
    res.json(modules);
  } catch (error) {
    next(error);
  }
};

// Download file: trả về file stream với Content-Disposition đúng tên gốc
exports.downloadModuleFile = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.moduleId);
    if (!module) return next(createError(404, 'Module not found'));
    const file = module.files.find(f => f.publicId === req.params.fileId);
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

// Upload file to module
exports.uploadModuleFile = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.moduleId);
    if (!module) return next(createError(404, 'Module not found'));
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
    module.files.push(fileData);
    await module.save();
    res.status(201).json(fileData);
  } catch (error) {
    next(error);
  }
};

// Get module files
exports.getModuleFiles = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.moduleId);
    if (!module) return next(createError(404, 'Module not found'));
    res.json(module.files);
  } catch (error) {
    next(error);
  }
};

// Delete file from module
exports.deleteModuleFile = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.moduleId);
    if (!module) return next(createError(404, 'Module not found'));
    const fileIdx = module.files.findIndex(f => f.publicId === req.params.fileId);
    if (fileIdx === -1) return next(createError(404, 'File not found'));
    const file = module.files[fileIdx];
    await cloudinary.uploader.destroy(file.publicId, { resource_type: 'auto' });
    module.files.splice(fileIdx, 1);
    await module.save();
    res.json({ message: 'Đã xóa file thành công.' });
  } catch (error) {
    next(error);
  }
};

// Hàm tự động cập nhật trạng thái project dựa trên trạng thái modules (workflow mới)
const updateProjectStatusBasedOnModules = async (projectId) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) return;

    // Lấy tất cả modules của project
    const modules = await Module.find({ project: projectId });

    // Logic trạng thái project (mới):
    // - "Khởi tạo": không có module hoặc tất cả ở Proposed/Approved
    // - "Đang triển khai": có ít nhất 1 module ở Active/Ready for Release/Released/Maintained
    // - "Hoàn thành": tất cả modules ở Released/Maintained/Archived

    let newStatus = 'Khởi tạo'; // Default

    if (modules.length > 0) {
      const activeStatuses = ['Active', 'Ready for Release', 'Released', 'Maintained'];
      const doneStatuses = ['Released', 'Maintained', 'Archived'];
      const hasActive = modules.some(m => activeStatuses.includes(m.status));
      const allDone = modules.every(m => doneStatuses.includes(m.status));
      if (allDone) newStatus = 'Hoàn thành';
      else if (hasActive) newStatus = 'Đang triển khai';
    }

    // Cập nhật trạng thái nếu có thay đổi
    if (newStatus !== project.status) {
      const oldStatus = project.status;
      project.status = newStatus;

      // Thêm vào lịch sử
      project.history.push({
        action: 'tự động cập nhật',
        fromUser: null, // Hệ thống tự động
        timestamp: new Date(),
        description: `trạng thái dự án tự động chuyển từ "${oldStatus}" sang "${newStatus}" dựa trên trạng thái modules`,
        isPrimary: true
      });

      await project.save();

      // Gửi realtime cập nhật project
      socketManager.broadcastToProjectRoom(project._id, 'project_updated', { project });
    }
  } catch (error) {
    console.error('Error updating project status based on modules:', error);
  }
};

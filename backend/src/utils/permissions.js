// Hệ thống phân quyền ABAC (Attribute-Based Access Control)
// Quản lý phân quyền cấp doanh nghiệp cho 8 vai trò chuyên nghiệp

const PERMISSIONS = {
  // 🎯 PM: tạo/điều phối Project, có thể đọc & chỉnh Task khi cần nhưng không tạo Task hằng ngày
  'PM': {
    'Task': ['read', 'update'],
    'Sprint': ['read', 'update'],
    'Module': ['read', 'update'],
    'Release': ['read', 'update'],
    'Project': ['create', 'read', 'update', 'delete'],
    'Risk': ['read', 'update'],
    'TechnicalDebt': ['read'],
    'Epic': ['read', 'update']
  },

  // 📊 BA: chủ workflow – tạo Module/Sprint/Task và phân công
  'BA': {
    'Task': ['create', 'read', 'update', 'delete'],
    'Sprint': ['create', 'read', 'update', 'delete'],
    'Module': ['create', 'read', 'update', 'delete'],
    'Release': ['create', 'read', 'update', 'delete'],
    'Project': ['read', 'update'],
    'Risk': ['create', 'read', 'update'],
    'TechnicalDebt': ['read'],
    'Epic': ['create', 'read', 'update', 'delete']
  },

  // 👨‍💻 Developer: thực hiện Task, chỉ đụng Task của mình (bị giới hạn thêm ở checkAttributeConstraints)
  'Developer': {
    'Task': ['read', 'update'],
    'Sprint': ['read'],
    'Module': ['read'],
    'Release': ['read'],
    'Project': ['read'],
    'Risk': ['read'],
    'TechnicalDebt': ['read', 'update'],
    'Epic': ['read']
  },

  // 🧪 QA Tester: kiểm thử/review, không tạo Task
  'QA Tester': {
    'Task': ['read', 'update'],
    'Sprint': ['read'],
    'Module': ['read'],
    'Release': ['read'],
    'Project': ['read'],
    'Risk': ['read'],
    'TechnicalDebt': ['read'],
    'Epic': ['read']
  },

  // 🔍 QC: quản lý Risk & chất lượng
  'QC': {
    'Task': ['read'],
    'Sprint': ['read'],
    'Module': ['read'],
    'Release': ['read'],
    'Project': ['read'],
    'Risk': ['create', 'read', 'update'],
    'TechnicalDebt': ['read'],
    'Epic': ['read']
  },

  // 👑 Scrum Master: hỗ trợ quy trình, đọc & theo dõi sprint
  'Scrum Master': {
    'Task': ['read'],
    'Sprint': ['read', 'update'],
    'Module': ['read'],
    'Release': ['read'],
    'Project': ['read'],
    'Risk': ['read'],
    'TechnicalDebt': ['read'],
    'Epic': ['read']
  },

  // 🚀 DevOps: tập trung vào release/deploy
  'DevOps Engineer': {
    'Task': ['read'],
    'Sprint': ['read'],
    'Module': ['read'],
    'Release': ['create', 'read', 'update', 'delete'],
    'Project': ['read'],
    'Risk': ['read'],
    'TechnicalDebt': ['read'],
    'Epic': ['read']
  },

  // 🎯 Product Owner: xem & chấp nhận kết quả, không tạo Task
  'Product Owner': {
    'Task': ['read'],
    'Sprint': ['read'],
    'Module': ['read'],
    'Release': ['read'],
    'Project': ['read', 'update'],
    'Risk': ['read'],
    'TechnicalDebt': ['read'],
    'Epic': ['read']
  }
};

/**
 * Check if user has permission for a specific action on a resource
 * @param {string} userRole - User's role
 * @param {string} resource - Resource type (Task, Project, etc.)
 * @param {string} action - Action type (create, read, update, delete)
 * @param {object} context - Additional context for attribute-based checks
 * @returns {boolean} - True if permission granted
 */
const hasPermission = (userRole, resource, action, context = {}) => {
  // Ghi đè admin (nếu cần trong tương lai)
  if (userRole === 'admin') return true;

  // Kiểm tra vai trò có tồn tại không
  if (!PERMISSIONS[userRole]) {
    return false;
  }

  // Kiểm tra tài nguyên có tồn tại cho vai trò này không
  if (!PERMISSIONS[userRole][resource]) {
    return false;
  }

  // Kiểm tra hành động có được phép không
  if (!PERMISSIONS[userRole][resource].includes(action)) {
    return false;
  }

  // Kiểm tra thuộc tính bổ sung
  return checkAttributeConstraints(userRole, resource, action, context);
};

/**
 * Additional attribute-based constraints beyond basic role permissions
 * @param {string} userRole - User's role
 * @param {string} resource - Resource type
 * @param {string} action - Action type
 * @param {object} context - Context with additional attributes
 * @returns {boolean} - True if constraints satisfied
 */
const checkAttributeConstraints = (userRole, resource, action, context) => {
  const { userId, resourceOwner, taskAssignee, taskReviewer, sprintMembers, projectMembers } = context;

  switch (resource) {
    case 'Task':
      // Lập trình viên chỉ có thể cập nhật nhiệm vụ của chính mình
      if (userRole === 'Developer' && action === 'update' && taskAssignee && taskAssignee !== userId) {
        return false;
      }
      // Lập trình viên chỉ có thể đọc nhiệm vụ của chính mình
      if (userRole === 'Developer' && action === 'read' && taskAssignee && taskAssignee !== userId) {
        return false;
      }
      // QA Tester chỉ có thể cập nhật nhiệm vụ được giao để xem xét
      if (userRole === 'QA Tester' && action === 'update' && taskReviewer && taskReviewer !== userId) {
        return false;
      }
      break;

    case 'Sprint':
      // Thành viên nhóm chỉ có thể cập nhật sprint mà họ tham gia
      if (['Developer', 'QA Tester'].includes(userRole) && action === 'update' && sprintMembers && !sprintMembers.includes(userId)) {
        return false;
      }
      break;

    case 'Module':
      // BA chỉ có thể cập nhật module mà họ sở hữu
      if (userRole === 'BA' && action === 'update' && resourceOwner && resourceOwner !== userId) {
        return false;
      }
      break;

    case 'Project':
      // Thành viên nhóm chỉ có thể đọc dự án mà họ tham gia (trừ BA có thể đọc tất cả)
      if (!['PM', 'BA', 'Product Owner'].includes(userRole) && action === 'read' && projectMembers && !projectMembers.includes(userId)) {
        return false;
      }
      break;

    case 'Risk':
      // Người dùng chỉ có thể cập nhật rủi ro được giao cho họ
      if (['BA', 'QC', 'Product Owner'].includes(userRole) && action === 'update' && resourceOwner && resourceOwner !== userId) {
        return false;
      }
      break;

    case 'TechnicalDebt':
      // Chỉ lập trình viên được giao mới có thể cập nhật nợ kỹ thuật
      if (userRole === 'Developer' && action === 'update' && resourceOwner && resourceOwner !== userId) {
        return false;
      }
      break;
  }

  return true;
};

/**
 * Middleware function for Express routes
 * @param {string} resource - Resource type
 * @param {string} action - Action type
 * @param {function} contextExtractor - Function to extract context from request
 * @returns {function} - Express middleware function
 */
const requirePermission = (resource, action, contextExtractor = null) => {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;
      const userId = req.user._id.toString();

      // Trích xuất ngữ cảnh nếu được cung cấp
      let context = { userId };
      if (contextExtractor && typeof contextExtractor === 'function') {
        context = { ...context, ...contextExtractor(req) };
      }

      if (!hasPermission(userRole, resource, action, context)) {
        return res.status(403).json({
          message: `${userRole} cannot ${action} ${resource}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        message: 'Permission validation failed'
      });
    }
  };
};

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {object} - Permissions object
 */
const getRolePermissions = (role) => {
  return PERMISSIONS[role] || {};
};

/**
 * Check if user can perform action on specific resource instance
 * @param {object} user - User object
 * @param {string} resource - Resource type
 * @param {string} action - Action type
 * @param {object} resourceInstance - Resource instance
 * @returns {boolean} - True if allowed
 */
const canAccessResource = (user, resource, action, resourceInstance) => {
  const context = {
    userId: user._id.toString(),
    resourceOwner: resourceInstance.createdBy || resourceInstance.owner,
    taskAssignee: resourceInstance.assignee,
    taskReviewer: resourceInstance.reviewer,
    sprintMembers: resourceInstance.members?.map(m => m.user?.toString()),
    projectMembers: resourceInstance.members?.map(m => m.user?.toString())
  };

  return hasPermission(user.role, resource, action, context);
};

module.exports = {
  hasPermission,
  requirePermission,
  getRolePermissions,
  canAccessResource,
  PERMISSIONS
};
// Hằng số Workflow Doanh nghiệp
// Định nghĩa workflow chuyên nghiệp cho 8 vai trò và vòng đời task hoàn chỉnh

// Luồng Trạng thái Task - Workflow Scrum/Agile chuyên nghiệp
export const TASK_STATUS_FLOW = {
  'Hàng đợi': {
    label: 'Hàng đợi',
    color: '#6c757d',
    next: ['Chưa làm'],
    allowedRoles: ['PM', 'BA', 'Scrum Master']
  },
  'Chưa làm': {
    label: 'Chưa làm',
    color: '#17a2b8',
    next: ['Đang làm'],
    allowedRoles: ['Developer', 'QA Tester']
  },
  'Đang làm': {
    label: 'Đang làm',
    color: '#ffc107',
    next: ['Đang xem xét'],
    allowedRoles: ['Developer']
  },
  'Đang xem xét': {
    label: 'Đang xem xét',
    color: '#fd7e14',
    next: ['Kiểm thử QA', 'Đang làm'],
    allowedRoles: ['Developer']
  },
  'Kiểm thử QA': {
    label: 'Kiểm thử QA',
    color: '#6f42c1',
    next: ['Sẵn sàng phát hành', 'Đang làm'],
    allowedRoles: ['QA Tester']
  },
  'Sẵn sàng phát hành': {
    label: 'Sẵn sàng phát hành',
    color: '#20c997',
    next: ['Hoàn thành'],
    allowedRoles: ['DevOps Engineer', 'PM']
  },
  'Hoàn thành': {
    label: 'Hoàn thành',
    color: '#28a745',
    next: [],
    allowedRoles: ['DevOps Engineer', 'PM']
  }
};

// Luồng trạng thái dành riêng cho Bug
export const BUG_STATUS_FLOW = {
  'Mới': {
    label: 'Mới',
    color: '#dc3545',
    next: ['Đang xác nhận'],
    allowedRoles: ['QA Tester', 'BA']
  },
  'Đang xác nhận': {
    label: 'Đang xác nhận',
    color: '#fd7e14',
    next: ['Đang sửa'],
    allowedRoles: ['BA', 'Developer']
  },
  'Đang sửa': {
    label: 'Đang sửa',
    color: '#ffc107',
    next: ['Kiểm thử lại'],
    allowedRoles: ['Developer']
  },
  'Kiểm thử lại': {
    label: 'Kiểm thử lại',
    color: '#6f42c1',
    next: ['Đã đóng', 'Đang sửa'],
    allowedRoles: ['QA Tester']
  },
  'Đã đóng': {
    label: 'Đã đóng',
    color: '#28a745',
    next: [],
    allowedRoles: ['QA Tester', 'BA']
  }
};

// Trạng thái Workflow Kinh doanh - Quy trình xác thực BA và PO
export const BUSINESS_WORKFLOW = {
  'baConfirmRequirement': {
    label: 'BA Confirm Requirements',
    description: 'Business Analyst confirms requirements are clear and complete',
    required: true
  },
  'baApproveUI': {
    label: 'BA Approve UI/UX',
    description: 'Business Analyst approves user interface and experience design',
    required: true
  },
  'baAcceptFeature': {
    label: 'BA Accept Feature',
    description: 'Business Analyst accepts the completed feature',
    required: true
  },
  'poAcceptFeature': {
    label: 'PO Final Acceptance',
    description: 'Product Owner provides final acceptance of the completed feature',
    required: true
  }
};

// Luồng Trạng thái Review
export const REVIEW_STATUS_FLOW = {
  'Chưa': {
    label: 'Chưa review',
    color: '#6c757d',
    next: ['Đạt', 'Không đạt'],
    allowedRoles: ['QA Tester', 'BA', 'Scrum Master']
  },
  'Đạt': {
    label: 'Đạt',
    color: '#28a745',
    next: [],
    allowedRoles: ['QA Tester', 'BA']
  },
  'Không đạt': {
    label: 'Không đạt',
    color: '#dc3545',
    next: ['Đạt'],
    allowedRoles: ['QA Tester', 'BA']
  }
};

// Quyền hạn Vai trò - Ma trận quyền frontend
export const ROLE_PERMISSIONS = {
  'PM': {
    canCreateProject: true,
    // PM không trực tiếp tạo sprint/task hằng ngày
    canCreateSprint: false,
    canCreateTask: false,
    canAssignTasks: false,
    canViewAllProjects: true,
    canManageTeam: true,
    canApproveDeployments: true,
    dashboardWidgets: ['projectOverview', 'teamPerformance', 'slaCompliance', 'budgetTracking']
  },
  'BA': {
    // BA là người tạo module / sprint / task
    canCreateModule: true,
    canCreateRelease: true, // vẫn giữ để không phá code cũ, dù release ít dùng
    canCreateTask: true,
    canReviewRequirements: true,
    canApproveUI: true,
    canAcceptFeatures: true,
    canViewAllProjects: true,
    dashboardWidgets: ['requirements', 'acceptanceCriteria', 'myTasks']
  },
  'Developer': {
    canUpdateTaskStatus: true,
    canLogTime: true,
    canCreateCodeReviews: true,
    canViewAssignedTasks: true,
    canUpdateTechnicalDebt: true,
    dashboardWidgets: ['myTasks', 'codeQuality', 'velocity', 'technicalDebt']
  },
  'QA Tester': {
    canCreateBugs: true,
    // Task do BA tạo, QA chỉ nhận & review
    canCreateTask: false,
    canUpdateBugStatus: true,
    canReviewTasks: true,
    canExecuteTests: true,
    canViewTestCases: true,
    dashboardWidgets: ['testCases', 'bugReports', 'qualityMetrics', 'slaCompliance']
  },
  'QC': {
    canAuditQuality: true,
    canCreateRisks: true,
    canReviewProcesses: true,
    canApproveQualityGates: true,
    dashboardWidgets: ['qualityAudit', 'riskAssessment', 'compliance', 'processMetrics']
  },
  'Scrum Master': {
    canFacilitateMeetings: true,
    canRemoveImpediments: true,
    canCoachTeam: true,
    canManageSprint: true,
    canCreateTask: false,
    canViewTeamMetrics: true,
    dashboardWidgets: ['teamHealth', 'sprintMetrics', 'impediments', 'retrospectives']
  },
  'DevOps Engineer': {
    canDeployReleases: true,
    canManageInfrastructure: true,
    canMonitorSystems: true,
    canAutomatePipelines: true,
    dashboardWidgets: ['deployments', 'infrastructure', 'monitoring', 'ciCd']
  },
  'Product Owner': {
    canPrioritizeBacklog: true,
    canAcceptDeliverables: true,
    canDefineRequirements: true,
    canCreateTask: false,
    canManageStakeholders: true,
    dashboardWidgets: ['backlog', 'stakeholderFeedback', 'myTasks']
  }
};

// Định nghĩa Loại Task
export const TASK_TYPES = {
  'Feature': {
    icon: '🚀',
    color: '#007bff',
    workflow: TASK_STATUS_FLOW,
    requiresAcceptanceCriteria: true,
    requiresBusinessWorkflow: true
  },
  'Bug': {
    icon: '🐛',
    color: '#dc3545',
    workflow: BUG_STATUS_FLOW,
    requiresAcceptanceCriteria: false,
    requiresBusinessWorkflow: false,
    severityLevels: ['Low', 'Medium', 'High', 'Critical']
  },
  'Improvement': {
    icon: '⚡',
    color: '#ffc107',
    workflow: TASK_STATUS_FLOW,
    requiresAcceptanceCriteria: true,
    requiresBusinessWorkflow: false
  },
  'Research/Spike': {
    icon: '🔬',
    color: '#6f42c1',
    workflow: TASK_STATUS_FLOW,
    requiresAcceptanceCriteria: false,
    requiresBusinessWorkflow: false
  }
};

// Mức Độ Ưu Tiên
export const PRIORITY_LEVELS = {
  'Thấp': { color: '#28a745', weight: 1 },
  'Trung bình': { color: '#ffc107', weight: 2 },
  'Cao': { color: '#fd7e14', weight: 3 },
  'Khẩn cấp': { color: '#dc3545', weight: 4 }
};

// Ngưỡng SLA - Hằng số frontend
export const SLA_THRESHOLDS = {
  taskReview: {
    warning: 20, // hours
    violation: 24 // hours
  },
  bugFix: {
    warning: 48, // hours
    violation: 72 // hours
  },
  prReview: {
    warning: 2, // hours
    violation: 4 // hours
  }
};

// Xác thực Quy tắc Kinh doanh
export const BUSINESS_RULES = {
  // Task không thể đánh dấu Hoàn thành mà không có tiêu chí chấp nhận
  requireAcceptanceCriteria: (task) => {
    return task.taskType !== 'Bug' && task.status === 'Hoàn thành' &&
           (!task.acceptanceCriteria || task.acceptanceCriteria.length === 0);
  },

  // Workflow kinh doanh phải hoàn thành cho các tính năng
  requireBusinessWorkflow: (task) => {
    return task.taskType === 'Feature' && task.status === 'Hoàn thành' &&
           (!task.businessWorkflow?.baConfirmRequirement ||
            !task.businessWorkflow?.baApproveUI ||
            !task.businessWorkflow?.baAcceptFeature ||
            !task.businessWorkflow?.poAcceptFeature);
  },

  // Người review không thể giống với người được giao
  reviewerNotAssignee: (task) => {
    return task.reviewer && task.assignee &&
           task.reviewer._id === task.assignee._id;
  },

  // Các phụ thuộc phải hoàn thành
  dependenciesCompleted: (task) => {
    return task.dependencies && task.dependencies.length > 0 &&
           task.dependencies.some(dep => !['Hoàn thành', 'Cancelled'].includes(dep.status));
  }
};

// Hàm Xác thực Workflow
/**
 * Xác thực chuyển đổi trạng thái task
 * @param {string} currentStatus - Trạng thái hiện tại
 * @param {string} newStatus - Trạng thái mới
 * @param {object} task - Đối tượng task
 * @param {object} user - Đối tượng user
 * @returns {object} - {valid: boolean, reason?: string}
 */
export const validateTaskTransition = (currentStatus, newStatus, task, user) => {
  const workflow = task.taskType === 'Bug' ? BUG_STATUS_FLOW : TASK_STATUS_FLOW;

  // Kiểm tra xem chuyển đổi có được phép không
  if (!workflow[currentStatus]?.next.includes(newStatus)) {
    return { valid: false, reason: `Invalid status transition from ${currentStatus} to ${newStatus}` };
  }

  // Kiểm tra quyền hạn vai trò
  if (!workflow[newStatus]?.allowedRoles.includes(user.role)) {
    return { valid: false, reason: `Role ${user.role} cannot set status to ${newStatus}` };
  }

  // Xác thực quy tắc kinh doanh
  if (newStatus === 'Hoàn thành') {
    if (BUSINESS_RULES.requireAcceptanceCriteria(task)) {
      return { valid: false, reason: 'Acceptance criteria required for completion' };
    }
    if (BUSINESS_RULES.requireBusinessWorkflow(task)) {
      return { valid: false, reason: 'Business workflow must be completed' };
    }
  }

  if (BUSINESS_RULES.reviewerNotAssignee(task)) {
    return { valid: false, reason: 'Reviewer cannot be the same as assignee' };
  }

  if (BUSINESS_RULES.dependenciesCompleted(task)) {
    return { valid: false, reason: 'All dependencies must be completed first' };
  }

  return { valid: true };
};

/**
 * Kiểm tra quyền hạn của user
 * @param {object} user - Đối tượng user
 * @param {string} action - Hành động cần kiểm tra
 * @param {object} resource - Tài nguyên liên quan (optional)
 * @param {object} context - Ngữ cảnh bổ sung (optional)
 * @returns {boolean} - Có quyền hay không
 */
// Hàm Kiểm tra Quyền hạn
export const hasPermission = (user, action, resource = null, context = {}) => {
  if (!user || !user.role) return false;

  const rolePerms = ROLE_PERMISSIONS[user.role];
  if (!rolePerms) return false;

  // Kiểm tra quyền hành động cụ thể
  if (!rolePerms[action]) return false;

  // Kiểm tra theo ngữ cảnh cụ thể
  if (action === 'canUpdateTaskStatus' && resource) {
    // Assignee (Developer), reviewer, PM, BA có thể cập nhật task status
    const isAssignee = resource.assignee && resource.assignee._id === user._id;
    const isReviewer = resource.reviewer && resource.reviewer._id === user._id;
    const isPM = user.role === 'PM';
    const isBA = user.role === 'BA';

    return isAssignee || isReviewer || isPM || isBA;
  }

  if (action === 'canReviewTasks' && resource) {
    // Chỉ người review được chỉ định có thể review
    return resource.reviewer?._id === user._id;
  }

  return true;
/**
 * Lấy màu sắc của trạng thái
 * @param {string} status - Trạng thái
 * @param {string} taskType - Loại task (mặc định 'Feature')
 * @returns {string} - Màu sắc hex
 */
};

// Tiện ích Màu Trạng thái
export const getStatusColor = (status, taskType = 'Feature') => {
  const workflow = taskType === 'Bug' ? BUG_STATUS_FLOW : TASK_STATUS_FLOW;
  return workflow[status]?.color || '#6c757d';
};
/**
 * Lấy nhãn của trạng thái
 * @param {string} status - Trạng thái
 * @param {string} taskType - Loại task (mặc định 'Feature')
 * @returns {string} - Nhãn trạng thái
 */

export const getStatusLabel = (status, taskType = 'Feature') => {
  const workflow = taskType === 'Bug' ? BUG_STATUS_FLOW : TASK_STATUS_FLOW;
  return workflow[status]?.label || status;
};

/**
 * Tính toán tiến độ của task
 * @param {object} task - Đối tượng task
 * @returns {number} - Phần trăm tiến độ (0-100)
 */
// Tiện ích Tính toán Tiến độ
export const calculateTaskProgress = (task) => {
  if (!task.subtasks || task.subtasks.length === 0) {
    // Tiến độ task đơn dựa trên trạng thái
    const statusWeights = {
      'Hàng đợi': 0, 'Chưa làm': 10, 'Đang làm': 40,
      'Đang xem xét': 70, 'Kiểm thử QA': 85, 'Sẵn sàng phát hành': 95, 'Hoàn thành': 100,
      'Mới': 5, 'Đang xác nhận': 20, 'Đang sửa': 60, 'Kiểm thử lại': 80, 'Đã đóng': 100
    };
    return statusWeights[task.status] || 0;
  } else {
    // Task với subtasks
    const completed = task.subtasks.filter(st => st.status === 'Hoàn thành').length;
    return task.subtasks.length > 0 ? (completed / task.subtasks.length) * 100 : 0;
  }
};

export const calculateSprintProgress = (sprint) => {
  if (!sprint.tasks || sprint.tasks.length === 0) return 0;

  const totalPoints = sprint.tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);
/**
 * Tính toán tiến độ của sprint
 * @param {object} sprint - Đối tượng sprint
 * @returns {number} - Phần trăm tiến độ (0-100)
 */
  const completedPoints = sprint.tasks
    .filter(task => task.status === 'Hoàn thành' && task.reviewStatus === 'Đạt')
    .reduce((sum, task) => sum + (task.storyPoints || 0), 0);

  return totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0;
};

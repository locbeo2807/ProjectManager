const Joi = require('joi');

// ObjectId validation pattern
const objectId = Joi.string().regex(/^[a-f\d]{24}$/i);

// Auth schemas
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid('PM', 'BA', 'Developer', 'QA Tester', 'QC', 'Scrum Master', 'DevOps Engineer', 'Product Owner').optional(),
  phoneNumber: Joi.string().optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  status: Joi.string().valid('hoạt động', 'chờ xác thực', 'bị khóa').optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const otpSchema = Joi.object({
  userId: Joi.string().required(),
  otp: Joi.string().length(6).required()
});

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).max(128).required()
});

const resendOtpSchema = Joi.object({
  email: Joi.string().email().required()
});

const userUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('PM', 'BA', 'Developer', 'QA Tester', 'QC', 'Scrum Master', 'DevOps Engineer', 'Product Owner').optional(),
  phoneNumber: Joi.string().optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  status: Joi.string().valid('hoạt động', 'bị khóa', 'chờ xác thực').optional()
});

// Project validation schema
const projectSchema = Joi.object({
  projectId: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  version: Joi.string().optional(),
  status: Joi.string().valid('Khởi tạo', 'Đang triển khai', 'Hoàn thành').optional(),
  createdBy: objectId.required(),
  members: Joi.array().items(Joi.object({
    user: objectId.required()
  })).optional(),
  progress: Joi.number().min(0).max(100).optional(),
  budget: Joi.object({
    estimated: Joi.number().min(0).optional(),
    actual: Joi.number().min(0).optional(),
    currency: Joi.string().optional()
  }).optional(),
  timeline: Joi.object({
    plannedEndDate: Joi.date().optional(),
    forecastedEndDate: Joi.date().optional(),
    delayDays: Joi.number().optional()
  }).optional(),
  overviewDocs: Joi.array().items(Joi.object({
    url: Joi.string().uri().optional(),
    publicId: Joi.string().optional(),
    fileName: Joi.string().optional(),
    fileSize: Joi.number().optional(),
    contentType: Joi.string().optional(),
    uploadedBy: objectId.optional(),
    uploadedAt: Joi.date().optional()
  })).optional()
});

// Module validation schema
const moduleSchema = Joi.object({
  moduleId: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().optional(),
  createdBy: objectId.required(),
  docs: Joi.array().items(Joi.object({
    url: Joi.string().uri().optional(),
    publicId: Joi.string().optional(),
    fileName: Joi.string().optional(),
    fileSize: Joi.number().optional(),
    contentType: Joi.string().optional(),
    uploadedBy: objectId.optional(),
    uploadedAt: Joi.date().optional()
  })).optional(),
  version: Joi.string().optional(),
  status: Joi.string().valid('Chưa phát triển', 'Đang phát triển', 'Hoàn thành').optional(),
  owner: objectId.optional(),
  project: objectId.required(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  progress: Joi.number().min(0).max(100).optional(),
  defectDensity: Joi.number().min(0).optional(),
  codeCoverage: Joi.number().min(0).max(100).optional()
});

// Sprint validation schema
const sprintSchema = Joi.object({
  name: Joi.string().required(),
  goal: Joi.string().optional(),
  createdBy: objectId.required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  status: Joi.string().valid('Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành').optional(),
  members: Joi.array().items(Joi.object({
    user: objectId.optional(),
    role: Joi.string().optional()
  })).optional(),
  module: objectId.required(),
  tasks: Joi.array().items(objectId).optional(),
  docs: Joi.array().items(Joi.object({
    url: Joi.string().uri().optional(),
    publicId: Joi.string().optional(),
    fileName: Joi.string().optional(),
    fileSize: Joi.number().optional(),
    contentType: Joi.string().optional(),
    uploadedBy: objectId.optional(),
    uploadedAt: Joi.date().optional()
  })).optional(),
  repoLink: Joi.string().uri().optional(),
  gitBranch: Joi.string().optional(),
  velocity: Joi.number().min(0).optional()
});

// Release validation schema
const releaseSchema = Joi.object({
  releaseId: Joi.string().required(),
  version: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  status: Joi.string().valid('Chưa bắt đầu', 'Đang chuẩn bị', 'Hoàn thành').optional(),
  createdBy: objectId.required(),
  acceptanceStatus: Joi.string().valid('Chưa', 'Đạt', 'Không đạt').optional(),
  fromUser: objectId.required(),
  toUser: objectId.required(),
  approver: objectId.required(),
  docs: Joi.array().items(Joi.object({
    url: Joi.string().uri().optional(),
    publicId: Joi.string().optional(),
    fileName: Joi.string().optional(),
    fileSize: Joi.number().optional(),
    contentType: Joi.string().optional(),
    uploadedBy: objectId.optional(),
    uploadedAt: Joi.date().optional()
  })).optional(),
  repoLink: Joi.string().optional(),
  gitBranch: Joi.string().optional(),
  module: objectId.required()
});

// Task validation schema
const taskSchema = Joi.object({
  taskId: Joi.string().required(),
  name: Joi.string().required(),
  goal: Joi.string().optional(),
  taskType: Joi.string().valid('Feature', 'Bug', 'Improvement', 'Research/Spike').optional(),
  createdBy: objectId.required(),
  assignee: objectId.optional(),
  reviewer: objectId.optional(),
  status: Joi.string().valid('Hàng đợi', 'Chưa làm', 'Đang làm', 'Đang xem xét', 'Kiểm thử QA', 'Sẵn sàng phát hành', 'Hoàn thành', 'Mới', 'Đang xác nhận', 'Đang sửa', 'Kiểm thử lại', 'Đã đóng').optional(),
  reviewStatus: Joi.string().valid('Chưa', 'Đạt', 'Không đạt').optional(),
  priority: Joi.string().valid('Thấp', 'Trung bình', 'Cao', 'Khẩn cấp').optional(),
  storyPoints: Joi.number().min(0).optional(),
  estimatedHours: Joi.number().min(0).optional(),
  actualHours: Joi.number().min(0).optional(),
  deadline: Joi.date().optional(),
  severity: Joi.string().valid('Low', 'Medium', 'High', 'Critical').optional(),
  bugLifecycle: Joi.object({
    reportedDate: Joi.date().optional(),
    confirmedDate: Joi.date().optional(),
    fixedDate: Joi.date().optional(),
    retestDate: Joi.date().optional(),
    closedDate: Joi.date().optional()
  }).optional(),
  timeLogs: Joi.array().items(Joi.object({
    date: Joi.date().optional(),
    hours: Joi.number().required(),
    description: Joi.string().optional(),
    loggedBy: objectId.optional()
  })).optional(),
  sprint: objectId.required(),
  project: objectId.required(),
  epic: objectId.optional(),
  parentTask: objectId.optional(),
  subtasks: Joi.array().items(objectId).optional(),
  businessWorkflow: Joi.object({
    baConfirmRequirement: Joi.boolean().optional(),
    baApproveUI: Joi.boolean().optional(),
    baAcceptFeature: Joi.boolean().optional()
  }).optional(),
  acceptanceCriteria: Joi.array().items(Joi.string()).optional(),
  dependencies: Joi.array().items(objectId).optional(),
  relatedRisks: Joi.array().items(objectId).optional(),
  relatedTechnicalDebt: Joi.array().items(objectId).optional(),
  gitBranch: Joi.string().optional(),
  gitCommit: Joi.string().optional(),
  testCases: Joi.array().items(Joi.object({
    title: Joi.string().optional(),
    status: Joi.string().valid('Pending', 'Pass', 'Fail').optional(),
    executedBy: objectId.optional(),
    executedAt: Joi.date().optional()
  })).optional(),
  attachments: Joi.array().items(Joi.object({
    fileName: Joi.string().optional(),
    fileUrl: Joi.string().optional(),
    uploadedBy: objectId.optional(),
    uploadedAt: Joi.date().optional()
  })).optional(),
  externalLinks: Joi.array().items(Joi.object({
    title: Joi.string().optional(),
    url: Joi.string().optional(),
    addedBy: objectId.optional(),
    addedAt: Joi.date().optional()
  })).optional()
});

// Risk validation schemas
const createRiskSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional().allow(''),
  impact: Joi.string().valid('Low', 'Medium', 'High', 'Critical').required(),
  likelihood: Joi.string().valid('Low', 'Medium', 'High', 'Critical').required(),
  riskType: Joi.string().valid('Technical', 'Business', 'Operational', 'Security', 'Compliance', 'Resource', 'Schedule', 'Quality').optional(),
  assignedTo: objectId.optional().allow(null),
  mitigationPlan: Joi.string().optional().allow(''),
  mitigationDeadline: Joi.date().optional().allow(null),
  project: objectId.required(),
  task: objectId.optional().allow(null),
  module: objectId.optional().allow(null),
  sprint: objectId.optional().allow(null),
  tags: Joi.array().items(Joi.string()).optional(),
  cost: Joi.object({
    estimated: Joi.number().min(0).optional(),
    actual: Joi.number().min(0).optional()
  }).optional()
});

const updateRiskSchema = Joi.object({
  title: Joi.string().optional(),
  description: Joi.string().optional().allow(''),
  impact: Joi.string().valid('Low', 'Medium', 'High', 'Critical').optional(),
  likelihood: Joi.string().valid('Low', 'Medium', 'High', 'Critical').optional(),
  priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical').optional(),
  status: Joi.string().valid('Đã xác định', 'Đã đánh giá', 'Đã giảm thiểu', 'Đã đóng', 'Đã chấp nhận').optional(),
  riskType: Joi.string().valid('Technical', 'Business', 'Operational', 'Security', 'Compliance', 'Resource', 'Schedule', 'Quality').optional(),
  assignedTo: objectId.optional().allow(null),
  mitigationPlan: Joi.string().optional().allow(''),
  mitigationDeadline: Joi.date().optional().allow(null),
  actualResolutionDate: Joi.date().optional().allow(null),
  project: objectId.optional(),
  task: objectId.optional().allow(null),
  module: objectId.optional().allow(null),
  sprint: objectId.optional().allow(null),
  tags: Joi.array().items(Joi.string()).optional(),
  cost: Joi.object({
    estimated: Joi.number().min(0).optional(),
    actual: Joi.number().min(0).optional()
  }).optional(),
  probability: Joi.number().min(0).max(100).optional()
});

// Technical Debt validation schemas
const createTechnicalDebtSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional().allow(''),
  type: Joi.string().valid('Code Quality', 'Architecture', 'Performance', 'Security', 'Documentation', 'Testing', 'Dependencies').required(),
  severity: Joi.string().valid('Low', 'Medium', 'High', 'Critical').required(),
  assignedTo: objectId.optional().allow(null),
  estimatedEffort: Joi.number().min(0).optional(),
  project: objectId.required(),
  module: objectId.optional().allow(null),
  sprint: objectId.optional().allow(null),
  task: objectId.optional().allow(null),
  tags: Joi.array().items(Joi.string()).optional(),
  impact: Joi.string().optional().allow(''),
  solution: Joi.string().optional().allow(''),
  prevention: Joi.string().optional().allow(''),
  recurring: Joi.boolean().optional(),
  frequency: Joi.string().valid('One-time', 'Weekly', 'Monthly', 'Quarterly').optional()
});

const updateTechnicalDebtSchema = Joi.object({
  title: Joi.string().optional(),
  description: Joi.string().optional().allow(''),
  type: Joi.string().valid('Code Quality', 'Architecture', 'Performance', 'Security', 'Documentation', 'Testing', 'Dependencies').optional(),
  severity: Joi.string().valid('Low', 'Medium', 'High', 'Critical').optional(),
  assignedTo: objectId.optional().allow(null),
  estimatedEffort: Joi.number().min(0).optional(),
  actualEffort: Joi.number().min(0).optional(),
  module: objectId.optional().allow(null),
  sprint: objectId.optional().allow(null),
  task: objectId.optional().allow(null),
  tags: Joi.array().items(Joi.string()).optional(),
  impact: Joi.string().optional().allow(''),
  solution: Joi.string().optional().allow(''),
  prevention: Joi.string().optional().allow(''),
  recurring: Joi.boolean().optional(),
  frequency: Joi.string().valid('One-time', 'Weekly', 'Monthly', 'Quarterly').optional()
});

// Epic validation schemas
const createEpicSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional().allow(''),
  priority: Joi.string().valid('Low', 'Medium', 'High', 'Urgent').optional(),
  project: objectId.required(),
  sprint: objectId.optional().allow(null),
  assignee: objectId.optional().allow(null),
  acceptanceCriteria: Joi.array().items(Joi.string()).optional(),
  estimatedEffort: Joi.number().min(0).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  businessValue: Joi.number().min(0).max(100).optional(),
  riskLevel: Joi.string().valid('Low', 'Medium', 'High', 'Critical').optional()
});

const updateEpicSchema = Joi.object({
  title: Joi.string().optional(),
  description: Joi.string().optional().allow(''),
  priority: Joi.string().valid('Low', 'Medium', 'High', 'Urgent').optional(),
  status: Joi.string().valid('Backlog', 'To Do', 'In Progress', 'In Review', 'Done').optional(),
  project: objectId.optional(),
  sprint: objectId.optional().allow(null),
  assignee: objectId.optional().allow(null),
  acceptanceCriteria: Joi.array().items(Joi.string()).optional(),
  estimatedEffort: Joi.number().min(0).optional(),
  actualEffort: Joi.number().min(0).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  businessValue: Joi.number().min(0).max(100).optional(),
  riskLevel: Joi.string().valid('Low', 'Medium', 'High', 'Critical').optional(),
  userStories: Joi.array().items(objectId).optional()
});

const createTaskSchema = Joi.object({
  taskId: Joi.string().required(),
  name: Joi.string().required(),
  goal: Joi.string().optional().allow(''),
  taskType: Joi.string().valid('Feature', 'Bug', 'Improvement', 'Research/Spike').optional(),
  priority: Joi.string().valid('Thấp', 'Trung bình', 'Cao', 'Khẩn cấp').optional(),
  sprint: objectId.required(),
  assignees: Joi.array().items(objectId).min(1).required(),
  reviewers: Joi.array().items(objectId).min(1).required(),
  startDate: Joi.date().optional().allow(null),
  taskEndDate: Joi.date().optional().allow(null),
  deadline: Joi.date().optional().allow(null),
  description: Joi.string().optional().allow(''),
  acceptanceCriteria: Joi.array().items(Joi.string()).optional(),
  storyPoints: Joi.number().min(0).optional(),
  estimatedHours: Joi.number().min(0).optional(),
  createdBy: objectId.optional() // Server uses req.user._id as creator
});

const createUserSchema = Joi.object({
  userID: Joi.string().required(),
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().optional(),
  phoneNumber: Joi.string().optional()
});

const updateUserRoleSchema = Joi.object({
  role: Joi.string().required()
});

module.exports = {
  registerSchema,
  loginSchema,
  otpSchema,
  changePasswordSchema,
  resendOtpSchema,
  userUpdateSchema,
  projectSchema,
  moduleSchema,
  sprintSchema,
  releaseSchema,
  taskSchema,
  createRiskSchema,
  updateRiskSchema,
  createTechnicalDebtSchema,
  updateTechnicalDebtSchema,
  createEpicSchema,
  updateEpicSchema,
  createTaskSchema,
  createUserSchema,
  updateUserRoleSchema
};

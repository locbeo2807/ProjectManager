const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createError } = require('../utils/error');
const { verifyToken } = require('../utils/token');

// Basic Authentication middleware
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return next(createError(401, 'Authentication required'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id).select('-password');

    if (!user) {
      return next(createError(401, 'User not found'));
    }

    // Check if user account is active
    if (user.status !== 'hoạt động') {
      return next(createError(401, 'Account is not active'));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(createError(401, 'Invalid token'));
  }
}

// ABAC (Attribute-Based Access Control) Permission Matrix
const ROLE_PERMISSIONS = {
  'PM': {
    // Project Management
    canCreateProject: true,
    canEditProject: true,
    canDeleteProject: true,
    canViewAllProjects: true,

    // Module Management
    canCreateModule: true,
    canEditModule: true,
    canDeleteModule: true,

    // Release Management
    canCreateRelease: true,
    canEditRelease: true,
    canDeleteRelease: true,

    // Sprint Management
    canCreateSprint: true,
    canEditSprint: true,
    canDeleteSprint: true,

    // Task Management
    canCreateTask: true,
    canEditTask: true,
    canDeleteTask: true,
    canAssignTasks: true,

    // Risk Management
    canCreateRisk: true,
    canEditRisk: true,
    canDeleteRisk: true,

    // Technical Debt
    canCreateTechnicalDebt: true,
    canEditTechnicalDebt: true,
    canDeleteTechnicalDebt: true,

    // Epic Management
    canCreateEpic: true,
    canEditEpic: true,
    canDeleteEpic: true,

    // User Management
    canManageUsers: true,
    canAssignRoles: true,

    // Dashboard & Analytics
    canViewAnalytics: true,
    canViewAllMetrics: true
  },

  'BA': {
    // Project Access - Full project visibility for requirements management
    canViewAllProjects: true,
    canViewProjectDetails: true,

    // Requirements & Business Analysis - Core BA responsibilities
    canCreateModule: true,
    canEditModule: true,
    canDeleteModule: true, // BA can manage modules they create
    canCreateRelease: true,
    canEditRelease: true,
    canDeleteRelease: true,
    canCreateEpic: true,
    canEditEpic: true,
    canDeleteEpic: true,

    // Task Management - BA creates and manages requirements
    canCreateTask: true,
    canEditTask: true,
    canDeleteTask: true,
    canAssignTasks: true, // BA assigns tasks to developers
    canReviewRequirements: true,
    canApproveUI: true,
    canAcceptFeatures: true,

    // Risk Management - BA identifies business risks
    canCreateRisk: true,
    canEditRisk: true,
    canDeleteRisk: true,

    // Quality Assurance - BA ensures requirements quality
    canReviewTasks: true,
    canCreateAcceptanceCriteria: true,

    // Sprint Management - BA participates in sprint planning
    canViewSprintDetails: true,
    canEditSprint: true, // For requirements changes

    // Dashboard & Analytics
    canViewProjectMetrics: true,
    canViewRequirementsMetrics: true,
    canViewAllMetrics: true
  },

  'Developer': {
    // Project Access - Full access to projects they're working on
    canViewAllProjects: true,
    canViewProjectDetails: true,

    // Development Tasks - Core development workflow
    canCreateTask: true, // Can create subtasks or break down work
    canEditTask: true, // Can edit task details
    canUpdateTaskStatus: true, // Can update status of assigned tasks
    canLogTime: true,
    canCreateCodeReviews: true,
    canViewAssignedTasks: true,

    // Module Access - Need to see module details
    canViewModuleDetails: true,
    canEditModule: false, // Cannot edit module structure

    // Sprint Access - Need to see sprint details
    canViewSprintDetails: true,

    // Release Access - Need to see release info
    canViewReleaseDetails: true,

    // Technical Debt - Code quality responsibilities
    canCreateTechnicalDebt: true,
    canEditTechnicalDebt: true, // Only their created items
    canUpdateTechnicalDebt: true,
    canViewCodeQuality: true,

    // Risk Management - Can identify technical risks
    canCreateRisk: true,
    canEditRisk: false, // Cannot edit risks created by others

    // Quality Assurance - Can provide feedback
    canReviewTasks: false, // Cannot formally review, only provide feedback
    canCreateAcceptanceCriteria: false // BA responsibility
  },

  'QA Tester': {
    // Project Access - Full access for comprehensive testing
    canViewAllProjects: true,
    canViewProjectDetails: true,

    // Quality Assurance - Core QA responsibilities
    canCreateBugs: true,
    canUpdateBugStatus: true,
    canReviewTasks: true, // Can formally review tasks
    canExecuteTests: true,
    canViewTestCases: true,

    // Task Management - QA workflow transitions
    canCreateTask: true, // Can create bug-related tasks
    canEditTask: true, // Can edit task details for QA purposes
    canUpdateTaskStatus: true, // Can move tasks through QA workflow
    canAssignTasks: false, // Cannot assign tasks to others

    // Module/Release Access - Need to see what they're testing
    canViewModuleDetails: true,
    canViewReleaseDetails: true,
    canViewSprintDetails: true,

    // Acceptance Criteria - QA helps define and validate
    canCreateAcceptanceCriteria: true,
    canEditAcceptanceCriteria: true,

    // Risk Management - QA identifies quality risks
    canCreateRisk: true,
    canEditRisk: false, // Cannot edit risks created by others

    // Quality Metrics & Reporting
    canViewQualityMetrics: true,
    canCreateTestReports: true,
    canViewAllMetrics: true,

    // Technical Debt - QA can identify testing-related debt
    canCreateTechnicalDebt: true,
    canViewCodeQuality: true
  },

  'QC': {
    // Project Access - Full access for comprehensive quality oversight
    canViewAllProjects: true,
    canViewProjectDetails: true,

    // Quality Control & Compliance - Core QC responsibilities
    canAuditQuality: true,
    canCreateRisks: true,
    canReviewProcesses: true,
    canApproveQualityGates: true,

    // Risk Management - QC manages quality-related risks
    canCreateRisk: true,
    canEditRisk: true,
    canDeleteRisk: true,
    canViewRiskDetails: true,

    // Compliance & Audit - Independent quality oversight
    canViewAuditLogs: true,
    canCreateComplianceReports: true,
    canAuditProcesses: true,

    // Quality Metrics & Analytics
    canViewAllQualityMetrics: true,
    canViewQualityMetrics: true,
    canCreateQualityReports: true,

    // Task & Process Access - Need to review all aspects
    canViewModuleDetails: true,
    canViewSprintDetails: true,
    canViewReleaseDetails: true,
    canReviewTasks: true, // Can review for quality compliance

    // Technical Debt - QC identifies systemic quality issues
    canCreateTechnicalDebt: true,
    canEditTechnicalDebt: true,
    canViewCodeQuality: true,

    // Testing Oversight - QC oversees testing processes
    canViewTestCases: true,
    canAuditTesting: true,
    canApproveTestResults: true,

    // Standards & Governance
    canDefineQualityStandards: true,
    canEnforceCompliance: true,
    canCreateQualityPolicies: true
  },

  'Scrum Master': {
    // Project Access - Full visibility for process management
    canViewAllProjects: true,
    canViewProjectDetails: true,

    // Agile Process Facilitation - Core SM responsibilities
    canFacilitateMeetings: true,
    canRemoveImpediments: true,
    canCoachTeam: true,
    canManageSprint: true,
    canViewTeamMetrics: true,

    // Sprint Management - SM manages sprint ceremonies and flow
    canCreateSprint: true,
    canEditSprint: true,
    canDeleteSprint: true,

    // Task Management - SM can help with task management for process reasons
    canCreateTask: true, // Can create tasks during sprint planning
    canEditTask: true,   // Can edit for process improvements
    canDeleteTask: true, // Can remove inappropriate tasks
    canAssignTasks: true, // Can help assign tasks during planning

    // Module/Release Access - Need visibility for coordination
    canViewModuleDetails: true,
    canViewReleaseDetails: true,

    // Risk Management - SM identifies process risks
    canCreateRisk: true,
    canEditRisk: true,

    // Quality Assurance - SM ensures process quality
    canReviewTasks: false, // Not a formal reviewer
    canViewQualityMetrics: true,

    // Team Performance & Analytics
    canViewVelocity: true,
    canViewBurndown: true,
    canViewTeamHealth: true,
    canViewAllMetrics: true,

    // Technical Debt - SM monitors team capacity for debt reduction
    canViewCodeQuality: true,
    canCreateTechnicalDebt: false // Not responsible for creating technical debt
  },

  'DevOps Engineer': {
    // Project Access - Full visibility for deployment coordination
    canViewAllProjects: true,
    canViewProjectDetails: true,

    // Infrastructure & Deployment - Core DevOps responsibilities
    canDeployReleases: true,
    canManageInfrastructure: true,
    canMonitorSystems: true,
    canAutomatePipelines: true,

    // Release Management - DevOps manages release process
    canCreateRelease: true,
    canEditRelease: true,
    canDeleteRelease: true,
    canApproveReleases: true, // Can approve for deployment

    // Environment Management - Full environment control
    canManageEnvironments: true,
    canConfigureCI: true,
    canConfigureCD: true,

    // Module/Sprint Access - Need to understand what they're deploying
    canViewModuleDetails: true,
    canViewSprintDetails: true,

    // Quality Assurance - DevOps ensures deployment quality
    canViewQualityMetrics: true,
    canCreateTestReports: false, // QA responsibility
    canExecuteTests: false, // QA responsibility

    // Risk Management - DevOps identifies infrastructure risks
    canCreateRisk: true,
    canEditRisk: true,

    // Technical Debt - DevOps manages infrastructure debt
    canCreateTechnicalDebt: true,
    canEditTechnicalDebt: true,
    canViewCodeQuality: true,

    // Monitoring & Analytics - Comprehensive system monitoring
    canViewSystemMetrics: true,
    canViewDeploymentMetrics: true,
    canViewAllMetrics: true,

    // Security - DevOps handles deployment security
    canManageSecurity: true,
    canAuditSecurity: true
  },

  'Product Owner': {
    // Project Access - Strategic oversight of all projects
    canViewAllProjects: true,
    canViewProjectDetails: true,

    // Product Vision & Strategy - Core PO responsibilities
    canPrioritizeBacklog: true,
    canAcceptDeliverables: true,
    canDefineRequirements: true,
    canManageStakeholders: true,

    // Epic & Story Management - PO owns the product backlog
    canCreateEpic: true,
    canEditEpic: true,
    canDeleteEpic: true,

    // Task Management - PO can create high-level tasks
    canCreateTask: true,
    canEditTask: true,
    canDeleteTask: true,
    canAssignTasks: true, // Can assign to team

    // Sprint/Release Access - PO participates in planning and reviews
    canViewSprintDetails: true,
    canEditSprint: true, // Can influence sprint scope
    canViewReleaseDetails: true,
    canApproveReleases: true,

    // Module Access - PO needs to understand technical delivery
    canViewModuleDetails: true,

    // Stakeholder Management & Communication
    canViewStakeholderFeedback: true,
    canManageProductRoadmap: true,

    // Business Value & Analytics
    canViewBusinessValue: true,
    canViewROI: true,
    canViewAllMetrics: true,

    // Risk Management - PO considers business risks
    canCreateRisk: true,
    canEditRisk: true,
    canViewRiskDetails: true,

    // Quality Assurance - PO ensures business value delivery
    canReviewTasks: true, // Can review for business acceptance
    canAcceptFeatures: true, // Final acceptance authority
    canViewQualityMetrics: true
  }
};

// ABAC Permission Check Function
exports.hasPermission = (user, action, resource = null, context = {}) => {
  if (!user || !user.role) return false;

  const rolePerms = ROLE_PERMISSIONS[user.role];
  if (!rolePerms) return false;

  // Check basic permission
  if (!rolePerms[action]) return false;

  // Context-specific checks based on ABAC rules
  switch (action) {
    case 'canEditModule':
      // BA can edit any module in projects they can access
      // PM can edit all modules
      // Other roles cannot edit modules
      if (user.role === 'BA') {
        return rolePerms.canEditModule === true;
      }
      if (user.role === 'PM') {
        return true;
      }
      return false;

    case 'canUpdateTaskStatus':
      // Developers can only update tasks assigned to them
      if (user.role === 'Developer' && resource) {
        return resource.assignee?._id?.toString() === user._id.toString();
      }
      // QA Testers can update task status for QA workflow
      if (user.role === 'QA Tester') {
        return true; // QA can update any task for testing purposes
      }
      // BA can update task status for requirements management
      if (user.role === 'BA') {
        return true;
      }
      // Scrum Master can update for process management
      if (user.role === 'Scrum Master') {
        return true;
      }
      // PM can update any task
      if (user.role === 'PM') {
        return true;
      }
      break;

    case 'canReviewTasks':
      // QA Testers can review assigned tasks
      if (user.role === 'QA Tester' && resource) {
        return resource.reviewer?._id?.toString() === user._id.toString();
      }
      // BA can review for business acceptance
      if (user.role === 'BA') {
        return true;
      }
      // Product Owner can review for product acceptance
      if (user.role === 'Product Owner') {
        return true;
      }
      break;

    case 'canEditTechnicalDebt':
      // Developers can only edit technical debt they created
      if (user.role === 'Developer' && resource) {
        return resource.createdBy?.toString() === user._id.toString();
      }
      // DevOps can edit infrastructure-related debt
      if (user.role === 'DevOps Engineer') {
        return true;
      }
      // QC can edit quality-related debt
      if (user.role === 'QC') {
        return true;
      }
      break;

    case 'canAssignTasks':
      // Only BA, PM, Scrum Master, and Product Owner can assign tasks
      if (['BA', 'PM', 'Scrum Master', 'Product Owner'].includes(user.role)) {
        return true;
      }
      return false;

    case 'canApproveReleases':
      // DevOps, PM, and Product Owner can approve releases
      if (['DevOps Engineer', 'PM', 'Product Owner'].includes(user.role)) {
        return true;
      }
      return false;

    case 'canManageUsers':
      // Only PM can manage users
      if (user.role === 'PM') {
        return true;
      }
      return false;

    case 'canViewAllMetrics':
      // PM, Scrum Master, Product Owner have access to all metrics
      if (['PM', 'Scrum Master', 'Product Owner'].includes(user.role)) {
        return true;
      }
      return false;
  }

  return true;
};

// ABAC Authorization Middleware
exports.authorizeABAC = (action, resourceType = null) => {
  return (req, res, next) => {
    const resource = req[resourceType] || req.body || req.params;
    const context = {
      moduleOwner: req.module?.createdBy,
      taskAssignee: req.task?.assignee,
      sprintOwner: req.sprint?.createdBy,
      projectOwner: req.project?.createdBy
    };

    if (!exports.hasPermission(req.user, action, resource, context)) {
      const roleMessages = {
        'BA': 'Business Analyst chỉ có thể chỉnh sửa module do mình tạo',
        'Developer': 'Developer chỉ có thể cập nhật task được giao',
        'QA Tester': 'QA Tester chỉ có thể review task được giao'
      };

      const message = roleMessages[req.user.role] ||
        `${req.user.role} không có quyền thực hiện hành động này`;

      return next(createError(403, message));
    }

    next();
  };
};

// Legacy RBAC for backward compatibility
exports.authorize = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(createError(403, 'Not authorized to access this resource'));
    }
    next();
  };
};
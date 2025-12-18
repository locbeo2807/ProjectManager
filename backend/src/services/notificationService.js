const Notification = require('../models/Notification');
const User = require('../models/User');
const socketManager = require('../socket');

/**
 * Enterprise Notification Service with Role-Based Notifications
 * Handles workflow events and notifies appropriate roles
 */

// Notification Rules by Event Type and Target Roles
const NOTIFICATION_RULES = {
  // Project Events
  'project_created': {
    roles: ['PM', 'BA', 'Product Owner'], // Notify key stakeholders for new projects
    message: (data) => `Dự án mới "${data.projectName}" đã được tạo bởi ${data.creatorName}`
  },
  'project_assigned': {
    specific: true, // Only notify specific BA assigned to project
    message: (data) => `Bạn đã được giao phụ trách dự án "${data.projectName}". Vui lòng phân tích yêu cầu và tạo modules.`
  },
  'project_confirmed': {
    roles: ['BA', 'Developer', 'QA Tester', 'Scrum Master', 'DevOps Engineer'], // Notify entire team when project is confirmed
    message: (data) => `Dự án "${data.projectName}" đã được phê duyệt bởi ${data.confirmedByName} và sẵn sàng triển khai`
  },
  'project_completed': {
    roles: ['PM', 'BA', 'Product Owner', 'Scrum Master'], // Notify leadership when project completes
    message: (data) => `Dự án "${data.projectName}" đã hoàn thành thành công bởi ${data.completedByName}`
  },
  'project_updated': {
    roles: ['PM', 'BA', 'Product Owner'], // Notify key roles for project updates
    message: (data) => `Dự án "${data.projectName}" đã được cập nhật bởi ${data.updaterName}: ${data.changes}`
  },
  'project_member_added': {
    specific: true, // Notify added member
    roles: ['PM'], // Also notify PM (không gửi thêm cho toàn bộ BA để tránh trùng cho chính BA được thêm)

    message: (data) => {
      // Nếu có specificUsers (case gửi riêng cho member mới được thêm)
      if (Array.isArray(data.specificUsers) && data.specificUsers.length > 0) {
        return `Bạn đã được thêm vào dự án "${data.projectName}" với vai trò ${data.memberRole} bởi ${data.addedByName}`;
      }

      // Còn lại là thông báo cho PM/BA khi có thành viên mới được thêm
      if (data.memberName) {
        return `Thành viên ${data.memberName} (vai trò ${data.memberRole || 'member'}) đã được ${data.addedByName} thêm vào dự án "${data.projectName}"`;
      }

      return `Có thành viên mới được thêm vào dự án "${data.projectName}" bởi ${data.addedByName}`;
    }
  },
  'project_member_removed': {
    specific: true, // Notify removed member
    roles: ['PM', 'BA'], // Also notify PM and BA
    message: (data) => {
      // Nếu có specificUsers => gửi riêng cho member bị xóa
      if (Array.isArray(data.specificUsers) && data.specificUsers.length > 0) {
        return `Bạn đã được xóa khỏi dự án "${data.projectName}" bởi ${data.removedByName}`;
      }

      // Còn lại: thông báo cho PM/BA
      if (data.memberName) {
        return `Thành viên ${data.memberName} đã được ${data.removedByName} xóa khỏi dự án "${data.projectName}"`;
      }

      return `Có thành viên đã bị xóa khỏi dự án "${data.projectName}" bởi ${data.removedByName}`;
    }
  },
  'project_deadline_warning': {
    roles: ['PM', 'BA', 'Product Owner'], // Notify leadership for deadline warnings
    message: (data) => `⏰ Cảnh báo: Dự án "${data.projectName}" sẽ kết thúc trong ${data.daysRemaining} ngày`
  },
  'project_deadline_breach': {
    roles: ['PM', 'BA', 'Product Owner'], // Notify leadership for deadline breaches
    message: (data) => `🚨 Dự án "${data.projectName}" đã quá hạn ${data.daysOverdue} ngày`
  },
  'project_progress_report': {
    roles: ['PM', 'BA', 'Product Owner'], // Notify leadership for progress reports
    message: (data) => `📊 Progress report cho dự án "${data.projectName}": ${data.completedModules}/${data.totalModules} modules, ${data.completedTasks}/${data.totalTasks} tasks (${data.progressPercentage}% hoàn thành)`
  },
  'project_budget_warning': {
    roles: ['PM', 'BA', 'Product Owner'], // Notify leadership for budget warnings
    message: (data) => `💰 Cảnh báo ngân sách: Dự án "${data.projectName}" đã sử dụng ${data.percentage}% ngân sách (${data.budgetUsed}/${data.budgetTotal})`
  },
  'project_milestone_reached': {
    roles: ['PM', 'BA', 'Product Owner'], // Notify leadership for milestones
    message: (data) => `🎯 Cột mốc đạt được: "${data.milestoneName}" trong dự án "${data.projectName}"`
  },

  // Module Events
  'module_created': {
    roles: ['PM', 'BA', 'Product Owner', 'Developer'], // Notify key roles and developers for new modules
    specific: true, // Also notify project manager
    message: (data) => `Module mới "${data.moduleName}" đã được tạo trong dự án "${data.projectName}" bởi ${data.creatorName}`
  },
  'module_assigned': {
    specific: true, // Notify specific owner assigned to module
    roles: ['PM', 'BA'], // Also notify PM and BA team
    message: (data) => `Bạn đã được giao làm chủ sở hữu module "${data.moduleName}" bởi ${data.assignedByName}`
  },
  'module_completed': {
    roles: ['PM', 'BA', 'Product Owner', 'DevOps Engineer'], // Notify stakeholders when module completes
    specific: true, // Also notify project manager
    message: (data) => `Module "${data.moduleName}" đã hoàn thành và sẵn sàng cho triển khai`
  },
  'module_updated': {
    roles: ['PM', 'BA', 'Product Owner'], // Notify key roles for module updates
    specific: true, // Also notify project manager
    message: (data) => `Module "${data.moduleName}" đã được cập nhật bởi ${data.updaterName}: ${data.changes}`
  },
  'module_deadline_warning': {
    roles: ['PM', 'BA', 'Product Owner'], // Notify leadership for deadline warnings
    message: (data) => `⏰ Cảnh báo: Module "${data.moduleName}" sẽ kết thúc trong ${data.daysRemaining} ngày`
  },
  'module_deadline_breach': {
    roles: ['PM', 'BA', 'Product Owner'], // Notify leadership for deadline breaches
    message: (data) => `🚨 Module "${data.moduleName}" đã quá hạn ${data.daysOverdue} ngày`
  },
  'module_progress_report': {
    roles: ['PM', 'BA', 'Product Owner'], // Notify leadership for progress reports
    message: (data) => `📊 Progress report cho module "${data.moduleName}": ${data.completedTasks}/${data.totalTasks} tasks (${data.progressPercentage}% hoàn thành)`
  },
  'module_quality_gate_failed': {
    roles: ['QC', 'PM', 'BA'], // Notify quality and business teams
    message: (data) => `❌ Quality gate thất bại cho module "${data.moduleName}": ${data.failureReason}`
  },
  'module_quality_gate_passed': {
    roles: ['PM', 'BA', 'Product Owner'], // Notify business team
    message: (data) => `✅ Quality gate passed cho module "${data.moduleName}" - sẵn sàng triển khai`
  },

  // Sprint Events
  'sprint_created': {
    roles: ['Developer', 'BA', 'QA Tester', 'Scrum Master', 'Product Owner'], // Notify sprint team
    specific: true, // Also notify project manager
    message: (data) => `Sprint mới "${data.sprintName}" đã được tạo cho module "${data.moduleName}" bởi ${data.creatorName}`
  },
  'sprint_started': {
    roles: ['Developer', 'BA', 'QA Tester', 'Scrum Master', 'Product Owner'], // Notify sprint team
    specific: true, // Also notify project manager
    message: (data) => `Sprint "${data.sprintName}" đã bắt đầu - ${data.totalTasks} tasks, ${data.totalStoryPoints} story points`
  },
  'sprint_completed': {
    roles: ['PM', 'BA', 'Product Owner', 'Scrum Master'], // Notify stakeholders
    specific: true, // Also notify project manager
    message: (data) => `Sprint "${data.sprintName}" đã hoàn thành với velocity ${data.velocity} story points`
  },
  'sprint_updated': {
    roles: ['BA', 'Scrum Master', 'PM'], // Notify key roles
    specific: true, // Also notify project manager
    message: (data) => `Sprint "${data.sprintName}" đã được cập nhật bởi ${data.updaterName}: ${data.changes}`
  },
  'sprint_member_added': {
    specific: true, // Notify added member
    roles: ['BA', 'Scrum Master'], // Also notify BA and SM
    message: (data) => {
      if (Array.isArray(data.specificUsers) && data.specificUsers.length > 0) {
        // Gửi riêng cho member mới
        return `Bạn đã được thêm vào sprint "${data.sprintName}" bởi ${data.addedByName}`;
      }

      if (data.memberName) {
        // Thông báo cho BA/Scrum Master
        return `Thành viên ${data.memberName} đã được ${data.addedByName} thêm vào sprint "${data.sprintName}"`;
      }

      return `Có thành viên mới được thêm vào sprint "${data.sprintName}" bởi ${data.addedByName}`;
    }
  },
  'sprint_member_removed': {
    specific: true, // Notify removed member
    roles: ['BA', 'Scrum Master'], // Also notify BA and SM
    message: (data) => {
      if (Array.isArray(data.specificUsers) && data.specificUsers.length > 0) {
        // Gửi riêng cho member bị xóa
        return `Bạn đã được xóa khỏi sprint "${data.sprintName}" bởi ${data.removedByName}`;
      }

      if (data.memberName) {
        // Thông báo cho BA/Scrum Master
        return `Thành viên ${data.memberName} đã được ${data.removedByName} xóa khỏi sprint "${data.sprintName}"`;
      }

      return `Có thành viên đã bị xóa khỏi sprint "${data.sprintName}" bởi ${data.removedByName}`;
    }
  },
  'sprint_deadline_warning': {
    roles: ['PM', 'BA', 'Scrum Master', 'Product Owner'], // Notify leadership
    message: (data) => `⏰ Cảnh báo: Sprint "${data.sprintName}" sẽ kết thúc trong ${data.daysRemaining} ngày`
  },
  'sprint_deadline_breach': {
    roles: ['PM', 'BA', 'Product Owner', 'Scrum Master'], // Notify leadership
    message: (data) => `🚨 Sprint "${data.sprintName}" đã quá hạn ${data.daysOverdue} ngày`
  },
  'sprint_velocity_report': {
    roles: ['PM', 'BA', 'Product Owner', 'Scrum Master'], // Notify leadership
    message: (data) => `📊 Velocity report cho sprint "${data.sprintName}": ${data.actualVelocity}/${data.plannedVelocity} SP (${data.efficiency}% efficiency)`
  },

  // Task Events
  'task_created': {
    roles: ['BA', 'QA Tester', 'Scrum Master'], // Notify BA, QA, SM – không broadcast tới Developer
    specific: true, // Also notify project manager
    message: (data) => `Task mới "${data.taskName}" (${data.storyPoints} SP) đã được tạo trong sprint "${data.sprintName}" của dự án "${data.projectName}".`
  },
  'task_assigned': {
    specific: true, // Notify specific assignee only (and optional projectManager via context)
    message: (data) => `Bạn được giao task "${data.taskName}" (ID: ${data.taskId}) trong sprint "${data.sprintName}" của dự án "${data.projectName}". Người giao: ${data.assignerName}.`
  },
  'task_started': {
    roles: ['BA', 'Scrum Master'], // Notify BA and SM when work begins
    specific: true, // Also notify project manager
    message: (data) => `${data.assigneeName} đã bắt đầu làm task "${data.taskName}"`
  },
  'task_completed': {
    roles: ['BA', 'PM', 'Scrum Master'], // Notify BA, PM, and SM when task is done
    specific: true, // Also notify reviewer and project manager
    message: (data) => `Task "${data.taskName}" do ${data.assigneeName} thực hiện đã nộp file hoàn thành và đang chờ review. Sprint: "${data.sprintName}", dự án: "${data.projectName}".`
  },
  'task_review_assigned': {
    specific: true, // Notify specific reviewer
    message: (data) => `Bạn được giao review task "${data.taskName}" (ID: ${data.taskId}) trong sprint "${data.sprintName}" của dự án "${data.projectName}". Vui lòng xem file hoàn thành và gửi đánh giá.`
  },
  'task_reviewed_passed': {
    specific: true, // Notify assignee
    roles: ['BA', 'Scrum Master'], // Also notify BA and SM
    message: (data) => `Task "${data.taskName}" bạn thực hiện đã được review ĐẠT bởi ${data.reviewerName}.${data.comment ? ' Nhận xét: ' + data.comment : ''}`
  },
  'task_reviewed_failed': {
    specific: true, // Notify assignee
    roles: ['BA', 'Scrum Master'], // Also notify BA and SM
    message: (data) => `Task "${data.taskName}" bạn thực hiện KHÔNG ĐẠT review của ${data.reviewerName}.${data.comment ? ' Lý do: ' + data.comment : ' Vui lòng xem lại yêu cầu và sửa theo góp ý.'}`
  },
  'task_qa_passed': {
    specific: true, // Notify assignee
    roles: ['BA', 'PM', 'Product Owner'], // Notify stakeholders
    message: (data) => `Task "${data.taskName}" đã pass QA và sẵn sàng release`
  },
  'task_qa_failed': {
    specific: true, // Notify assignee
    roles: ['BA', 'Scrum Master'], // Notify BA and SM
    message: (data) => `Task "${data.taskName}" bị reject bởi QA - cần fix`
  },

  // Handover Events
  'task_handover_initiated': {
    specific: true, // Notify new assignee and reviewer
    roles: ['BA', 'Scrum Master'], // Also notify BA and SM
    message: (data) => `Task "${data.taskName}" đã được bàn giao cho bạn bởi ${data.handoverFromName}`
  },
  'task_handover_completed': {
    specific: true, // Notify original assignee
    roles: ['BA', 'Scrum Master'], // Also notify BA and SM
    message: (data) => `Task "${data.taskName}" đã được bàn giao thành công cho ${data.newAssigneeName}`
  },
  'task_handover_reminder': {
    specific: true, // Notify current assignee and reviewer
    message: (data) => `📋 Nhắc nhở: Task "${data.taskName}" cần được bàn giao hoặc hoàn thành`
  },
  'task_handover_rejected': {
    specific: true, // Notify user who attempted handover
    roles: ['BA', 'Scrum Master'], // Also notify BA and SM
    message: (data) => `Bàn giao task "${data.taskName}" đã bị từ chối: ${data.reason}`
  },
  'task_handover_files_uploaded': {
    specific: true, // Notify reviewer
    roles: ['BA', 'Scrum Master'], // Also notify BA and SM
    message: (data) => `📁 ${data.fileCount} file bàn giao đã được tải lên cho task "${data.taskName}" bởi ${data.uploaderName}`
  },
  'task_handover_files_approved': {
    roles: ['PM', 'BA', 'Scrum Master'], // Notify stakeholders
    message: (data) => `✅ ${data.approvedCount} file bàn giao đã được duyệt cho task "${data.taskName}" bởi ${data.reviewerName}`
  },
  'task_handover_files_rejected': {
    specific: true, // Notify assignee
    roles: ['BA', 'Scrum Master'], // Also notify BA and SM
    message: (data) => `❌ ${data.rejectedCount} file bàn giao đã bị từ chối cho task "${data.taskName}": ${data.reviewComment}`
  },
  'sprint_handover_batch': {
    roles: ['PM', 'BA', 'Product Owner', 'Scrum Master'], // Notify leadership
    message: (data) => `${data.taskCount} tasks trong sprint "${data.sprintName}" đã được bàn giao batch`
  },

  // Release Events
  'release_created': {
    roles: ['DevOps Engineer', 'PM', 'BA', 'Product Owner'], // Notify deployment and business teams
    message: (data) => `Release mới "${data.releaseName}" đã được tạo cho module "${data.moduleName}"`
  },
  'release_ready_for_approval': {
    roles: ['BA', 'PM', 'Product Owner', 'DevOps Engineer'], // Notify approval authorities
    message: (data) => `Release "${data.releaseName}" đã sẵn sàng để phê duyệt - ${data.completedTasks}/${data.totalTasks} tasks hoàn thành`
  },
  'release_approved': {
    roles: ['DevOps Engineer'], // Notify DevOps for deployment
    message: (data) => `Release "${data.releaseName}" đã được phê duyệt và sẵn sàng triển khai`
  },
  'release_deployed': {
    roles: ['BA', 'PM', 'Product Owner', 'Scrum Master'], // Notify all stakeholders
    message: (data) => `Release "${data.releaseName}" đã được triển khai thành công lên ${data.environment}`
  },
  'release_failed': {
    roles: ['DevOps Engineer', 'PM', 'BA'], // Notify deployment and business teams
    message: (data) => `Release "${data.releaseName}" triển khai thất bại: ${data.failureReason}`
  },

  // Risk Events
  'risk_created': {
    roles: ['PM', 'BA', 'Scrum Master'], // Notify leadership for new risks
    message: (data) => `Rủi ro mới: "${data.riskTitle}" (${data.impact} impact, ${data.likelihood} likelihood)`
  },
  'risk_critical': {
    roles: ['PM', 'BA', 'Product Owner'], // Notify executive team for critical risks
    message: (data) => `🚨 Rủi ro nghiêm trọng: "${data.riskTitle}" cần xử lý ngay lập tức`
  },
  'risk_high': {
    roles: ['PM', 'BA', 'Scrum Master', 'DevOps Engineer'], // Notify leadership for high risks
    message: (data) => `⚠️ Rủi ro cao: "${data.riskTitle}" cần theo dõi sát sao`
  },
  'risk_mitigated': {
    roles: ['PM', 'BA'], // Notify sponsors when risk is resolved
    message: (data) => `✅ Rủi ro "${data.riskTitle}" đã được giảm thiểu thành công`
  },

  // SLA Events
  'sla_warning': {
    roles: ['PM', 'Scrum Master', 'BA'], // Notify team leads for SLA warnings
    message: (data) => `⚠️ SLA cảnh báo: ${data.slaType} cho "${data.itemName}" ${data.remainingHours}`
  },
  'sla_breach': {
    roles: ['PM', 'Scrum Master', 'Product Owner'], // Notify leadership for SLA breaches
    message: (data) => `🚨 SLA vi phạm: ${data.slaType} cho "${data.itemName}" đã ${data.remainingHours}`
  },
  'sla_critical': {
    roles: ['PM', 'Product Owner', 'BA'], // Notify executive team for critical SLA breaches
    message: (data) => `🔥 SLA nghiêm trọng: ${data.slaType} cho "${data.itemName}" cần xử lý ngay lập tức`
  },

  // Inactivity Events
  'task_inactive_reminder': {
    specific: true, // Notify assignee/reviewer
    roles: ['BA', 'Scrum Master'], // Also notify BA and SM
    message: (data) => `⏰ Nhắc nhở: Task "${data.taskName}" không hoạt động trong ${data.hoursInactive} giờ`
  },

  // Budget Events
  'project_budget_warning': {
    roles: ['PM', 'BA', 'Product Owner'], // Notify leadership for budget warnings
    message: (data) => `💰 Cảnh báo ngân sách: Dự án "${data.projectName}" đã sử dụng ${data.percentage}% ngân sách (${data.budgetUsed}/${data.budgetTotal})`
  },
  'project_budget_critical': {
    roles: ['PM', 'BA', 'Product Owner'], // Notify leadership for critical budget issues
    message: (data) => `🚨 NGÂN SÁCH NGHIÊM TRỌNG: Dự án "${data.projectName}" đã sử dụng ${data.percentage}% ngân sách (${data.budgetUsed}/${data.budgetTotal})`
  },
  'quality_gate_failed': {
    roles: ['QC', 'DevOps Engineer', 'Scrum Master'], // Notify quality and deployment teams
    message: (data) => `❌ Quality gate thất bại cho "${data.itemName}": ${data.failureReason}`
  },
  'quality_gate_passed': {
    roles: ['BA', 'PM'], // Notify business team
    message: (data) => `✅ Quality gate passed cho "${data.itemName}" - sẵn sàng triển khai`
  },

  // Technical Debt Events
  'technical_debt_created': {
    roles: ['Scrum Master', 'DevOps Engineer'], // Notify process and infrastructure teams
    message: (data) => `💸 Technical debt mới: "${data.title}" (${data.severity}) - ${data.estimatedEffort}h để fix`
  },
  'technical_debt_resolved': {
    roles: ['PM', 'BA'], // Notify sponsors when debt is resolved
    message: (data) => `✅ Technical debt "${data.title}" đã được giải quyết`
  },

  // Business Workflow Events
  'business_workflow_requirement_confirmed': {
    roles: ['Developer', 'QA Tester', 'Scrum Master'], // Notify implementation team
    message: (data) => `📋 Yêu cầu đã được BA xác nhận cho task "${data.taskName}"`
  },
  'business_workflow_ui_approved': {
    roles: ['Developer', 'QA Tester'], // Notify development team
    message: (data) => `🎨 UI/UX đã được BA phê duyệt cho task "${data.taskName}"`
  },
  'business_workflow_feature_accepted': {
    roles: ['Developer', 'QA Tester', 'DevOps Engineer'], // Notify entire delivery team
    message: (data) => `🎯 Tính năng đã được BA chấp nhận cho task "${data.taskName}"`
  },

  // Epic Events
  'epic_created': {
    roles: ['BA', 'Product Owner', 'Scrum Master'], // Notify product and process teams
    message: (data) => `🎯 Epic mới: "${data.epicTitle}" đã được tạo với ${data.totalStoryPoints} story points`
  },
  'epic_completed': {
    roles: ['BA', 'Product Owner', 'PM'], // Notify business and executive teams
    message: (data) => `🎉 Epic "${data.epicTitle}" đã hoàn thành - ${data.completedStoryPoints}/${data.totalStoryPoints} story points`
  }
};

/**
 * Get users to notify based on event type and context
 * @param {string} eventType - The type of event
 * @param {Object} context - Context data (project, task, etc.)
 * @returns {Array} Array of user IDs to notify
 */
const getUsersToNotify = async (eventType, context = {}) => {
  const rule = NOTIFICATION_RULES[eventType];
  if (!rule) return [];

  const usersToNotify = [];

  if (rule.specific) {
    // Notify specific users based on context
    switch (eventType) {
      case 'module_assigned':
        if (context.assigneeId) usersToNotify.push(context.assigneeId);
        break;
      case 'task_assigned':
        if (context.assigneeId) usersToNotify.push(context.assigneeId);
        break;
      case 'task_review_assigned':
        if (context.reviewerId) usersToNotify.push(context.reviewerId);
        break;
      case 'task_completed':
        if (context.reviewerId) usersToNotify.push(context.reviewerId);
        break;
      case 'task_reviewed_passed':
      case 'task_reviewed_failed':
        if (context.assigneeId) usersToNotify.push(context.assigneeId);
        break;
      case 'task_handover_initiated':
        // Notify new assignee and reviewer
        if (context.newAssigneeId) usersToNotify.push(context.newAssigneeId);
        if (context.newReviewerId) usersToNotify.push(context.newReviewerId);
        // Notify project manager if provided
        if (context.projectManagerId) usersToNotify.push(context.projectManagerId);
        break;
      case 'task_handover_completed':
        // Notify original assignee
        if (context.originalAssigneeId) usersToNotify.push(context.originalAssigneeId);
        // Notify project manager if provided
        if (context.projectManagerId) usersToNotify.push(context.projectManagerId);
        break;
      case 'task_handover_reminder':
        // Notify current assignee and reviewer
        if (context.currentAssigneeId) usersToNotify.push(context.currentAssigneeId);
        if (context.currentReviewerId) usersToNotify.push(context.currentReviewerId);
        break;
      case 'task_handover_rejected':
        // Notify user who attempted handover
        if (context.attemptedById) usersToNotify.push(context.attemptedById);
        break;
      case 'task_handover_files_uploaded':
        // Notify reviewer
        if (context.reviewerId) usersToNotify.push(context.reviewerId);
        break;
      case 'task_handover_files_rejected':
        // Notify assignee
        if (context.assigneeId) usersToNotify.push(context.assigneeId);
        break;
      case 'task_qa_passed':
      case 'task_qa_failed':
        if (context.assigneeId) usersToNotify.push(context.assigneeId);
        break;
      case 'sprint_member_added':
        if (context.memberId) usersToNotify.push(context.memberId);
        break;
      case 'sprint_member_removed':
        if (context.memberId) usersToNotify.push(context.memberId);
        break;
      case 'project_member_added':
        if (context.memberId) usersToNotify.push(context.memberId);
        break;
      case 'project_member_removed':
        if (context.memberId) usersToNotify.push(context.memberId);
        break;
      case 'project_assigned':
        if (context.assignedUserId) usersToNotify.push(context.assignedUserId);
        break;
      case 'module_created':
      case 'module_completed':
      case 'module_updated':
        if (context.projectManagerId) usersToNotify.push(context.projectManagerId);
        break;
      case 'sprint_created':
      case 'sprint_started':
      case 'sprint_completed':
      case 'sprint_updated':
        if (context.projectManagerId) usersToNotify.push(context.projectManagerId);
        break;
      case 'task_created':
      case 'task_started':
      case 'task_completed':
        if (context.projectManagerId) usersToNotify.push(context.projectManagerId);
        break;
    }
  }

  if (rule.roles && rule.roles.length > 0) {
    // Notify all users with specified roles
    try {
      console.log('Finding users with roles:', rule.roles);
      // User.status in the schema uses Vietnamese values (e.g. 'hoạt động').
      // Accept both 'hoạt động' and 'active' to be resilient to mixed data.
      const activeStatuses = ['hoạt động', 'active'];
      const users = await User.find({
        role: { $in: rule.roles },
        status: { $in: activeStatuses }
      }).select('_id');
      console.log('Found users:', users.length, users.map(u => u._id.toString()));
      usersToNotify.push(...users.map(u => u._id.toString()));
    } catch (error) {
      console.error('Error fetching users for notification:', error);
    }
  }

  // Remove duplicates
  return [...new Set(usersToNotify)];
};

/**
 * Creates and sends notifications to appropriate users based on workflow events
 * @param {string} eventType - The type of event triggering notification
 * @param {Object} data - Event data (projectName, taskName, etc.)
 * @param {Object} context - Additional context (assigneeId, reviewerId, etc.)
 */
const createWorkflowNotification = async (eventType, data = {}, context = {}) => {
  try {
    console.log('createWorkflowNotification called:', { eventType, data, context });
    const rule = NOTIFICATION_RULES[eventType];
    if (!rule) {
      console.warn(`No notification rule found for event type: ${eventType}`);
      return;
    }

    const message = rule.message(data);
    console.log('Notification message:', message);
    const userIds = await getUsersToNotify(eventType, context);
    console.log('Users to notify:', userIds);

    if (userIds.length === 0) {
      console.warn(`No users to notify for event: ${eventType}`);
      return;
    }

    // Create notifications for each user
    const notifications = [];
    for (const userId of userIds) {
      try {
        const notification = new Notification({
          user: userId,
          message,
          type: eventType,
          refId: data.refId || null,
          metadata: {
            eventType,
            ...data,
            ...context
          }
        });
        await notification.save();
        notifications.push(notification);

        // Send real-time notification
        socketManager.sendNotification(userId, notification);
      } catch (error) {
        console.error(`Error creating notification for user ${userId}:`, error);
      }
    }

    console.log(`Created ${notifications.length} notifications for event: ${eventType}`);
    return notifications;

  } catch (error) {
    console.error('Error in createWorkflowNotification:', error);
  }
};

/**
 * Legacy method for backward compatibility
 * Creates and sends a notification to a specific user
 */
const createNotification = async (userId, message, type = 'task', refId = null) => {
  try {
    const notification = new Notification({
      user: userId,
      message,
      type,
      refId,
    });
    await notification.save();

    socketManager.sendNotification(userId, notification);

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

module.exports = {
  createNotification,
  createWorkflowNotification,
  getUsersToNotify
};
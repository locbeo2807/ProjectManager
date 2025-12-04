// Dịch vụ giám sát SLA (Service Level Agreement)
// Theo dõi và thực thi SLA cấp doanh nghiệp

const Task = require('../models/Task');
const Notification = require('../models/Notification');
const Project = require('../models/Project');
const User = require('../models/User');
const socketManager = require('../socket');
const { createError } = require('../utils/error');

/**
 * SLA Rules Configuration
 */
const SLA_RULES = {
  TASK_REVIEW: {
    maxHours: 24, // Task reviews must be completed within 24 hours
    severity: 'Medium',
    notificationThreshold: 20 // Notify when 20 hours have passed
  },
  BUG_FIX: {
    maxHours: 72, // Bug fixes must be completed within 72 hours
    severity: 'High',
    notificationThreshold: 48 // Notify when 48 hours have passed
  },
  PR_REVIEW: {
    maxHours: 4, // PR reviews must be completed within 4 hours
    severity: 'High',
    notificationThreshold: 2 // Notify when 2 hours have passed
  }
};

/**
 * Check SLA compliance for tasks
 * @param {string} taskId - Task ID to check
 */
async function checkTaskSLA(taskId) {
  try {
    const task = await Task.findById(taskId).populate('assignee reviewer');
    if (!task) return;

    const now = new Date();
    const violations = [];

    // Kiểm tra SLA xem xét nhiệm vụ
    if (task.status === 'Done' && task.reviewStatus === 'Chưa') {
      const timeSinceCompletion = (now - task.updatedAt) / (1000 * 60 * 60); // hours

      if (timeSinceCompletion > SLA_RULES.TASK_REVIEW.maxHours) {
        violations.push({
          type: 'TASK_REVIEW',
          severity: SLA_RULES.TASK_REVIEW.severity,
          overdueHours: timeSinceCompletion - SLA_RULES.TASK_REVIEW.maxHours,
          taskId: task._id,
          taskName: task.name
        });
      } else if (timeSinceCompletion > SLA_RULES.TASK_REVIEW.notificationThreshold) {
        // Gửi thông báo cảnh báo
        await sendSLANotification(task.reviewer, 'TASK_REVIEW_WARNING', task);
      }
    }

    // Kiểm tra SLA sửa lỗi
    if (task.taskType === 'Bug' && task.status !== 'Done') {
      const timeSinceAssignment = (now - task.createdAt) / (1000 * 60 * 60); // hours

      if (timeSinceAssignment > SLA_RULES.BUG_FIX.maxHours) {
        violations.push({
          type: 'BUG_FIX',
          severity: SLA_RULES.BUG_FIX.severity,
          overdueHours: timeSinceAssignment - SLA_RULES.BUG_FIX.maxHours,
          taskId: task._id,
          taskName: task.name
        });
      } else if (timeSinceAssignment > SLA_RULES.BUG_FIX.notificationThreshold) {
        // Gửi thông báo cảnh báo
        await sendSLANotification(task.assignee, 'BUG_FIX_WARNING', task);
      }
    }

    // Xử lý vi phạm
    for (const violation of violations) {
      await handleSLAViolation(violation);
    }

  } catch (error) {
    console.error('Error checking task SLA:', error);
  }
}

/**
 * Send SLA-related notifications
 * @param {object} user - User to notify
 * @param {string} notificationType - Type of notification
 * @param {object} task - Related task
 */
async function sendSLANotification(user, notificationType, task) {
  try {
    let message = '';

    switch (notificationType) {
      case 'TASK_REVIEW_WARNING':
        message = `SLA Warning: Task "${task.name}" is waiting for review. Please review within 4 hours.`;
        break;
      case 'BUG_FIX_WARNING':
        message = `SLA Warning: Bug "${task.name}" needs to be fixed within 24 hours.`;
        break;
      case 'TASK_REVIEW_VIOLATION':
        message = `SLA Violation: Task "${task.name}" review is overdue by more than 24 hours.`;
        break;
      case 'BUG_FIX_VIOLATION':
        message = `SLA Violation: Bug "${task.name}" fix is overdue by more than 72 hours.`;
        break;
      case 'TASK_REVIEW_ESCALATION':
        message = `SLA Escalation: Task "${task.name}" review is severely overdue. Project Manager attention required.`;
        break;
      case 'BUG_FIX_ESCALATION':
        message = `SLA Escalation: Bug "${task.name}" fix is severely overdue. Project Manager attention required.`;
        break;
    }

    const notification = await Notification.create({
      user: user._id,
      type: 'sla_alert',
      refId: task._id.toString(),
      message
    });

    socketManager.sendNotification(user._id, notification);

  } catch (error) {
    console.error('Error sending SLA notification:', error);
  }
}

/**
 * Handle SLA violations
 * @param {object} violation - SLA violation details
 */
async function handleSLAViolation(violation) {
  try {
    // Ghi lại vi phạm
    console.warn(`SLA Violation: ${violation.type} - ${violation.taskName} (${violation.overdueHours.toFixed(1)} hours overdue)`);

    // Thông báo cho các bên liên quan
    const task = await Task.findById(violation.taskId).populate('assignee reviewer project');

    if (violation.type === 'TASK_REVIEW' && task.reviewer) {
      await sendSLANotification(task.reviewer, 'TASK_REVIEW_VIOLATION', task);
    } else if (violation.type === 'BUG_FIX' && task.assignee) {
      await sendSLANotification(task.assignee, 'BUG_FIX_VIOLATION', task);
    }

    // Kiểm tra vi phạm kéo dài và chuyển lên quản lý dự án
    await checkAndEscalateViolation(violation, task);

    // Cập nhật chỉ số sức khỏe dự án
    await updateProjectHealthMetrics(task.project, violation);

  } catch (error) {
    console.error('Error handling SLA violation:', error);
  }
}

/**
 * Get SLA compliance report for a project
 * @param {string} projectId - Project ID
 * @param {Date} startDate - Start date for report
 * @param {Date} endDate - End date for report
 */
async function getSLAComplianceReport(projectId, startDate, endDate) {
  try {
    const tasks = await Task.find({
      project: projectId,
      updatedAt: { $gte: startDate, $lte: endDate }
    });

    const report = {
      period: { startDate, endDate },
      taskReviews: {
        total: 0,
        withinSLA: 0,
        violations: 0,
        complianceRate: 0
      },
      bugFixes: {
        total: 0,
        withinSLA: 0,
        violations: 0,
        complianceRate: 0
      },
      overallCompliance: 0
    };

    for (const task of tasks) {
      // SLA xem xét nhiệm vụ
      if (task.status === 'Done' && task.reviewStatus !== 'Chưa') {
        report.taskReviews.total++;
        const reviewTime = (task.updatedAt - task.createdAt) / (1000 * 60 * 60);

        if (reviewTime <= SLA_RULES.TASK_REVIEW.maxHours) {
          report.taskReviews.withinSLA++;
        } else {
          report.taskReviews.violations++;
        }
      }

      // SLA sửa lỗi
      if (task.taskType === 'Bug' && task.status === 'Done') {
        report.bugFixes.total++;
        const fixTime = (task.updatedAt - task.createdAt) / (1000 * 60 * 60);

        if (fixTime <= SLA_RULES.BUG_FIX.maxHours) {
          report.bugFixes.withinSLA++;
        } else {
          report.bugFixes.violations++;
        }
      }
    }

    // Tính tỷ lệ tuân thủ
    report.taskReviews.complianceRate = report.taskReviews.total > 0
      ? (report.taskReviews.withinSLA / report.taskReviews.total) * 100
      : 100;

    report.bugFixes.complianceRate = report.bugFixes.total > 0
      ? (report.bugFixes.withinSLA / report.bugFixes.total) * 100
      : 100;

    // Tuân thủ tổng thể (trung bình có trọng số)
    const totalChecks = report.taskReviews.total + report.bugFixes.total;
    const totalWithinSLA = report.taskReviews.withinSLA + report.bugFixes.withinSLA;

    report.overallCompliance = totalChecks > 0
      ? (totalWithinSLA / totalChecks) * 100
      : 100;

    return report;

  } catch (error) {
    console.error('Error generating SLA compliance report:', error);
    throw error;
  }
}

/**
 * Schedule SLA monitoring (to be called by cron job)
 */
async function runSLAMonitoring() {
  try {
    console.log('Running SLA monitoring...');

    // Lấy tất cả nhiệm vụ đang hoạt động cần giám sát SLA
    const activeTasks = await Task.find({
      $or: [
        { status: 'Done', reviewStatus: 'Chưa' }, // Waiting for review
        { taskType: 'Bug', status: { $ne: 'Done' } } // Active bugs
      ]
    });

    for (const task of activeTasks) {
      await checkTaskSLA(task._id);
    }

    console.log(`SLA monitoring completed for ${activeTasks.length} tasks`);
  } catch (error) {
    console.error('Error running SLA monitoring:', error);
  }
}

/**
 * Get SLA dashboard data
 * @param {string} projectId - Project ID
 */
async function getSLADashboard(projectId) {
  try {
    const report = await getSLAComplianceReport(projectId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());

    // Lấy vi phạm SLA hiện tại
    const violations = await getCurrentSLAViolations(projectId);

    return {
      compliance: report,
      currentViolations: violations,
      slaRules: SLA_RULES
    };
  } catch (error) {
    console.error('Error getting SLA dashboard:', error);
    throw error;
  }
}

/**
 * Get current SLA violations for a project
 * @param {string} projectId - Project ID
 */
async function getCurrentSLAViolations(projectId) {
  try {
    const tasks = await Task.find({ project: projectId });
    const violations = [];

    for (const task of tasks) {
      const now = new Date();

      // Kiểm tra SLA xem xét nhiệm vụ
      if (task.status === 'Done' && task.reviewStatus === 'Chưa') {
        const timeSinceCompletion = (now - task.updatedAt) / (1000 * 60 * 60);
        if (timeSinceCompletion > SLA_RULES.TASK_REVIEW.maxHours) {
          violations.push({
            type: 'Task Review',
            taskName: task.name,
            overdueHours: Math.round(timeSinceCompletion - SLA_RULES.TASK_REVIEW.maxHours),
            severity: SLA_RULES.TASK_REVIEW.severity,
            assignee: task.reviewer?.name || 'Unassigned'
          });
        }
      }

      // Kiểm tra SLA sửa lỗi
      if (task.taskType === 'Bug' && task.status !== 'Done') {
        const timeSinceCreation = (now - task.createdAt) / (1000 * 60 * 60);
        if (timeSinceCreation > SLA_RULES.BUG_FIX.maxHours) {
          violations.push({
            type: 'Bug Fix',
            taskName: task.name,
            overdueHours: Math.round(timeSinceCreation - SLA_RULES.BUG_FIX.maxHours),
            severity: SLA_RULES.BUG_FIX.severity,
            assignee: task.assignee?.name || 'Unassigned'
          });
        }
      }
    }

    return violations;
  } catch (error) {
    console.error('Error getting current SLA violations:', error);
    throw error;
  }
}

/**
 * Check and escalate persistent SLA violations to project managers
 * @param {object} violation - SLA violation details
 * @param {object} task - Task object with populated project
 */
async function checkAndEscalateViolation(violation, task) {
  try {
    // Ngưỡng chuyển lên quản lý dự án: vi phạm quá 2 lần giới hạn thời gian
    const escalationThreshold = SLA_RULES[violation.type].maxHours * 2;

    if (violation.overdueHours >= escalationThreshold) {
      // Tìm quản lý dự án trong dự án
      const project = await Project.findById(task.project).populate('members.user');
      const projectManagers = project.members
        .filter(member => member.user && member.user.role === 'PM')
        .map(member => member.user);

      if (projectManagers.length > 0) {
        // Gửi thông báo chuyển lên cho tất cả quản lý dự án
        for (const pm of projectManagers) {
          await sendSLANotification(pm, `${violation.type}_ESCALATION`, task);
        }

        console.warn(`SLA Violation escalated to ${projectManagers.length} project managers for task: ${task.name}`);
      } else {
        console.warn(`No project managers found for escalation in project: ${project.name}`);
      }
    }
  } catch (error) {
    console.error('Error escalating SLA violation:', error);
  }
}

/**
 * Update project health metrics based on SLA violations
 * @param {string} projectId - Project ID
 * @param {object} violation - SLA violation details
 */
async function updateProjectHealthMetrics(projectId, violation) {
  try {
    const project = await Project.findById(projectId);

    if (!project) return;

    // Tăng mật độ khuyết tật dựa trên vi phạm SLA
    // Vi phạm SLA cho thấy chất lượng kém, ảnh hưởng đến sức khỏe dự án
    let defectPenalty = 0;

    if (violation.type === 'BUG_FIX') {
      defectPenalty = 0.1; // Tăng 0.1 cho mỗi vi phạm sửa lỗi
    } else if (violation.type === 'TASK_REVIEW') {
      defectPenalty = 0.05; // Tăng 0.05 cho mỗi vi phạm xem xét
    }

    // Cập nhật mật độ khuyết tật
    project.defectDensity = Math.max(0, (project.defectDensity || 0) + defectPenalty);

    // Giảm vận tốc nếu có vi phạm SLA nghiêm trọng
    if (violation.overdueHours > SLA_RULES[violation.type].maxHours * 1.5) {
      project.velocity = Math.max(0, (project.velocity || 0) - 1);
    }

    await project.save();

    console.log(`Updated project health metrics for project ${project.name}: defectDensity=${project.defectDensity.toFixed(2)}, velocity=${project.velocity}`);

  } catch (error) {
    console.error('Error updating project health metrics:', error);
  }
}

module.exports = {
  checkTaskSLA,
  getSLAComplianceReport,
  runSLAMonitoring,
  getSLADashboard,
  getCurrentSLAViolations,
  SLA_RULES
};
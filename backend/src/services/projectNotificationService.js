const { createWorkflowNotification, createNotification } = require('../services/notificationService');

/**
 * Project Notification Service
 * Handles all notifications for project-related activities
 */

/**
 * Send notification when project is created
 * @param {Object} project - Project object
 * @param {Object} creator - User who created the project
 */
const sendProjectCreatedNotification = async (project, creator) => {
  try {
    // Gửi notification theo rule role-based (PM, BA, Product Owner, v.v.)
    await createWorkflowNotification('project_created', {
      projectName: project.name,
      creatorName: creator.name
    });

    // Đảm bảo chính người tạo project cũng luôn nhận được một notification riêng
    if (creator && creator._id) {
      await createNotification(
        creator._id,
        `Bạn đã tạo dự án mới "${project.name}" thành công`,
        'project_created',
        project._id
      );
    }

    console.log(`Project created notification sent for ${project.name}`);
  } catch (error) {
    console.error('Error sending project created notification:', error);
  }
};

/**
 * Send notification when project is confirmed
 * @param {Object} project - Project object
 * @param {Object} confirmedBy - User who confirmed the project
 */
const sendProjectConfirmedNotification = async (project, confirmedBy) => {
  try {
    await createWorkflowNotification('project_confirmed', {
      projectName: project.name,
      confirmedByName: confirmedBy.name
    });

    console.log(`Project confirmed notification sent for ${project.name}`);
  } catch (error) {
    console.error('Error sending project confirmed notification:', error);
  }
};

/**
 * Send notification when project is completed
 * @param {Object} project - Project object
 * @param {Object} completedBy - User who marked project as completed
 */
const sendProjectCompletedNotification = async (project, completedBy) => {
  try {
    await createWorkflowNotification('project_completed', {
      projectName: project.name,
      completedByName: completedBy.name
    });

    console.log(`Project completed notification sent for ${project.name}`);
  } catch (error) {
    console.error('Error sending project completed notification:', error);
  }
};

/**
 * Send notification when project is updated
 * @param {Object} project - Project object
 * @param {Object} updater - User who updated the project
 * @param {Array} changes - Array of changes made
 */
const sendProjectUpdatedNotification = async (project, updater, changes) => {
  try {
    // Only notify for significant changes
    const significantChanges = changes.filter(change => 
      ['name', 'goal', 'status', 'startDate', 'endDate', 'priority'].includes(change.field)
    );

    if (significantChanges.length > 0) {
      await createWorkflowNotification('project_updated', {
        projectName: project.name,
        updaterName: updater.name,
        changes: significantChanges.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join(', ')
      });

      console.log(`Project updated notification sent for ${project.name}`);
    }
  } catch (error) {
    console.error('Error sending project updated notification:', error);
  }
};

/**
 * Send notification when project member is added
 * @param {Object} project - Project object
 * @param {Object} member - User being added
 * @param {Object} addedBy - User who added the member
 */
const sendProjectMemberAddedNotification = async (project, member, addedBy) => {
  try {
    // Notify the added member
    await createWorkflowNotification('project_member_added', {
      projectName: project.name,
      addedByName: addedBy.name,
      memberRole: member.role,
      specificUsers: [member._id]
    });

    // Notify PM and BA
    await createWorkflowNotification('project_member_added', {
      projectName: project.name,
      memberName: member.name,
      memberRole: member.role,
      addedByName: addedBy.name
    });

    console.log(`Project member added notification sent for ${member.name} to ${project.name}`);
  } catch (error) {
    console.error('Error sending project member added notification:', error);
  }
};

/**
 * Send notification when project member is removed
 * @param {Object} project - Project object
 * @param {Object} member - User being removed
 * @param {Object} removedBy - User who removed the member
 */
const sendProjectMemberRemovedNotification = async (project, member, removedBy) => {
  try {
    // Notify the removed member
    await createWorkflowNotification('project_member_removed', {
      projectName: project.name,
      removedByName: removedBy.name,
      specificUsers: [member._id]
    });

    // Notify PM and BA
    await createWorkflowNotification('project_member_removed', {
      projectName: project.name,
      memberName: member.name,
      removedByName: removedBy.name
    });

    console.log(`Project member removed notification sent for ${member.name} from ${project.name}`);
  } catch (error) {
    console.error('Error sending project member removed notification:', error);
  }
};

/**
 * Send notification for project deadline warning
 * @param {Object} project - Project object
 * @param {number} daysRemaining - Days until deadline
 */
const sendProjectDeadlineWarning = async (project, daysRemaining) => {
  try {
    await createWorkflowNotification('project_deadline_warning', {
      projectName: project.name,
      daysRemaining
    });

    console.log(`Project deadline warning sent for ${project.name} (${daysRemaining} days remaining)`);
  } catch (error) {
    console.error('Error sending project deadline warning:', error);
  }
};

/**
 * Send notification for project deadline breach
 * @param {Object} project - Project object
 * @param {number} daysOverdue - Days overdue
 */
const sendProjectDeadlineBreach = async (project, daysOverdue) => {
  try {
    await createWorkflowNotification('project_deadline_breach', {
      projectName: project.name,
      daysOverdue
    });

    console.log(`Project deadline breach sent for ${project.name} (${daysOverdue} days overdue)`);
  } catch (error) {
    console.error('Error sending project deadline breach:', error);
  }
};

/**
 * Send notification for project progress report
 * @param {Object} project - Project object
 * @param {Object} progressData - Progress statistics
 */
const sendProjectProgressReport = async (project, progressData) => {
  try {
    await createWorkflowNotification('project_progress_report', {
      projectName: project.name,
      completedModules: progressData.completedModules,
      totalModules: progressData.totalModules,
      completedTasks: progressData.completedTasks,
      totalTasks: progressData.totalTasks,
      progressPercentage: progressData.progressPercentage
    });

    console.log(`Project progress report sent for ${project.name}`);
  } catch (error) {
    console.error('Error sending project progress report:', error);
  }
};

/**
 * Send notification when project budget warning is triggered
 * @param {Object} project - Project object
 * @param {number} budgetUsed - Budget used amount
 * @param {number} budgetTotal - Total budget
 * @param {number} percentage - Percentage used
 */
const sendProjectBudgetWarning = async (project, budgetUsed, budgetTotal, percentage) => {
  try {
    await createWorkflowNotification('project_budget_warning', {
      projectName: project.name,
      budgetUsed,
      budgetTotal,
      percentage
    });

    console.log(`Project budget warning sent for ${project.name} (${percentage}% used)`);
  } catch (error) {
    console.error('Error sending project budget warning:', error);
  }
};

/**
 * Send notification when project milestone is reached
 * @param {Object} project - Project object
 * @param {string} milestoneName - Name of the milestone
 * @param {Object} milestoneData - Milestone details
 */
const sendProjectMilestoneReached = async (project, milestoneName, milestoneData) => {
  try {
    await createWorkflowNotification('project_milestone_reached', {
      projectName: project.name,
      milestoneName,
      milestoneData
    });

    console.log(`Project milestone reached notification sent for ${project.name}: ${milestoneName}`);
  } catch (error) {
    console.error('Error sending project milestone reached notification:', error);
  }
};

module.exports = {
  sendProjectCreatedNotification,
  sendProjectConfirmedNotification,
  sendProjectCompletedNotification,
  sendProjectUpdatedNotification,
  sendProjectMemberAddedNotification,
  sendProjectMemberRemovedNotification,
  sendProjectDeadlineWarning,
  sendProjectDeadlineBreach,
  sendProjectProgressReport,
  sendProjectBudgetWarning,
  sendProjectMilestoneReached
};

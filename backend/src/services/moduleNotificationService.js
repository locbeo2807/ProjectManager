const { createWorkflowNotification } = require('../services/notificationService');

/**
 * Module Notification Service
 * Handles all notifications for module-related activities
 */

/**
 * Send notification when module is created
 * @param {Object} module - Module object
 * @param {Object} creator - User who created the module
 */
const sendModuleCreatedNotification = async (module, creator) => {
  try {
    await createWorkflowNotification('module_created', {
      moduleName: module.name,
      projectName: module.project?.name || 'Unknown Project',
      creatorName: creator.name,
      projectId: module.project?._id
    });

    console.log(`Module created notification sent for ${module.name}`);
  } catch (error) {
    console.error('Error sending module created notification:', error);
  }
};

/**
 * Send notification when module is assigned to owner
 * @param {Object} module - Module object
 * @param {Object} owner - User being assigned as owner
 * @param {Object} assignedBy - User who made the assignment
 */
const sendModuleAssignedNotification = async (module, owner, assignedBy) => {
  try {
    // Notify the new owner
    await createWorkflowNotification('module_assigned', {
      moduleName: module.name,
      projectName: module.project?.name || 'Unknown Project',
      assignedByName: assignedBy.name,
      specificUsers: [owner._id]
    });

    // Notify PM and BA team
    await createWorkflowNotification('module_assigned', {
      moduleName: module.name,
      ownerName: owner.name,
      assignedByName: assignedBy.name,
      projectName: module.project?.name || 'Unknown Project',
      projectId: module.project?._id
    });

    console.log(`Module assigned notification sent for ${owner.name} to ${module.name}`);
  } catch (error) {
    console.error('Error sending module assigned notification:', error);
  }
};

/**
 * Send notification when module is completed
 * @param {Object} module - Module object
 */
const sendModuleCompletedNotification = async (module) => {
  try {
    await createWorkflowNotification('module_completed', {
      moduleName: module.name,
      projectName: module.project?.name || 'Unknown Project',
      projectId: module.project?._id
    });

    console.log(`Module completed notification sent for ${module.name}`);
  } catch (error) {
    console.error('Error sending module completed notification:', error);
  }
};

/**
 * Send notification when module is updated
 * @param {Object} module - Module object
 * @param {Object} updater - User who updated the module
 * @param {Array} changes - Array of changes made
 */
const sendModuleUpdatedNotification = async (module, updater, changes) => {
  try {
    // Only notify for significant changes
    const significantChanges = changes.filter(change => 
      ['name', 'goal', 'status', 'owner', 'startDate', 'endDate'].includes(change.field)
    );

    if (significantChanges.length > 0) {
      await createWorkflowNotification('module_updated', {
        moduleName: module.name,
        updaterName: updater.name,
        changes: significantChanges.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join(', '),
        projectName: module.project?.name || 'Unknown Project',
        projectId: module.project?._id
      });

      console.log(`Module updated notification sent for ${module.name}`);
    }
  } catch (error) {
    console.error('Error sending module updated notification:', error);
  }
};

/**
 * Send notification when module deadline is approaching
 * @param {Object} module - Module object
 * @param {number} daysRemaining - Days until deadline
 */
const sendModuleDeadlineWarning = async (module, daysRemaining) => {
  try {
    await createWorkflowNotification('module_deadline_warning', {
      moduleName: module.name,
      daysRemaining,
      projectName: module.project?.name || 'Unknown Project',
      projectId: module.project?._id
    });

    console.log(`Module deadline warning sent for ${module.name} (${daysRemaining} days remaining)`);
  } catch (error) {
    console.error('Error sending module deadline warning:', error);
  }
};

/**
 * Send notification when module deadline is breached
 * @param {Object} module - Module object
 * @param {number} daysOverdue - Days overdue
 */
const sendModuleDeadlineBreach = async (module, daysOverdue) => {
  try {
    await createWorkflowNotification('module_deadline_breach', {
      moduleName: module.name,
      daysOverdue,
      projectName: module.project?.name || 'Unknown Project',
      projectId: module.project?._id
    });

    console.log(`Module deadline breach sent for ${module.name} (${daysOverdue} days overdue)`);
  } catch (error) {
    console.error('Error sending module deadline breach:', error);
  }
};

/**
 * Send notification for module progress report
 * @param {Object} module - Module object
 * @param {Object} progressData - Progress statistics
 */
const sendModuleProgressReport = async (module, progressData) => {
  try {
    await createWorkflowNotification('module_progress_report', {
      moduleName: module.name,
      completedTasks: progressData.completedTasks,
      totalTasks: progressData.totalTasks,
      progressPercentage: progressData.progressPercentage,
      projectName: module.project?.name || 'Unknown Project',
      projectId: module.project?._id
    });

    console.log(`Module progress report sent for ${module.name}`);
  } catch (error) {
    console.error('Error sending module progress report:', error);
  }
};

/**
 * Send notification when module quality gate fails
 * @param {Object} module - Module object
 * @param {string} failureReason - Reason for failure
 */
const sendModuleQualityGateFailed = async (module, failureReason) => {
  try {
    await createWorkflowNotification('module_quality_gate_failed', {
      moduleName: module.name,
      failureReason,
      projectName: module.project?.name || 'Unknown Project',
      projectId: module.project?._id
    });

    console.log(`Module quality gate failed notification sent for ${module.name}`);
  } catch (error) {
    console.error('Error sending module quality gate failed notification:', error);
  }
};

/**
 * Send notification when module quality gate passes
 * @param {Object} module - Module object
 */
const sendModuleQualityGatePassed = async (module) => {
  try {
    await createWorkflowNotification('module_quality_gate_passed', {
      moduleName: module.name,
      projectName: module.project?.name || 'Unknown Project',
      projectId: module.project?._id
    });

    console.log(`Module quality gate passed notification sent for ${module.name}`);
  } catch (error) {
    console.error('Error sending module quality gate passed notification:', error);
  }
};

module.exports = {
  sendModuleCreatedNotification,
  sendModuleAssignedNotification,
  sendModuleCompletedNotification,
  sendModuleUpdatedNotification,
  sendModuleDeadlineWarning,
  sendModuleDeadlineBreach,
  sendModuleProgressReport,
  sendModuleQualityGateFailed,
  sendModuleQualityGatePassed
};

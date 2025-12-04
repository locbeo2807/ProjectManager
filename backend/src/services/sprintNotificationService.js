const { createWorkflowNotification } = require('../services/notificationService');

/**
 * Sprint Notification Service
 * Handles all notifications for sprint-related activities
 */

/**
 * Send notification when sprint is created
 * @param {Object} sprint - Sprint object
 * @param {Object} creator - User who created the sprint
 */
const sendSprintCreatedNotification = async (sprint, creator) => {
  try {
    await createWorkflowNotification('sprint_created', {
      sprintName: sprint.name,
      moduleName: sprint.module?.name || 'Unknown Module',
      creatorName: creator.name,
      projectId: sprint.module?.project?._id
    });

    console.log(`Sprint created notification sent for ${sprint.name}`);
  } catch (error) {
    console.error('Error sending sprint created notification:', error);
  }
};

/**
 * Send notification when sprint is started
 * @param {Object} sprint - Sprint object
 * @param {Array} tasks - Tasks in the sprint
 */
const sendSprintStartedNotification = async (sprint, tasks) => {
  try {
    const totalStoryPoints = tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);
    
    await createWorkflowNotification('sprint_started', {
      sprintName: sprint.name,
      totalTasks: tasks.length,
      totalStoryPoints,
      projectId: sprint.module?.project?._id
    });

    console.log(`Sprint started notification sent for ${sprint.name}`);
  } catch (error) {
    console.error('Error sending sprint started notification:', error);
  }
};

/**
 * Send notification when sprint is completed
 * @param {Object} sprint - Sprint object
 * @param {number} velocity - Sprint velocity
 */
const sendSprintCompletedNotification = async (sprint, velocity) => {
  try {
    await createWorkflowNotification('sprint_completed', {
      sprintName: sprint.name,
      velocity,
      projectId: sprint.module?.project?._id
    });

    console.log(`Sprint completed notification sent for ${sprint.name}`);
  } catch (error) {
    console.error('Error sending sprint completed notification:', error);
  }
};

/**
 * Send notification when sprint is updated
 * @param {Object} sprint - Sprint object
 * @param {Object} updater - User who updated the sprint
 * @param {Array} changes - Array of changes made
 */
const sendSprintUpdatedNotification = async (sprint, updater, changes) => {
  try {
    // Only notify for significant changes
    const significantChanges = changes.filter(change => 
      ['name', 'goal', 'startDate', 'endDate', 'status'].includes(change.field)
    );

    if (significantChanges.length > 0) {
      await createWorkflowNotification('sprint_updated', {
        sprintName: sprint.name,
        updaterName: updater.name,
        changes: significantChanges.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join(', '),
        projectId: sprint.module?.project?._id
      });

      console.log(`Sprint updated notification sent for ${sprint.name}`);
    }
  } catch (error) {
    console.error('Error sending sprint updated notification:', error);
  }
};

/**
 * Send notification when sprint member is added
 * @param {Object} sprint - Sprint object
 * @param {Object} member - User being added
 * @param {Object} addedBy - User who added the member
 */
const sendSprintMemberAddedNotification = async (sprint, member, addedBy) => {
  try {
    // Notify the added member
    await createWorkflowNotification('sprint_member_added', {
      sprintName: sprint.name,
      addedByName: addedBy.name,
      specificUsers: [member._id]
    });

    // Notify BA and Scrum Master
    await createWorkflowNotification('sprint_member_added', {
      sprintName: sprint.name,
      memberName: member.name,
      addedByName: addedBy.name,
      projectId: sprint.module?.project?._id
    });

    console.log(`Sprint member added notification sent for ${member.name} to ${sprint.name}`);
  } catch (error) {
    console.error('Error sending sprint member added notification:', error);
  }
};

/**
 * Send notification when sprint member is removed
 * @param {Object} sprint - Sprint object
 * @param {Object} member - User being removed
 * @param {Object} removedBy - User who removed the member
 */
const sendSprintMemberRemovedNotification = async (sprint, member, removedBy) => {
  try {
    // Notify the removed member
    await createWorkflowNotification('sprint_member_removed', {
      sprintName: sprint.name,
      removedByName: removedBy.name,
      specificUsers: [member._id]
    });

    // Notify BA and Scrum Master
    await createWorkflowNotification('sprint_member_removed', {
      sprintName: sprint.name,
      memberName: member.name,
      removedByName: removedBy.name,
      projectId: sprint.module?.project?._id
    });

    console.log(`Sprint member removed notification sent for ${member.name} from ${sprint.name}`);
  } catch (error) {
    console.error('Error sending sprint member removed notification:', error);
  }
};

/**
 * Send notification for sprint deadline warning
 * @param {Object} sprint - Sprint object
 * @param {number} daysRemaining - Days until deadline
 */
const sendSprintDeadlineWarning = async (sprint, daysRemaining) => {
  try {
    await createWorkflowNotification('sprint_deadline_warning', {
      sprintName: sprint.name,
      daysRemaining,
      projectId: sprint.module?.project?._id
    });

    console.log(`Sprint deadline warning sent for ${sprint.name} (${daysRemaining} days remaining)`);
  } catch (error) {
    console.error('Error sending sprint deadline warning:', error);
  }
};

/**
 * Send notification for sprint deadline breach
 * @param {Object} sprint - Sprint object
 * @param {number} daysOverdue - Days overdue
 */
const sendSprintDeadlineBreach = async (sprint, daysOverdue) => {
  try {
    await createWorkflowNotification('sprint_deadline_breach', {
      sprintName: sprint.name,
      daysOverdue,
      projectId: sprint.module?.project?._id
    });

    console.log(`Sprint deadline breach sent for ${sprint.name} (${daysOverdue} days overdue)`);
  } catch (error) {
    console.error('Error sending sprint deadline breach:', error);
  }
};

/**
 * Send notification for sprint velocity report
 * @param {Object} sprint - Sprint object
 * @param {Object} velocityData - Velocity statistics
 */
const sendSprintVelocityReport = async (sprint, velocityData) => {
  try {
    await createWorkflowNotification('sprint_velocity_report', {
      sprintName: sprint.name,
      plannedVelocity: velocityData.planned,
      actualVelocity: velocityData.actual,
      efficiency: velocityData.efficiency,
      projectId: sprint.module?.project?._id
    });

    console.log(`Sprint velocity report sent for ${sprint.name}`);
  } catch (error) {
    console.error('Error sending sprint velocity report:', error);
  }
};

module.exports = {
  sendSprintCreatedNotification,
  sendSprintStartedNotification,
  sendSprintCompletedNotification,
  sendSprintUpdatedNotification,
  sendSprintMemberAddedNotification,
  sendSprintMemberRemovedNotification,
  sendSprintDeadlineWarning,
  sendSprintDeadlineBreach,
  sendSprintVelocityReport
};

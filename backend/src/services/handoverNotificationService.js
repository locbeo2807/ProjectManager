const { createWorkflowNotification } = require('../services/notificationService');

/**
 * Handover Notification Service
 * Handles all notifications for task handover workflows
 */

/**
 * Send notification when task handover is initiated
 * @param {Object} task - Task object
 * @param {Object} fromUser - User who initiated handover
 * @param {Object} toUser - User receiving handover
 * @param {Object} reviewer - Reviewer for the task
 */
const sendHandoverInitiatedNotification = async (task, fromUser, toUser, reviewer) => {
  try {
    // Notify new assignee
    await createWorkflowNotification('task_handover_initiated', {
      taskName: task.name,
      taskId: task.taskId,
      handoverFromName: fromUser.name,
      sprintName: task.sprint?.name || 'Unknown Sprint',
      projectId: task.sprint?.module?.project?._id,
      newAssigneeId: toUser._id
    }, {
      newAssigneeId: toUser._id,
      projectManagerId: task.sprint?.module?.project?.projectManager
    });

    // Notify reviewer (if different from assignee)
    if (reviewer && reviewer._id !== toUser._id) {
      await createWorkflowNotification('task_handover_initiated', {
        taskName: task.name,
        taskId: task.taskId,
        handoverFromName: fromUser.name,
        sprintName: task.sprint?.name || 'Unknown Sprint',
        projectId: task.sprint?.module?.project?._id,
        newReviewerId: reviewer._id
      }, {
        newReviewerId: reviewer._id,
        projectManagerId: task.sprint?.module?.project?.projectManager
      });
    }

    // Notify BA and Scrum Master
    await createWorkflowNotification('task_handover_initiated', {
      taskName: task.name,
      taskId: task.taskId,
      handoverFromName: fromUser.name,
      newAssigneeName: toUser.name,
      sprintName: task.sprint?.name || 'Unknown Sprint',
      projectId: task.sprint?.module?.project?._id
    }, {
      projectManagerId: task.sprint?.module?.project?.projectManager
    });

    console.log(`Handover initiated notifications sent for task ${task.taskId}`);
  } catch (error) {
    console.error('Error sending handover initiated notifications:', error);
  }
};

/**
 * Send notification when task handover is completed
 * @param {Object} task - Task object
 * @param {Object} fromUser - Original assignee
 * @param {Object} toUser - New assignee
 */
const sendHandoverCompletedNotification = async (task, fromUser, toUser) => {
  try {
    // Notify original assignee (if different from new assignee)
    if (fromUser && fromUser._id !== toUser._id) {
      await createWorkflowNotification('task_handover_completed', {
        taskName: task.name,
        taskId: task.taskId,
        newAssigneeName: toUser.name,
        sprintName: task.sprint?.name || 'Unknown Sprint',
        projectId: task.sprint?.module?.project?._id,
        originalAssigneeId: fromUser._id
      }, {
        originalAssigneeId: fromUser._id,
        projectManagerId: task.sprint?.module?.project?.projectManager
      });
    }

    // Notify BA, Scrum Master, and Project Manager
    await createWorkflowNotification('task_handover_completed', {
      taskName: task.name,
      taskId: task.taskId,
      newAssigneeName: toUser.name,
      sprintName: task.sprint?.name || 'Unknown Sprint',
      projectId: task.sprint?.module?.project?._id
    }, {
      projectManagerId: task.sprint?.module?.project?.projectManager
    });

    console.log(`Handover completed notifications sent for task ${task.taskId}`);
  } catch (error) {
    console.error('Error sending handover completed notifications:', error);
  }
};

/**
 * Send notification for batch handover in sprint
 * @param {Array} tasks - Array of tasks being handed over
 * @param {Object} sprint - Sprint object
 * @param {Object} initiator - User who initiated batch handover
 */
const sendBatchHandoverNotification = async (tasks, sprint, initiator) => {
  try {
    await createWorkflowNotification('sprint_handover_batch', {
      taskCount: tasks.length,
      sprintName: sprint.name,
      initiatorName: initiator.name,
      projectId: sprint.module?.project?._id
    });

    console.log(`Batch handover notification sent for ${tasks.length} tasks in sprint ${sprint.name}`);
  } catch (error) {
    console.error('Error sending batch handover notification:', error);
  }
};

/**
 * Send reminder notification for pending handover
 * @param {Object} task - Task object
 * @param {Object} assignee - Current assignee
 * @param {Object} reviewer - Current reviewer
 */
const sendHandoverReminderNotification = async (task, assignee, reviewer) => {
  try {
    // Notify assignee
    await createWorkflowNotification('task_handover_reminder', {
      taskName: task.name,
      taskId: task.taskId,
      sprintName: task.sprint?.name || 'Unknown Sprint',
      projectId: task.sprint?.module?.project?._id,
      currentAssigneeId: assignee._id
    });

    // Notify reviewer (if different)
    if (reviewer && reviewer._id !== assignee._id) {
      await createWorkflowNotification('task_handover_reminder', {
        taskName: task.name,
        taskId: task.taskId,
        sprintName: task.sprint?.name || 'Unknown Sprint',
        projectId: task.sprint?.module?.project?._id,
        currentReviewerId: reviewer._id
      });
    }

    console.log(`Handover reminder sent for task ${task.taskId}`);
  } catch (error) {
    console.error('Error sending handover reminder:', error);
  }
};

/**
 * Send notification for handover rejection
 * @param {Object} task - Task object
 * @param {Object} fromUser - User who rejected handover
 * @param {Object} toUser - User who attempted handover
 * @param {string} reason - Reason for rejection
 */
const sendHandoverRejectionNotification = async (task, fromUser, toUser, reason) => {
  try {
    // Notify user who attempted handover
    await createWorkflowNotification('task_handover_rejected', {
      taskName: task.name,
      taskId: task.taskId,
      rejectorName: fromUser.name,
      reason: reason,
      sprintName: task.sprint?.name || 'Unknown Sprint',
      projectId: task.sprint?.module?.project?._id,
      attemptedById: toUser._id
    });

    // Notify BA and Scrum Master
    await createWorkflowNotification('task_handover_rejected', {
      taskName: task.name,
      taskId: task.taskId,
      rejectorName: fromUser.name,
      attemptedAssigneeName: toUser.name,
      reason: reason,
      sprintName: task.sprint?.name || 'Unknown Sprint',
      projectId: task.sprint?.module?.project?._id
    });

    console.log(`Handover rejection notification sent for task ${task.taskId}`);
  } catch (error) {
    console.error('Error sending handover rejection notification:', error);
  }
};

module.exports = {
  sendHandoverInitiatedNotification,
  sendHandoverCompletedNotification,
  sendBatchHandoverNotification,
  sendHandoverReminderNotification,
  sendHandoverRejectionNotification
};

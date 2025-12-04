const cron = require('node-cron');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const User = require('../models/User');
const { createWorkflowNotification } = require('./notificationService');

/**
 * SLA Monitoring Service
 * Monitors tasks and sprints for SLA violations and sends notifications
 */

// SLA Thresholds (in hours)
const SLA_THRESHOLDS = {
  TASK_IN_PROGRESS: 24, // Task should not be in "Đang làm" for more than 24 hours
  TASK_REVIEW_PENDING: 8, // Task should not be in "Đang xem xét" for more than 8 hours
  TASK_QA_PENDING: 4, // Task should not be in "Kiểm thử QA" for more than 4 hours
  SPRINT_DURATION: 160, // Sprint should not exceed 160 hours (20 working days)
  HANDOVER_DELAY: 2, // Handover should be completed within 2 hours
};

/**
 * Check task SLA violations
 */
const checkTaskSLAViolations = async () => {
  try {
    const now = new Date();
    const violations = [];

    // Check tasks that are in progress for too long
    const longRunningTasks = await Task.find({
      status: 'Đang làm',
      updatedAt: { $lt: new Date(now.getTime() - SLA_THRESHOLDS.TASK_IN_PROGRESS * 60 * 60 * 1000) }
    }).populate('assignee reviewer sprint');

    for (const task of longRunningTasks) {
      const hoursOverdue = Math.floor((now - task.updatedAt) / (1000 * 60 * 60));
      
      // Notify assignee
      if (task.assignee) {
        await createWorkflowNotification('sla_warning', {
          slaType: 'Task in progress',
          itemName: task.name,
          remainingHours: `quá hạn ${hoursOverdue} giờ`,
          specificUsers: [task.assignee._id]
        });
      }

      // Notify BA and Scrum Master
      await createWorkflowNotification('sla_warning', {
        slaType: 'Task in progress',
        itemName: task.name,
        remainingHours: `quá hạn ${hoursOverdue} giờ`
      });

      violations.push({
        type: 'TASK_IN_PROGRESS',
        task: task._id,
        hoursOverdue
      });
    }

    // Check tasks pending review for too long
    const reviewPendingTasks = await Task.find({
      status: 'Đang xem xét',
      updatedAt: { $lt: new Date(now.getTime() - SLA_THRESHOLDS.TASK_REVIEW_PENDING * 60 * 60 * 1000) }
    }).populate('assignee reviewer sprint');

    for (const task of reviewPendingTasks) {
      const hoursOverdue = Math.floor((now - task.updatedAt) / (1000 * 60 * 60));
      
      // Notify reviewer
      if (task.reviewer) {
        await createWorkflowNotification('sla_warning', {
          slaType: 'Task review pending',
          itemName: task.name,
          remainingHours: `quá hạn ${hoursOverdue} giờ`,
          specificUsers: [task.reviewer._id]
        });
      }

      // Notify BA and Scrum Master
      await createWorkflowNotification('sla_warning', {
        slaType: 'Task review pending',
        itemName: task.name,
        remainingHours: `quá hạn ${hoursOverdue} giờ`
      });

      violations.push({
        type: 'TASK_REVIEW_PENDING',
        task: task._id,
        hoursOverdue
      });
    }

    // Check tasks pending QA for too long
    const qaPendingTasks = await Task.find({
      status: 'Kiểm thử QA',
      updatedAt: { $lt: new Date(now.getTime() - SLA_THRESHOLDS.TASK_QA_PENDING * 60 * 60 * 1000) }
    }).populate('assignee reviewer sprint');

    for (const task of qaPendingTasks) {
      const hoursOverdue = Math.floor((now - task.updatedAt) / (1000 * 60 * 60));
      
      // Notify QA team members
      const qaUsers = await User.find({ role: 'QA Tester' });
      for (const qaUser of qaUsers) {
        await createWorkflowNotification('sla_warning', {
          slaType: 'Task QA pending',
          itemName: task.name,
          remainingHours: `quá hạn ${hoursOverdue} giờ`,
          specificUsers: [qaUser._id]
        });
      }

      // Notify BA and Scrum Master
      await createWorkflowNotification('sla_warning', {
        slaType: 'Task QA pending',
        itemName: task.name,
        remainingHours: `quá hạn ${hoursOverdue} giờ`
      });

      violations.push({
        type: 'TASK_QA_PENDING',
        task: task._id,
        hoursOverdue
      });
    }

    console.log(`SLA Check: Found ${violations.length} task violations`);
    return violations;
  } catch (error) {
    console.error('Error checking task SLA violations:', error);
    return [];
  }
};

/**
 * Check sprint SLA violations
 */
const checkSprintSLAViolations = async () => {
  try {
    const now = new Date();
    const violations = [];

    // Check sprints that are running for too long
    const longRunningSprints = await Sprint.find({
      status: 'Đang thực hiện',
      startDate: { $lt: new Date(now.getTime() - SLA_THRESHOLDS.SPRINT_DURATION * 60 * 60 * 1000) }
    }).populate('module createdBy');

    for (const sprint of longRunningSprints) {
      const daysOverdue = Math.floor((now - sprint.startDate) / (1000 * 60 * 60 * 24));
      
      // Notify PM and BA
      await createWorkflowNotification('sla_warning', {
        slaType: 'Sprint duration',
        itemName: sprint.name,
        remainingHours: `quá hạn ${daysOverdue} ngày`
      });

      violations.push({
        type: 'SPRINT_DURATION',
        sprint: sprint._id,
        daysOverdue
      });
    }

    console.log(`SLA Check: Found ${violations.length} sprint violations`);
    return violations;
  } catch (error) {
    console.error('Error checking sprint SLA violations:', error);
    return [];
  }
};

/**
 * Check handover delays
 */
const checkHandoverDelays = async () => {
  try {
    const now = new Date();
    const violations = [];

    // Find tasks with recent handover activity that haven't been updated
    const handoverTasks = await Task.find({
      'history.action': 'handover',
      updatedAt: { 
        $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
        $lt: new Date(now.getTime() - SLA_THRESHOLDS.HANDOVER_DELAY * 60 * 60 * 1000) // More than 2 hours ago
      }
    }).populate('assignee reviewer sprint');

    for (const task of handoverTasks) {
      const hoursSinceHandover = Math.floor((now - task.updatedAt) / (1000 * 60 * 60));
      
      // Get the most recent handover history
      const handoverHistory = task.history
        .filter(h => h.action === 'handover')
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      if (handoverHistory && hoursSinceHandover > SLA_THRESHOLDS.HANDOVER_DELAY) {
        // Notify current assignee and reviewer
        if (task.assignee) {
          await createWorkflowNotification('sla_warning', {
            slaType: 'Handover delay',
            itemName: task.name,
            remainingHours: `chưa được cập nhật trong ${hoursSinceHandover} giờ`,
            specificUsers: [task.assignee._id]
          });
        }

        if (task.reviewer) {
          await createWorkflowNotification('sla_warning', {
            slaType: 'Handover delay',
            itemName: task.name,
            remainingHours: `chưa được cập nhật trong ${hoursSinceHandover} giờ`,
            specificUsers: [task.reviewer._id]
          });
        }

        // Notify BA and Scrum Master
        await createWorkflowNotification('sla_warning', {
          slaType: 'Handover delay',
          itemName: task.name,
          remainingHours: `chưa được cập nhật trong ${hoursSinceHandover} giờ`
        });

        violations.push({
          type: 'HANDOVER_DELAY',
          task: task._id,
          hoursSinceHandover
        });
      }
    }

    console.log(`SLA Check: Found ${violations.length} handover delays`);
    return violations;
  } catch (error) {
    console.error('Error checking handover delays:', error);
    return [];
  }
};

/**
 * Run all SLA checks
 */
const runAllSLAChecks = async () => {
  try {
    console.log('🔍 Running SLA checks...');
    
    const [taskViolations, sprintViolations, handoverDelays] = await Promise.all([
      checkTaskSLAViolations(),
      checkSprintSLAViolations(),
      checkHandoverDelays()
    ]);

    const totalViolations = taskViolations.length + sprintViolations.length + handoverDelays.length;
    
    if (totalViolations > 0) {
      console.log(`⚠️ SLA Check Complete: ${totalViolations} violations found`);
      console.log(`  - Task violations: ${taskViolations.length}`);
      console.log(`  - Sprint violations: ${sprintViolations.length}`);
      console.log(`  - Handover delays: ${handoverDelays.length}`);
    } else {
      console.log('✅ SLA Check Complete: No violations found');
    }

    return {
      taskViolations,
      sprintViolations,
      handoverDelays,
      totalViolations
    };
  } catch (error) {
    console.error('Error running SLA checks:', error);
    return null;
  }
};

/**
 * Schedule SLA monitoring
 */
const scheduleSLAMonitoring = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    await runAllSLAChecks();
  });

  // Run every 30 minutes for critical checks
  cron.schedule('*/30 * * * *', async () => {
    await checkHandoverDelays();
  });

  console.log('📅 SLA Monitoring scheduled - Every hour and every 30 minutes for critical checks');
};

/**
 * Manual SLA check trigger
 */
const triggerSLACheck = async (type = 'all') => {
  switch (type) {
    case 'tasks':
      return await checkTaskSLAViolations();
    case 'sprints':
      return await checkSprintSLAViolations();
    case 'handovers':
      return await checkHandoverDelays();
    case 'all':
    default:
      return await runAllSLAChecks();
  }
};

module.exports = {
  checkTaskSLAViolations,
  checkSprintSLAViolations,
  checkHandoverDelays,
  runAllSLAChecks,
  scheduleSLAMonitoring,
  triggerSLACheck,
  SLA_THRESHOLDS
};

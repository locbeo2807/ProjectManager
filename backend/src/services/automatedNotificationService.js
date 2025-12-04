const cron = require('node-cron');
const Project = require('../models/Project');
const Module = require('../models/Module');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const User = require('../models/User');
const { createWorkflowNotification } = require('./notificationService');

/**
 * Automated Notification Service
 * Handles scheduled notifications for various system events
 */

// Notification thresholds
const NOTIFICATION_THRESHOLDS = {
  DEADLINE_WARNING_DAYS: 3, // Warn 3 days before deadline
  DEADLINE_CRITICAL_DAYS: 1, // Critical warning 1 day before deadline
  PROGRESS_REPORT_INTERVAL: '0 9 * * 1', // Every Monday at 9 AM
  BUDGET_WARNING_PERCENTAGE: 80, // Warn at 80% budget usage
  BUDGET_CRITICAL_PERCENTAGE: 95, // Critical at 95% budget usage
  INACTIVITY_HOURS: 48, // Warn after 48 hours of inactivity
};

/**
 * Check project deadlines and send warnings
 */
const checkProjectDeadlines = async () => {
  try {
    const now = new Date();
    const warningDate = new Date(now.getTime() + NOTIFICATION_THRESHOLDS.DEADLINE_WARNING_DAYS * 24 * 60 * 60 * 1000);
    const criticalDate = new Date(now.getTime() + NOTIFICATION_THRESHOLDS.DEADLINE_CRITICAL_DAYS * 24 * 60 * 60 * 1000);

    // Check for deadline warnings
    const projectsWarning = await Project.find({
      endDate: { $lte: warningDate, $gte: criticalDate },
      status: { $nin: ['Hoàn thành', 'Đã đóng'] }
    });

    for (const project of projectsWarning) {
      const daysRemaining = Math.ceil((project.endDate - now) / (1000 * 60 * 60 * 24));
      
      await createWorkflowNotification('project_deadline_warning', {
        projectName: project.name,
        daysRemaining
      });
    }

    // Check for critical deadline warnings
    const projectsCritical = await Project.find({
      endDate: { $lte: criticalDate, $gte: now },
      status: { $nin: ['Hoàn thành', 'Đã đóng'] }
    });

    for (const project of projectsCritical) {
      const daysRemaining = Math.ceil((project.endDate - now) / (1000 * 60 * 60 * 24));
      
      await createWorkflowNotification('project_deadline_breach', {
        projectName: project.name,
        daysOverdue: Math.abs(daysRemaining)
      });
    }

    console.log(`Deadline check: ${projectsWarning.length} warnings, ${projectsCritical.length} critical`);
  } catch (error) {
    console.error('Error checking project deadlines:', error);
  }
};

/**
 * Check module deadlines and send warnings
 */
const checkModuleDeadlines = async () => {
  try {
    const now = new Date();
    const warningDate = new Date(now.getTime() + NOTIFICATION_THRESHOLDS.DEADLINE_WARNING_DAYS * 24 * 60 * 60 * 1000);
    const criticalDate = new Date(now.getTime() + NOTIFICATION_THRESHOLDS.DEADLINE_CRITICAL_DAYS * 24 * 60 * 60 * 1000);

    // Check for deadline warnings
    const modulesWarning = await Module.find({
      endDate: { $lte: warningDate, $gte: criticalDate },
      status: { $nin: ['Hoàn thành', 'Đã đóng'] }
    }).populate('project');

    for (const module of modulesWarning) {
      const daysRemaining = Math.ceil((module.endDate - now) / (1000 * 60 * 60 * 24));
      
      await createWorkflowNotification('module_deadline_warning', {
        moduleName: module.name,
        projectName: module.project?.name || 'Unknown',
        daysRemaining,
        projectId: module.project?._id
      });
    }

    // Check for critical deadline warnings
    const modulesCritical = await Module.find({
      endDate: { $lte: criticalDate, $gte: now },
      status: { $nin: ['Hoàn thành', 'Đã đóng'] }
    }).populate('project');

    for (const module of modulesCritical) {
      const daysRemaining = Math.ceil((module.endDate - now) / (1000 * 60 * 60 * 24));
      
      await createWorkflowNotification('module_deadline_breach', {
        moduleName: module.name,
        projectName: module.project?.name || 'Unknown',
        daysOverdue: Math.abs(daysRemaining),
        projectId: module.project?._id
      });
    }

    console.log(`Module deadline check: ${modulesWarning.length} warnings, ${modulesCritical.length} critical`);
  } catch (error) {
    console.error('Error checking module deadlines:', error);
  }
};

/**
 * Check sprint deadlines and send warnings
 */
const checkSprintDeadlines = async () => {
  try {
    const now = new Date();
    const warningDate = new Date(now.getTime() + NOTIFICATION_THRESHOLDS.DEADLINE_WARNING_DAYS * 24 * 60 * 60 * 1000);
    const criticalDate = new Date(now.getTime() + NOTIFICATION_THRESHOLDS.DEADLINE_CRITICAL_DAYS * 24 * 60 * 60 * 1000);

    // Check for deadline warnings
    const sprintsWarning = await Sprint.find({
      endDate: { $lte: warningDate, $gte: criticalDate },
      status: { $nin: ['Hoàn thành', 'Đã đóng'] }
    }).populate({
      path: 'module',
      populate: { path: 'project' }
    });

    for (const sprint of sprintsWarning) {
      const daysRemaining = Math.ceil((sprint.endDate - now) / (1000 * 60 * 60 * 24));
      
      await createWorkflowNotification('sprint_deadline_warning', {
        sprintName: sprint.name,
        daysRemaining,
        projectId: sprint.module?.project?._id
      });
    }

    // Check for critical deadline warnings
    const sprintsCritical = await Sprint.find({
      endDate: { $lte: criticalDate, $gte: now },
      status: { $nin: ['Hoàn thành', 'Đã đóng'] }
    }).populate({
      path: 'module',
      populate: { path: 'project' }
    });

    for (const sprint of sprintsCritical) {
      const daysRemaining = Math.ceil((sprint.endDate - now) / (1000 * 60 * 60 * 24));
      
      await createWorkflowNotification('sprint_deadline_breach', {
        sprintName: sprint.name,
        daysOverdue: Math.abs(daysRemaining),
        projectId: sprint.module?.project?._id
      });
    }

    console.log(`Sprint deadline check: ${sprintsWarning.length} warnings, ${sprintsCritical.length} critical`);
  } catch (error) {
    console.error('Error checking sprint deadlines:', error);
  }
};

/**
 * Generate and send progress reports
 */
const generateProgressReports = async () => {
  try {
    // Project progress reports
    const projects = await Project.find({
      status: { $nin: ['Hoàn thành', 'Đã đóng'] }
    }).populate('modules');

    for (const project of projects) {
      const completedModules = project.modules?.filter(m => m.status === 'Hoàn thành').length || 0;
      const totalModules = project.modules?.length || 0;
      
      // Get all tasks in the project
      const projectTasks = await Task.find({
        'sprint.module': { $in: project.modules }
      });
      
      const completedTasks = projectTasks.filter(t => t.status === 'Hoàn thành').length;
      const totalTasks = projectTasks.length;
      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      await createWorkflowNotification('project_progress_report', {
        projectName: project.name,
        completedModules,
        totalModules,
        completedTasks,
        totalTasks,
        progressPercentage
      });
    }

    // Module progress reports
    const modules = await Module.find({
      status: { $nin: ['Hoàn thành', 'Đã đóng'] }
    }).populate('project');

    for (const module of modules) {
      const moduleTasks = await Task.find({ sprint: { $in: module.sprints } });
      const completedTasks = moduleTasks.filter(t => t.status === 'Hoàn thành').length;
      const totalTasks = moduleTasks.length;
      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      await createWorkflowNotification('module_progress_report', {
        moduleName: module.name,
        projectName: module.project?.name || 'Unknown',
        completedTasks,
        totalTasks,
        progressPercentage,
        projectId: module.project?._id
      });
    }

    console.log('Progress reports generated successfully');
  } catch (error) {
    console.error('Error generating progress reports:', error);
  }
};

/**
 * Check for inactive tasks and send reminders
 */
const checkInactiveTasks = async () => {
  try {
    const cutoffTime = new Date(Date.now() - NOTIFICATION_THRESHOLDS.INACTIVITY_HOURS * 60 * 60 * 1000);
    
    const inactiveTasks = await Task.find({
      status: { $in: ['Đang làm', 'Đang xem xét'] },
      updatedAt: { $lt: cutoffTime }
    }).populate('assignee reviewer sprint');

    for (const task of inactiveTasks) {
      const hoursInactive = Math.floor((Date.now() - task.updatedAt) / (1000 * 60 * 60));
      
      // Notify assignee
      if (task.assignee) {
        await createWorkflowNotification('task_inactive_reminder', {
          taskName: task.name,
          hoursInactive,
          specificUsers: [task.assignee._id]
        });
      }

      // Notify reviewer if task is in review
      if (task.reviewer && task.status === 'Đang xem xét') {
        await createWorkflowNotification('task_inactive_reminder', {
          taskName: task.name,
          hoursInactive,
          specificUsers: [task.reviewer._id]
        });
      }

      // Notify BA and Scrum Master
      await createWorkflowNotification('task_inactive_reminder', {
        taskName: task.name,
        hoursInactive
      });
    }

    console.log(`Inactive task check: ${inactiveTasks.length} tasks inactive`);
  } catch (error) {
    console.error('Error checking inactive tasks:', error);
  }
};

/**
 * Check project budget usage
 */
const checkProjectBudgets = async () => {
  try {
    const projects = await Project.find({
      status: { $nin: ['Hoàn thành', 'Đã đóng'] },
      budget: { $exists: true, $gt: 0 }
    });

    for (const project of projects) {
      // Calculate current budget usage (this would need to be implemented based on your expense tracking)
      const budgetUsed = project.budgetUsed || 0; // Placeholder - implement actual calculation
      const budgetTotal = project.budget;
      const percentage = Math.round((budgetUsed / budgetTotal) * 100);

      if (percentage >= NOTIFICATION_THRESHOLDS.BUDGET_CRITICAL_PERCENTAGE) {
        await createWorkflowNotification('project_budget_critical', {
          projectName: project.name,
          budgetUsed,
          budgetTotal,
          percentage
        });
      } else if (percentage >= NOTIFICATION_THRESHOLDS.BUDGET_WARNING_PERCENTAGE) {
        await createWorkflowNotification('project_budget_warning', {
          projectName: project.name,
          budgetUsed,
          budgetTotal,
          percentage
        });
      }
    }

    console.log('Budget check completed');
  } catch (error) {
    console.error('Error checking project budgets:', error);
  }
};

/**
 * Run all automated notification checks
 */
const runAutomatedChecks = async () => {
  try {
    console.log('🤖 Running automated notification checks...');
    
    await Promise.all([
      checkProjectDeadlines(),
      checkModuleDeadlines(),
      checkSprintDeadlines(),
      checkInactiveTasks(),
      checkProjectBudgets()
    ]);

    console.log('✅ Automated notification checks completed');
  } catch (error) {
    console.error('Error running automated checks:', error);
  }
};

/**
 * Schedule automated notifications
 */
const scheduleAutomatedNotifications = () => {
  // Run deadline checks every day at 8 AM
  cron.schedule('0 8 * * *', async () => {
    await runAutomatedChecks();
  });

  // Run progress reports every Monday at 9 AM
  cron.schedule(NOTIFICATION_THRESHOLDS.PROGRESS_REPORT_INTERVAL, async () => {
    await generateProgressReports();
  });

  // Run inactive task checks every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    await checkInactiveTasks();
  });

  // Run budget checks every Friday at 4 PM
  cron.schedule('0 16 * * 5', async () => {
    await checkProjectBudgets();
  });

  console.log('📅 Automated notifications scheduled');
  console.log('  - Daily deadline checks at 8:00 AM');
  console.log('  - Weekly progress reports on Monday at 9:00 AM');
  console.log('  - Inactive task checks every 6 hours');
  console.log('  - Budget checks on Friday at 4:00 PM');
};

/**
 * Manual trigger for specific checks
 */
const triggerAutomatedCheck = async (type = 'all') => {
  switch (type) {
    case 'deadlines':
      await Promise.all([
        checkProjectDeadlines(),
        checkModuleDeadlines(),
        checkSprintDeadlines()
      ]);
      break;
    case 'progress':
      await generateProgressReports();
      break;
    case 'inactive':
      await checkInactiveTasks();
      break;
    case 'budget':
      await checkProjectBudgets();
      break;
    case 'all':
    default:
      await runAutomatedChecks();
      break;
  }
};

module.exports = {
  checkProjectDeadlines,
  checkModuleDeadlines,
  checkSprintDeadlines,
  generateProgressReports,
  checkInactiveTasks,
  checkProjectBudgets,
  runAutomatedChecks,
  scheduleAutomatedNotifications,
  triggerAutomatedCheck,
  NOTIFICATION_THRESHOLDS
};

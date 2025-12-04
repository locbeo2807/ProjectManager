// Dịch vụ theo dõi tiến độ
// Tính toán tiến độ và cập nhật trạng thái tự động cấp doanh nghiệp

const Task = require('../models/Task');
const Module = require('../models/Module');
const Project = require('../models/Project');
const Sprint = require('../models/Sprint');
const socketManager = require('../socket');
const Notification = require('../models/Notification');

/**
 * Update progress when a task status changes
 * @param {string} taskId - Task ID
 * @param {string} oldStatus - Previous task status
 * @param {string} newStatus - New task status
 */
async function updateProgressOnTaskChange(taskId, oldStatus, newStatus) {
  try {
    const task = await Task.findById(taskId).populate('sprint');
    if (!task) return;

    // Cập nhật tiến độ module
    await updateModuleProgress(task.sprint);

    // Cập nhật tiến độ dự án
    await updateProjectProgress(task.project);

    // Kiểm tra vi phạm quy tắc nghiệp vụ
    await enforceBusinessRules(task, oldStatus, newStatus);

    // Gửi cập nhật thời gian thực
    await sendProgressUpdates(task.project);

  } catch (error) {
    console.error('Error updating progress on task change:', error);
  }
}

/**
 * Update module progress based on its tasks
 * @param {string} sprintId - Sprint ID containing the tasks
 */
async function updateModuleProgress(sprintId) {
  try {
    const sprint = await Sprint.findById(sprintId).populate('module');
    if (!sprint || !sprint.module) return;

    const module = await Module.findById(sprint.module);
    if (!module) return;

    await module.calculateProgress();
    await module.save();

    // Nếu module hoàn thành, kiểm tra xem trạng thái dự án có nên thay đổi không
    if (module.status === 'Hoàn thành') {
      await checkProjectCompletion(module.project);
    }

  } catch (error) {
    console.error('Error updating module progress:', error);
  }
}

/**
 * Update project progress based on its modules
 * @param {string} projectId - Project ID
 */
async function updateProjectProgress(projectId) {
  try {
    const project = await Project.findById(projectId);
    if (!project) return;

    await project.calculateProgress();
    await project.save();

  } catch (error) {
    console.error('Error updating project progress:', error);
  }
}

/**
 * Check if project should be marked as completed
 * @param {string} projectId - Project ID
 */
async function checkProjectCompletion(projectId) {
  try {
    const modules = await Module.find({ project: projectId });
    const totalModules = modules.length;
    const completedModules = modules.filter(m => m.status === 'Hoàn thành').length;

    if (totalModules > 0 && completedModules === totalModules) {
      const project = await Project.findById(projectId);
      if (project && project.status !== 'Hoàn thành') {
        project.status = 'Hoàn thành';
        await project.save();

        // Thông báo cho các bên liên quan
        await notifyProjectCompletion(project);
      }
    }

  } catch (error) {
    console.error('Error checking project completion:', error);
  }
}

/**
 * Enforce business rules for task transitions
 * @param {object} task - Task object
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 */
async function enforceBusinessRules(task, oldStatus, newStatus) {
  try {
    // Quy tắc 1: Yêu cầu tiêu chí chấp nhận cho trạng thái Hoàn thành
    if (newStatus === 'Done' && (!task.acceptanceCriteria || task.acceptanceCriteria.length === 0)) {
      throw new Error('Task must have acceptance criteria to be marked as Done');
    }

    // Quy tắc 2: Xác thực quy trình nghiệp vụ
    if (newStatus === 'Done' && task.businessWorkflow) {
      const { baConfirmRequirement, baApproveUI, baAcceptFeature } = task.businessWorkflow;
      if (!baConfirmRequirement || !baApproveUI || !baAcceptFeature) {
        throw new Error('All business workflow steps must be completed before marking task as Done');
      }
    }

    // Quy tắc 3: Người xem xét không thể là người được giao
    if (task.reviewer && task.assignee && task.reviewer.toString() === task.assignee.toString()) {
      throw new Error('Task reviewer cannot be the same as assignee');
    }

    // Quy tắc 4: Phải hoàn thành các phụ thuộc
    if (task.dependencies && task.dependencies.length > 0) {
      const dependencies = await Task.find({ _id: { $in: task.dependencies } });
      const incompleteDeps = dependencies.filter(dep =>
        !['Done', 'Cancelled'].includes(dep.status)
      );

      if (incompleteDeps.length > 0) {
        throw new Error('All task dependencies must be completed first');
      }
    }

  } catch (error) {
    // Hoàn nguyên thay đổi trạng thái nếu vi phạm quy tắc nghiệp vụ
    task.status = oldStatus;
    await task.save();
    throw error;
  }
}

/**
 * Send real-time progress updates to clients
 * @param {string} projectId - Project ID
 */
async function sendProgressUpdates(projectId) {
  try {
    const project = await Project.findById(projectId)
      .populate('members.user', 'name email')
      .select('progress status members');

    // Gửi cho tất cả thành viên dự án
    project.members.forEach(member => {
      socketManager.sendToUser(member.user._id, 'projectProgressUpdate', {
        projectId,
        progress: project.progress,
        status: project.status
      });
    });

  } catch (error) {
    console.error('Error sending progress updates:', error);
  }
}

/**
 * Notify stakeholders when project is completed
 * @param {object} project - Project object
 */
async function notifyProjectCompletion(project) {
  try {
    const message = `Dự án "${project.name}" đã hoàn thành thành công! 🎉`;

    // Thông báo cho tất cả thành viên dự án
    for (const member of project.members) {
      await Notification.create({
        user: member.user,
        type: 'project_completed',
        refId: project._id.toString(),
        message
      });

      socketManager.sendNotification(member.user, {
        type: 'project_completed',
        message,
        projectId: project._id
      });
    }

  } catch (error) {
    console.error('Error sending project completion notifications:', error);
  }
}

/**
 * Calculate sprint velocity
 * @param {string} sprintId - Sprint ID
 */
async function calculateSprintVelocity(sprintId) {
  try {
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) return;

    const tasks = await Task.find({ sprint: sprintId });
    const completedPoints = tasks
      .filter(task => task.status === 'Done' && task.reviewStatus === 'Đạt')
      .reduce((sum, task) => sum + (task.storyPoints || 0), 0);

    sprint.velocity = completedPoints;
    await sprint.save();

    // Cập nhật vận tốc dự án (trung bình lăn)
    await updateProjectVelocity(sprint.project);

  } catch (error) {
    console.error('Error calculating sprint velocity:', error);
  }
}

/**
 * Update project velocity based on completed sprints
 * @param {string} projectId - Project ID
 */
async function updateProjectVelocity(projectId) {
  try {
    const sprints = await Sprint.find({ project: projectId })
      .sort({ endDate: -1 })
      .limit(5); // Last 5 sprints

    if (sprints.length > 0) {
      const totalVelocity = sprints.reduce((sum, sprint) => sum + (sprint.velocity || 0), 0);
      const avgVelocity = totalVelocity / sprints.length;

      const project = await Project.findById(projectId);
      project.velocity = Math.round(avgVelocity);
      await project.save();
    }

  } catch (error) {
    console.error('Error updating project velocity:', error);
  }
}

/**
 * Bulk update progress for all projects (maintenance function)
 */
async function bulkUpdateAllProgress() {
  try {
    console.log('Starting bulk progress update...');

    const projects = await Project.find({});
    for (const project of projects) {
      await project.calculateProgress();
      await project.save();
      console.log(`Updated progress for project: ${project.name}`);
    }

    console.log('Bulk progress update completed');
  } catch (error) {
    console.error('Error in bulk progress update:', error);
  }
}

/**
 * Handle task status change - main entry point for task status updates
 * @param {string} taskId - Task ID
 * @param {string} newStatus - New task status
 * @param {string} userId - User who made the change
 */
async function handleTaskStatusChange(taskId, newStatus, userId) {
  try {
    const task = await Task.findById(taskId).populate('sprint');
    if (!task) return;

    const oldStatus = task.status;

    // Enforce business rules first
    await enforceBusinessRules(task, oldStatus, newStatus);

    // Update progress
    await updateProgressOnTaskChange(taskId, oldStatus, newStatus);

    // Calculate velocity if sprint completed
    if (newStatus === 'Done' && task.reviewStatus === 'Đạt') {
      await calculateSprintVelocity(task.sprint._id);
    }

  } catch (error) {
    console.error('Error handling task status change:', error);
    throw error;
  }
}

module.exports = {
  updateProgressOnTaskChange,
  updateModuleProgress,
  updateProjectProgress,
  checkProjectCompletion,
  enforceBusinessRules,
  sendProgressUpdates,
  notifyProjectCompletion,
  calculateSprintVelocity,
  updateProjectVelocity,
  bulkUpdateAllProgress,
  handleTaskStatusChange
};
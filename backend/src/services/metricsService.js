const Task = require('../models/Task');
const User = require('../models/User');
const Sprint = require('../models/Sprint');
const Module = require('../models/Module');
const Project = require('../models/Project');

// Theo dõi SLA
async function getSLAMetrics(projectId) {
  const tasks = await Task.find({ sprint: { $in: await Sprint.find({ project: projectId }).select('_id') } });

  const now = new Date();
  const slaMetrics = {
    taskReviewsWithin24h: 0,
    totalTaskReviews: 0,
    bugFixesWithin72h: 0,
    totalBugs: 0,
    prChecksWithin4h: 0, // Assuming PRs are tracked elsewhere
    totalPRs: 0
  };

  for (const task of tasks) {
    if (task.status === 'Done' && task.reviewStatus !== 'Chưa') {
      slaMetrics.totalTaskReviews++;
      const reviewTime = task.history.find(h => h.action === 'cập nhật đánh giá')?.timestamp;
      if (reviewTime) {
        const timeDiff = (reviewTime - task.updatedAt) / (1000 * 60 * 60); // hours
        if (timeDiff <= 24) slaMetrics.taskReviewsWithin24h++;
      }
    }

    if (task.taskType === 'Bug' && task.status === 'Closed') {
      slaMetrics.totalBugs++;
      const fixTime = task.history.find(h => h.action === 'cập nhật trạng thái' && h.description.includes('Closed'))?.timestamp;
      if (fixTime) {
        const timeDiff = (fixTime - task.createdAt) / (1000 * 60 * 60); // hours
        if (timeDiff <= 72) slaMetrics.bugFixesWithin72h++;
      }
    }
  }

  return slaMetrics;
}

// Chỉ số năng suất
async function getProductivityMetrics(userId, projectId) {
  const tasks = await Task.find({
    $or: [{ assignee: userId }, { reviewer: userId }],
    sprint: { $in: await Sprint.find({ project: projectId }).select('_id') }
  });

  const metrics = {
    tasksCompleted: 0,
    bugsIntroduced: 0,
    reviewTime: 0,
    totalReviews: 0,
    estimationAccuracy: 0
  };

  for (const task of tasks) {
    if (task.assignee?.toString() === userId && task.status === 'Done') {
      metrics.tasksCompleted++;
      if (task.estimatedHours && task.actualHours) {
        const accuracy = Math.min(task.estimatedHours / task.actualHours, task.actualHours / task.estimatedHours);
        metrics.estimationAccuracy += accuracy;
      }
    }

    if (task.taskType === 'Bug' && task.createdBy?.toString() === userId) {
      metrics.bugsIntroduced++;
    }

    if (task.reviewer?.toString() === userId) {
      const reviewEntry = task.history.find(h => h.action === 'cập nhật đánh giá' && h.fromUser?.toString() === userId);
      if (reviewEntry) {
        metrics.totalReviews++;
        // Giả sử thời gian xem xét được theo dõi bằng cách nào đó
      }
    }
  }

  if (metrics.tasksCompleted > 0) {
    metrics.estimationAccuracy /= metrics.tasksCompleted;
  }

  return metrics;
}

// Bảng điều khiển báo cáo thời gian thực
async function getDashboardMetrics(projectId) {
  const tasks = await Task.find({ sprint: { $in: await Sprint.find({ project: projectId }).select('_id') } });
  const modules = await Module.find({ project: projectId });
  const sprints = await Sprint.find({ project: projectId });

  const bugs = tasks.filter(t => t.taskType === 'Bug');
  const bugSeverity = {
    Low: bugs.filter(b => b.priority === 'Thấp').length,
    Medium: bugs.filter(b => b.priority === 'Trung bình').length,
    High: bugs.filter(b => b.priority === 'Cao').length,
    Critical: bugs.filter(b => b.priority === 'Khẩn cấp').length
  };

  const moduleProgress = modules.map(m => ({
    name: m.name,
    progress: m.progress || 0
  }));

  const sprintVelocity = sprints.map(s => ({
    name: s.name,
    velocity: s.velocity || 0
  }));

  const teamCapacity = await User.find({}); // Assuming all users are in project
  const activeTasks = tasks.filter(t => ['In Progress', 'In Review', 'QA Test'].includes(t.status)).length;

  return {
    totalBugs: bugs.length,
    bugSeverity,
    moduleProgress,
    sprintVelocity,
    teamCapacity: teamCapacity.length,
    activeTasks,
    projectProgress: await Project.findById(projectId).then(p => p.progress || 0)
  };
}

module.exports = {
  getSLAMetrics,
  getProductivityMetrics,
  getDashboardMetrics
};
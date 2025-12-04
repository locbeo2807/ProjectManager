const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const Project = require('../models/Project');
const User = require('../models/User');
const Risk = require('../models/Risk');
const TechnicalDebt = require('../models/TechnicalDebt');
const Epic = require('../models/Epic');
const mongoose = require('mongoose');
const { createError } = require('../utils/error');

// Chỉ số SLA - Giám sát Thỏa thuận Mức Dịch vụ
exports.getSLAMetrics = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // SLA xem xét nhiệm vụ (trong vòng 24 giờ)
    const recentTasks = await Task.find({
      project: projectId,
      updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    let taskReviewsWithin24h = 0;
    let totalTaskReviews = 0;

    recentTasks.forEach(task => {
      if (task.status === 'Done' && task.reviewStatus !== 'Chưa') {
        totalTaskReviews++;
        if (task.updatedAt && task.createdAt) {
          const reviewTime = (task.updatedAt - task.createdAt) / (1000 * 60 * 60); // hours
          if (reviewTime <= 24) {
            taskReviewsWithin24h++;
          }
        }
      }
    });

    // SLA sửa lỗi (trong vòng 72 giờ)
    const bugTasks = recentTasks.filter(task => task.taskType === 'Bug');
    let bugFixesWithin72h = 0;
    let totalBugs = bugTasks.length;

    bugTasks.forEach(task => {
      if (task.status === 'Done' && task.reviewStatus === 'Đạt') {
        if (task.updatedAt && task.createdAt) {
          const fixTime = (task.updatedAt - task.createdAt) / (1000 * 60 * 60); // hours
          if (fixTime <= 72) {
            bugFixesWithin72h++;
          }
        }
      }
    });

    // SLA xem xét PR (trong vòng 4 giờ) - Điều này sẽ cần tích hợp với hệ thống Git
    // Hiện tại, chúng ta sẽ sử dụng một placeholder
    const prChecksWithin4h = 0;
    const totalPRs = 0;

    res.json({
      taskReviewsWithin24h,
      totalTaskReviews,
      bugFixesWithin72h,
      totalBugs,
      prChecksWithin4h,
      totalPRs
    });
  } catch (error) {
    next(error);
  }
};

// Chỉ số Năng suất Người dùng
exports.getUserProductivityMetrics = async (req, res, next) => {
  try {
    const { userId, projectId } = req.params;

    // Nhiệm vụ hoàn thành bởi người dùng trong dự án
    const userTasks = await Task.find({
      $or: [
        { assignee: userId },
        { reviewer: userId }
      ],
      project: projectId
    });

    const tasksCompleted = userTasks.filter(task =>
      task.assignee && task.assignee.toString() === userId &&
      task.status === 'Done' && task.reviewStatus === 'Đạt'
    ).length;

    // Lỗi được giới thiệu (nhiệm vụ có loại 'Bug' được tạo bởi người dùng)
    const bugsIntroduced = userTasks.filter(task =>
      task.taskType === 'Bug' && task.createdBy && task.createdBy.toString() === userId
    ).length;

    // Thời gian xem xét (thời gian trung bình cho các lần xem xét)
    const reviewTasks = userTasks.filter(task =>
      task.reviewer && task.reviewer.toString() === userId &&
      task.status === 'Done'
    );

    let totalReviewTime = 0;
    let reviewCount = 0;

    reviewTasks.forEach(task => {
      if (task.updatedAt && task.createdAt) {
        const reviewTime = (task.updatedAt - task.createdAt) / (1000 * 60); // minutes
        totalReviewTime += reviewTime;
        reviewCount++;
      }
    });

    const reviewTime = reviewCount > 0 ? Math.round(totalReviewTime / reviewCount) : 0;
    const totalReviews = reviewTasks.length;

    // Độ chính xác ước tính (kế hoạch so với thực tế)
    const completedTasksWithEstimates = userTasks.filter(task =>
      task.assignee && task.assignee.toString() === userId &&
      task.status === 'Done' &&
      task.estimatedHours && task.actualHours
    );

    let totalEstimated = 0;
    let totalActual = 0;

    completedTasksWithEstimates.forEach(task => {
      totalEstimated += task.estimatedHours;
      totalActual += task.actualHours;
    });

    const estimationAccuracy = totalEstimated > 0 ? Math.round((totalEstimated / totalActual) * 100) / 100 : 0;

    res.json({
      tasksCompleted,
      bugsIntroduced,
      reviewTime,
      totalReviews,
      estimationAccuracy
    });
  } catch (error) {
    next(error);
  }
};

// Chỉ số Bảng điều khiển - Sức khỏe dự án toàn diện
exports.getDashboardMetrics = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Thống kê lỗi
    const allTasks = await Task.find({ project: projectId });
    const bugs = allTasks.filter(task => task.taskType === 'Bug');

    const bugSeverity = {
      Low: bugs.filter(bug => bug.priority === 'Thấp').length,
      Medium: bugs.filter(bug => bug.priority === 'Trung bình').length,
      High: bugs.filter(bug => bug.priority === 'Cao').length,
      Critical: bugs.filter(bug => bug.priority === 'Khẩn cấp').length
    };

    const totalBugs = bugs.length;

    // Tiến độ module
    const modules = await mongoose.model('Module').find({ project: projectId });
    const moduleProgress = modules.map(module => ({
      name: module.name,
      progress: module.progress || 0
    }));

    // Tốc độ sprint
    const sprints = await Sprint.find({ project: projectId })
      .sort({ createdAt: -1 })
      .limit(10);

    const sprintVelocity = [];
    for (const sprint of sprints) {
      const sprintTasks = await Task.find({ sprint: sprint._id });
      const completedPoints = sprintTasks
        .filter(task => task.status === 'Done' && task.reviewStatus === 'Đạt')
        .reduce((sum, task) => sum + (task.storyPoints || 0), 0);

      sprintVelocity.push({
        name: sprint.name,
        velocity: completedPoints
      });
    }

    // Năng lực đội ngũ
    const teamMembers = await User.find({
      _id: { $in: (await Project.findById(projectId)).members.map(m => m.user) }
    });

    const teamCapacity = teamMembers.length;

    // Nhiệm vụ đang hoạt động
    const activeTasks = allTasks.filter(task =>
      ['To Do', 'In Progress', 'In Review', 'QA Test'].includes(task.status)
    ).length;

    // Tính toán tiến độ dự án
    let projectProgress = 0;
    if (modules.length > 0) {
      const totalProgress = moduleProgress.reduce((sum, module) => sum + module.progress, 0);
      projectProgress = Math.round(totalProgress / modules.length);
    }

    res.json({
      totalBugs,
      bugSeverity,
      moduleProgress,
      sprintVelocity,
      teamCapacity,
      activeTasks,
      projectProgress
    });
  } catch (error) {
    next(error);
  }
};

// Chỉ số Hiệu suất Đội ngũ
exports.getTeamPerformanceMetrics = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Lấy tất cả thành viên đội ngũ
    const project = await Project.findById(projectId).populate('members.user');
    const teamMembers = project.members.map(m => m.user);

    // Tính toán chỉ số cho từng thành viên đội ngũ
    const teamMetrics = [];

    for (const member of teamMembers) {
      const userTasks = await Task.find({
        $or: [
          { assignee: member._id },
          { reviewer: member._id }
        ],
        project: projectId
      });

      const tasksCompleted = userTasks.filter(task =>
        task.assignee && task.assignee.toString() === member._id.toString() &&
        task.status === 'Done' && task.reviewStatus === 'Đạt'
      ).length;

      const tasksAssigned = userTasks.filter(task =>
        task.assignee && task.assignee.toString() === member._id.toString()
      ).length;

      const reviewsCompleted = userTasks.filter(task =>
        task.reviewer && task.reviewer.toString() === member._id.toString() &&
        task.reviewStatus !== 'Chưa'
      ).length;

      const avgTaskCompletionTime = calculateAverageCompletionTime(userTasks, member._id);

      teamMetrics.push({
        userId: member._id,
        userName: member.name,
        role: member.role,
        tasksCompleted,
        tasksAssigned,
        completionRate: tasksAssigned > 0 ? Math.round((tasksCompleted / tasksAssigned) * 100) : 0,
        reviewsCompleted,
        avgTaskCompletionTime
      });
    }

    res.json(teamMetrics);
  } catch (error) {
    next(error);
  }
};

// Chỉ số Chất lượng
exports.getQualityMetrics = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Mật độ khuyết tật (lỗi trên điểm story)
    const allTasks = await Task.find({ project: projectId });
    const bugs = allTasks.filter(task => task.taskType === 'Bug');
    const totalStoryPoints = allTasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);

    const defectDensity = totalStoryPoints > 0 ? (bugs.length / totalStoryPoints) : 0;

    // Phạm vi mã (placeholder - sẽ cần tích hợp CI/CD)
    const codeCoverage = 85; // Default value

    // Tỷ lệ kiểm tra tự động (placeholder)
    const automatedTestRate = 80; // Default value

    // Lỗ hổng bảo mật (placeholder)
    const securityVulnerabilities = 0; // Default value

    // Chỉ số nợ kỹ thuật
    const technicalDebt = await TechnicalDebt.find({ project: projectId });
    const totalDebtItems = technicalDebt.length;
    const resolvedDebtItems = technicalDebt.filter(debt => debt.status === 'Resolved').length;
    const debtResolutionRate = totalDebtItems > 0 ? (resolvedDebtItems / totalDebtItems) * 100 : 0;

    res.json({
      defectDensity: Math.round(defectDensity * 100) / 100,
      codeCoverage,
      automatedTestRate,
      securityVulnerabilities,
      totalDebtItems,
      resolvedDebtItems,
      debtResolutionRate: Math.round(debtResolutionRate)
    });
  } catch (error) {
    next(error);
  }
};

// Hàm trợ giúp để tính thời gian hoàn thành trung bình
function calculateAverageCompletionTime(tasks, userId) {
  const completedTasks = tasks.filter(task =>
    task.assignee && task.assignee.toString() === userId.toString() &&
    task.status === 'Done' &&
    task.createdAt && task.updatedAt
  );

  if (completedTasks.length === 0) return 0;

  const totalTime = completedTasks.reduce((sum, task) => {
    return sum + (task.updatedAt - task.createdAt);
  }, 0);

  const avgTimeMs = totalTime / completedTasks.length;
  const avgTimeDays = avgTimeMs / (1000 * 60 * 60 * 24);

  return Math.round(avgTimeDays * 10) / 10; // Round to 1 decimal place
}
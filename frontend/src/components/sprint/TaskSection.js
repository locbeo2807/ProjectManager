import React, { useState } from 'react';
import EditTaskPopup from '../popups/EditTaskPopup';
import TaskDetailsPopup from '../popups/TaskDetailsPopup';
import TaskService from '../../services/taskService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import styles from './TaskSection.module.css';

const statusColors = {
  'Hàng đợi': { background: '#f1f3f5', color: '#6c757d' },
  'Chưa làm': { background: '#e3f2fd', color: '#1976d2' },
  'Đang làm': { background: '#fff3cd', color: '#b8860b' },
  'Đang xem xét': { background: '#f8d7da', color: '#dc3545' },
  'Kiểm thử QA': { background: '#d1ecf1', color: '#0c5460' },
  'Sẵn sàng phát hành': { background: '#d4edda', color: '#155724' },
  'Hoàn thành': { background: '#e6f4ea', color: '#28a745' },
};

const priorityColors = {
  'Low': { background: '#f1f3f5', color: '#6c757d' },
  'Medium': { background: '#fff3cd', color: '#b8860b' },
  'High': { background: '#f8d7da', color: '#dc3545' },
};

const TaskSection = ({ sprint, tasks, onTasksChange, onTaskCreate }) => {
  const { user } = useAuth();
  const [showEditTask, setShowEditTask] = useState(false);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('status');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [detailsInitialTab, setDetailsInitialTab] = useState(0);
  const [showCompletePopup, setShowCompletePopup] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState(null);
  const [completeFiles, setCompleteFiles] = useState([]);
  const [completeComment, setCompleteComment] = useState('');
  const [submittingComplete, setSubmittingComplete] = useState(false);

  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'all') return true;
    return task.status === filterStatus;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'status') return a.status.localeCompare(b.status);
    if (sortBy === 'priority') {
      const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    }
    if (sortBy === 'storyPoints') return (b.storyPoints || 0) - (a.storyPoints || 0);
    return 0;
  });

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setShowEditTask(true);
  };

  const handleViewTaskDetails = (task, initialTab = 0) => {
    setSelectedTask(task);
    setDetailsInitialTab(initialTab);
    setShowTaskDetails(true);
  };

  const handleTaskUpdate = (updatedTask) => {
    const newTasks = tasks.map(task =>
      task._id === updatedTask._id ? updatedTask : task
    );
    onTasksChange(newTasks);

    // Add success animation
    const taskCard = document.querySelector(`[data-task-id="${updatedTask._id}"]`);
    if (taskCard) {
      taskCard.style.animation = 'successPulse 0.6s ease-out';
      setTimeout(() => {
        taskCard.style.animation = '';
      }, 600);
    }

    setShowEditTask(false);
    setSelectedTask(null);
  };

  const handleDeleteTask = (task) => {
    setTaskToDelete(task);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      await TaskService.deleteTask(taskToDelete._id);
      const newTasks = tasks.filter(task => task._id !== taskToDelete._id);
      onTasksChange(newTasks);
      setShowDeleteConfirm(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Xóa task thất bại: ' + (error.response?.data?.message || error.message));
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setTaskToDelete(null);
  };

  const canDevCompleteTask = (task) => {
    if (!user || !task) return false;
    if (user.role !== 'Developer') return false;
    if (!['Đang làm', 'Đang sửa'].includes(task.status)) return false;
    const assignees = task.assignees || [];
    return Array.isArray(assignees) && assignees.some(a => a && a._id === user._id);
  };

  const canEditOrDeleteTask = () => {
    if (!user) return false;
    const role = user.role;
    return role === 'PM' || role === 'BA' || role === 'Admin';
  };

  const openCompletePopup = (task) => {
    setTaskToComplete(task);
    setCompleteFiles([]);
    setCompleteComment('');
    setShowCompletePopup(true);
  };

  const closeCompletePopup = () => {
    setShowCompletePopup(false);
    setTaskToComplete(null);
    setCompleteFiles([]);
    setCompleteComment('');
  };

  const handleCompleteFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setCompleteFiles(prev => [...prev, ...files]);
    }
  };

  const handleRemoveCompleteFile = (index) => {
    setCompleteFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileTypeLabel = (fileName = '') => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) return 'PDF';
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'Word';
    if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return 'Excel';
    return 'Khác';
  };

  const handleSubmitComplete = async () => {
    if (!taskToComplete || completeFiles.length === 0) {
      toast.warn('Vui lòng chọn ít nhất một file để nộp review.');
      return;
    }
    setSubmittingComplete(true);
    try {
      const result = await TaskService.uploadCompletionFiles(
        taskToComplete._id,
        completeFiles,
        completeComment
      );

      if (result && result.task) {
        onTasksChange(prev => prev.map(t => t._id === result.task._id ? result.task : t));
      }

      // Thông báo khi nộp file thành công
      toast.success('Nộp file review thành công. Task đã được gửi sang trạng thái Đang xem xét để reviewer đánh giá.');

      setShowCompletePopup(false);
      setTaskToComplete(null);
      setCompleteFiles([]);
      setCompleteComment('');
    } catch (error) {
      console.error('Error submitting completion files:', error);
      toast.error('Có lỗi xảy ra khi nộp file review.');
    } finally {
      setSubmittingComplete(false);
    }
  };

  const uniqueStatuses = [...new Set(tasks.map(task => task.status))];

  const canReviewTaskCard = (task) => {
    if (!user || !task) return false;
    if (task.status !== 'Đang xem xét') return false;
    const reviewers = task.reviewers || [];
    const isReviewer = Array.isArray(reviewers) && reviewers.some(r => r && r._id === user._id);
    const isPMOrBA = user.role === 'PM' || user.role === 'BA';
    return isReviewer || isPMOrBA;
  };

  return (
    <div className={styles.taskSection}>
      {/* Header */}
      <div className={styles.taskHeader}>
        <div className={styles.taskHeaderLeft}>
          <h3 className={styles.taskTitle}>Tasks ({tasks.length})</h3>
          <div className={styles.taskStats}>
            <span className={styles.statItem}>
              Hoàn thành: {tasks.filter(t => t.status === 'Hoàn thành').length}
            </span>
            <span className={styles.statItem}>
              Đang làm: {tasks.filter(t => t.status === 'Đang làm').length}
            </span>
          </div>
        </div>
        
        <div className={styles.taskHeaderRight}>
          <select
            className={styles.filterSelect}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          
          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="status">Sắp xếp theo trạng thái</option>
            <option value="priority">Sắp xếp theo ưu tiên</option>
            <option value="storyPoints">Sắp xếp theo story points</option>
          </select>
          
          <button className={styles.createTaskBtn} onClick={onTaskCreate}>
            + Tạo Task
          </button>
        </div>
      </div>

      {/* Task Grid */}
      <div className={styles.taskGrid}>
        {sortedTasks.length > 0 ? (
          sortedTasks.map(task => (
            <div key={task._id} className={styles.taskCard} data-task-id={task._id}>
              <div className={styles.taskCardHeader}>
                <div className={styles.taskInfo}>
                  <h4 className={styles.taskName}>{task.name}</h4>
                  <span className={styles.taskId}>#{task.taskId}</span>
                </div>
                <div className={styles.taskBadges}>
                  <span
                    className={styles.statusBadge}
                    style={statusColors[task.status]}
                  >
                    {task.status}
                  </span>
                  <span
                    className={styles.priorityBadge}
                    style={priorityColors[task.priority]}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>
              
              <div className={styles.taskDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Loại:</span>
                  <span className={styles.detailValue}>{task.taskType}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Assignee:</span>
                  <span className={styles.detailValue}>
                    {task.assignees && task.assignees.length > 0
                      ? task.assignees.map(a => a.name).join(', ')
                      : 'Chưa gán'}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Story Points:</span>
                  <span className={styles.detailValue}>{task.storyPoints || 0}</span>
                </div>
                {task.estimatedHours && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Thời gian ước tính:</span>
                    <span className={styles.detailValue}>{task.estimatedHours}h</span>
                  </div>
                )}
              </div>
              
              <div className={styles.taskFooter}>
                <button
                  className={styles.viewTaskBtn}
                  onClick={() => handleViewTaskDetails(task, 0)}
                >
                  Xem chi tiết
                </button>
                {canReviewTaskCard(task) && (
                  <button
                    className={styles.editTaskBtn}
                    onClick={() => handleViewTaskDetails(task, 2)}
                  >
                    Đánh giá
                  </button>
                )}
                {canDevCompleteTask(task) && (
                  <button
                    className={styles.editTaskBtn}
                    onClick={() => openCompletePopup(task)}
                  >
                    Hoàn thành
                  </button>
                )}
                {canEditOrDeleteTask() && (
                  <>
                    <button
                      className={styles.editTaskBtn}
                      onClick={() => handleEditTask(task)}
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      className={styles.deleteTaskBtn}
                      onClick={() => handleDeleteTask(task)}
                    >
                      Xóa
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <p className={styles.emptyText}>Chưa có task nào trong sprint này</p>
            <button className={styles.createFirstTaskBtn} onClick={onTaskCreate}>
              + Tạo Task đầu tiên
            </button>
          </div>
        )}
      </div>

      {/* Edit Task Popup */}
      {showEditTask && selectedTask && (
        <EditTaskPopup
          open={showEditTask}
          onClose={() => {
            setShowEditTask(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          onUpdate={handleTaskUpdate}
          sprint={sprint}
        />
      )}

      {/* Task Details Popup */}
      {showTaskDetails && selectedTask && (
        <TaskDetailsPopup
          open={showTaskDetails}
          onClose={() => {
            setShowTaskDetails(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          onUpdate={handleTaskUpdate}
          initialTab={detailsInitialTab}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && taskToDelete && (
        <div className={styles.confirmDialogOverlay}>
          <div className={styles.confirmDialog}>
            <h3 className={styles.confirmDialogTitle}>Xác nhận xóa task</h3>
            <p className={styles.confirmDialogMessage}>
              Bạn có chắc chắn muốn xóa task "{taskToDelete.name}"? Hành động này không thể hoàn tác.
            </p>
            <div className={styles.confirmDialogActions}>
              <button
                className={styles.confirmDialogCancel}
                onClick={cancelDelete}
              >
                Hủy
              </button>
              <button
                className={styles.confirmDialogConfirm}
                onClick={confirmDeleteTask}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Task Popup for Developer */}
      {showCompletePopup && taskToComplete && (
        <div className={styles.confirmDialogOverlay}>
          <div className={styles.confirmDialog}>
            <h3 className={styles.confirmDialogTitle}>Hoàn thành task "{taskToComplete.name}"</h3>
            <p className={styles.confirmDialogMessage}>
              Tải lên các file review/bàn giao để gửi cho người review. Sau khi nộp, task sẽ chuyển sang trạng thái "Đang xem xét".
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Mô tả ngắn cho lần nộp này (tuỳ chọn)</label>
              <textarea
                value={completeComment}
                onChange={(e) => setCompleteComment(e.target.value)}
                rows={3}
                style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}
                placeholder="Ví dụ: Đã hoàn thành giao diện và logic cơ bản, chờ review."
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Files review (chỉ Word / Excel / PDF)</label>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleCompleteFileChange}
                style={{ display: 'block', marginTop: 6 }}
              />
              {completeFiles.length > 0 && (
                <ul style={{ marginTop: 8, maxHeight: 140, overflowY: 'auto', paddingLeft: 18, fontSize: 13 }}>
                  {completeFiles.map((file, index) => (
                    <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span>
                        {file.name}
                        <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 6px', borderRadius: 10, background: '#edf2f7', color: '#4a5568' }}>
                          {getFileTypeLabel(file.name)}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCompleteFile(index)}
                        style={{ border: 'none', background: 'transparent', color: '#e53e3e', cursor: 'pointer', fontSize: 12 }}
                      >
                        Xóa
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className={styles.confirmDialogActions}>
              <button
                className={styles.confirmDialogCancel}
                onClick={closeCompletePopup}
                disabled={submittingComplete}
              >
                Hủy
              </button>
              <button
                className={styles.confirmDialogConfirm}
                onClick={handleSubmitComplete}
                disabled={submittingComplete}
              >
                {submittingComplete ? 'Đang nộp...' : 'Nộp file review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskSection;

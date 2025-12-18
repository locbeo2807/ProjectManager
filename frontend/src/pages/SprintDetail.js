import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import EditSprintPopup from '../components/popups/EditSprintPopup';
import UserService from '../api/services/user.service';
import SprintService from '../api/services/sprint.service';
import TaskSection from '../components/sprint/TaskSection';
import NewTaskPopup from '../components/popups/NewTaskPopup';
import CopyToast from '../components/common/CopyToast';
import HandoverWorkflow from '../components/sprint/HandoverWorkflow';
import styles from './SprintDetail.module.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import HistoryList from '../components/common/HistoryList';
import LoadingOverlay from '../components/common/LoadingOverlay';


const statusColors = {
  'Chưa bắt đầu': { background: '#f1f3f5', color: '#6c757d' },
  'Đang thực hiện': { background: '#e3f2fd', color: '#1976d2' },
  'Hoàn thành': { background: '#e6f4ea', color: '#28a745' },
};

const TABS = {
  TASKS: 'Danh sách task',
  HANDOVER: 'Bàn giao',
  HISTORY: 'Lịch sử cập nhật',
};

const SprintDetail = () => {
  const { sprintId } = useParams();
  const navigate = useNavigate();
  const [sprint, setSprint] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(TABS.TASKS);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [editSprintLoading, setEditSprintLoading] = useState(false);

  const fetchSprintData = useCallback(async () => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        navigate('/login');
        return;
      }
      
      const res = await axiosInstance.get(`/sprints/${sprintId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      setSprint(res.data);

      // Permission check: only admin, BA or project members can view this sprint
      try {
        const userStr = localStorage.getItem('user');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        const isAdmin = currentUser && currentUser.role === 'admin';
        const isBA = currentUser && currentUser.role === 'BA';

        if (res.data.module && !isAdmin && !isBA) {
          const moduleRes = await axiosInstance.get(`/modules/${res.data.module}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });

          const projectMembers = moduleRes.data.project && Array.isArray(moduleRes.data.project.members)
            ? moduleRes.data.project.members
            : [];

          const isMember = currentUser && projectMembers.some(mem => {
            if (typeof mem.user === 'object') {
              return mem.user._id === currentUser._id;
            }
            return mem.user === currentUser._id;
          });

          if (!isMember) {
            setError('Bạn không có quyền truy cập sprint này.');
            setSprint(null);
            setTasks([]);
            setLoading(false);
            return;
          }
        }
      } catch (permErr) {
        console.error('Error checking sprint access:', permErr);
        setError('Bạn không có quyền truy cập sprint này.');
        setSprint(null);
        setTasks([]);
        setLoading(false);
        return;
      }

      // Fetch users for task assignment
      try {
        const users = await UserService.searchUsers('');
        setUsersList(users);
      } catch {
        setUsersList([]);
      }
      
      // Fetch tasks for this sprint
      try {
        const taskRes = await axiosInstance.get(`/tasks/by-sprint/${sprintId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        setTasks(taskRes.data);
      } catch (e) {
        setTasks([]);
      }
      
      setError(null);
    } catch (err) {
      setError('Không thể tải thông tin sprint');
    } finally {
      setLoading(false);
    }
  }, [sprintId, navigate]);

  useEffect(() => {
    fetchSprintData();
  }, [fetchSprintData]);

  const handleOpenEdit = async () => {
    setEditOpen(true);
    try {
      const users = await UserService.getAllUsers();
      setUsersList(users);
    } catch {
      setUsersList([]);
    }
  };

  const handleEditSubmit = async (formData) => {
    setEditSprintLoading(true);
    try {
      await SprintService.updateSprint(sprintId, formData);
      setEditOpen(false);
      await fetchSprintData();
      toast.success('Cập nhật sprint thành công!');
    } catch (e) {
      alert('Cập nhật sprint thất bại!');
    } finally {
      setEditSprintLoading(false);
    }
  };

  const canEditSprint = sprint && (
    sprint.createdBy === JSON.parse(localStorage.getItem('user') || '{}')?._id ||
    JSON.parse(localStorage.getItem('user') || '{}').role === 'BA'
  );

  if (loading) {
    return (
      <div className={styles.container}>
        <LoadingOverlay text="Đang tải thông tin sprint..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <div className={styles.errorMessage}>{error}</div>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>❌</div>
          <div className={styles.errorMessage}>Không tìm thấy thông tin sprint</div>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <CopyToast show={showCopyToast.show} message={showCopyToast.message} onClose={() => setShowCopyToast({ show: false, message: '' })} />
      
      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.headerLeft}>
          {canEditSprint && (
            <button
              className={styles.editButton}
              onClick={handleOpenEdit}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={styles.iconMarginRight}>
                <path d="M16.474 5.474a2.121 2.121 0 1 1 3 3L8.5 19.448l-4 1 1-4 11.974-11.974z" stroke="#FA2B4D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span>Chỉnh sửa</span>
            </button>
          )}
        </div>
        
        <div className={styles.headerCenter}>
          <h1 className={styles.sprintName}>{sprint.name}</h1>
          <div className={styles.sprintMeta}>
            <span className={styles.sprintId}>#{sprint._id}</span>
            <div
              className={styles.statusBadge}
              style={{
                backgroundColor: statusColors[sprint.status]?.background,
                color: statusColors[sprint.status]?.color
              }}
            >
              {sprint.status}
            </div>
          </div>
        </div>
        
        <div className={styles.headerRight}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            ← Quay lại
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className={styles.infoSection}>
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Mục tiêu:</span>
              <span className={styles.infoValue}>{sprint.goal || 'Chưa có mục tiêu'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Thời gian:</span>
              <span className={styles.infoValue}>
                {sprint.startDate ? new Date(sprint.startDate).toLocaleDateString('vi-VN') : '-'} - {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString('vi-VN') : '-'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Thành viên:</span>
              <span className={styles.infoValue}>{sprint.members?.length || 0} người</span>
            </div>
          </div>
          
          <div className={styles.infoCard}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Tasks:</span>
              <span className={styles.infoValue}>{tasks.length} task</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Velocity:</span>
              <span className={styles.infoValue}>{sprint.velocity || 0}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Repository:</span>
              <span className={styles.infoValue}>
                {sprint.repoLink ? (
                  <a href={sprint.repoLink} target="_blank" rel="noopener noreferrer" className={styles.repoLink}>
                    View Repo
                  </a>
                ) : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsHeader}>
        <button
          className={`${styles.tabButton} ${tab === TABS.TASKS ? styles.tabButtonActive : ''}`}
          onClick={() => setTab(TABS.TASKS)}
        >
          {TABS.TASKS}
        </button>
        <button
          className={`${styles.tabButton} ${tab === TABS.HANDOVER ? styles.tabButtonActive : ''}`}
          onClick={() => setTab(TABS.HANDOVER)}
        >
          {TABS.HANDOVER}
        </button>
        <button
          className={`${styles.tabButton} ${tab === TABS.HISTORY ? styles.tabButtonActive : ''}`}
          onClick={() => setTab(TABS.HISTORY)}
        >
          {TABS.HISTORY}
        </button>
      </div>

      <div className={styles.tabContent}>
        {tab === TABS.TASKS && (
          <div>
            <TaskSection
              sprint={sprint}
              tasks={tasks}
              onTasksChange={setTasks}
              onTaskCreate={() => setShowNewTask(true)}
            />
          </div>
        )}
        
        {tab === TABS.HANDOVER && (
          <div>
            <HandoverWorkflow
              sprint={sprint}
              onSprintUpdate={fetchSprintData}
              readOnly={!canEditSprint}
            />
          </div>
        )}
        
        {tab === TABS.HISTORY && (
          <div>
            {sprint.history && sprint.history.length > 0 ? (
              <HistoryList history={sprint.history} />
            ) : <div className={styles.noHistory}>Chưa có lịch sử cập nhật</div>}
          </div>
        )}
      </div>

      {/* Edit Popup */}
      <EditSprintPopup 
        open={editOpen} 
        onClose={() => setEditOpen(false)} 
        sprint={sprint} 
        onSubmit={handleEditSubmit} 
        usersList={usersList}
        loading={editSprintLoading}
      />

      {/* New Task Popup */}
      {showNewTask && (
        <NewTaskPopup
          isOpen={showNewTask}
          onClose={() => setShowNewTask(false)}
          sprintId={sprintId}
          members={usersList}
          onTaskAdded={() => {
            fetchSprintData();
            setShowNewTask(false);
          }}
        />
      )}
    </div>
  );
};

export default SprintDetail;

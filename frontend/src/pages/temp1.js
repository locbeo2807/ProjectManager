import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import CopyToast from '../components/common/CopyToast';
import socketManager from '../utils/socket';
import ModuleService from '../api/services/module.service';
import NewModulePopup from '../components/popups/NewModulePopup';
import AddMemToProjectPopup from '../components/popups/AddMemToProjectPopup';
import EditProjectPopup from '../components/popups/EditProjectPopup';
import styles from './ProjectDetail.module.css';
import ProjectService from '../api/services/project.service';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import HistoryList from '../components/common/HistoryList';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { Close as CloseIcon, Visibility as ViewIcon } from '@mui/icons-material';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN');
}

function formatFileSize(size) {
  if (!size) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function isImageFile(fileName) {
  if (!fileName) return false;
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  const lowerFileName = fileName.toLowerCase();
  return imageExtensions.some(ext => lowerFileName.endsWith(ext));
}

function getFileIcon(fileName) {
  if (isImageFile(fileName)) return '🖼️';
  if (fileName.toLowerCase().includes('.pdf')) return '📕';
  if (fileName.toLowerCase().includes('.doc') || fileName.toLowerCase().includes('.docx')) return '📄';
  if (fileName.toLowerCase().includes('.xls') || fileName.toLowerCase().includes('.xlsx')) return '📊';
  return '📄';
}

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
}

// Status badge màu cho Project
const statusColors = {
  'Khởi tạo': { background: '#fff3cd', color: '#b8860b' },
  'Đang triển khai': { background: '#e3f2fd', color: '#1976d2' },
  'Hoàn thành': { background: '#e6f4ea', color: '#28a745' },
};
// Status badge màu cho Module (đồng bộ với ModuleDetail.js)
const moduleStatusColors = {
  'Chưa phát triển': { background: '#f1f3f5', color: '#6c757d' },
  'Đang phát triển': { background: '#e3f2fd', color: '#1976d2' },
  'Hoàn thành': { background: '#e6f4ea', color: '#28a745' },
};

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState({ show: false, message: '' });
  const [openModulePopup, setOpenModulePopup] = useState(false);
  const [tabActive, setTabActive] = useState(0); 
  const [currentUser, setCurrentUser] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editProjectLoading, setEditProjectLoading] = useState(false);
  const [hoverTab, setHoverTab] = useState([false, false]);
  const [imagePreview, setImagePreview] = useState({ open: false, src: '', name: '' });
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 900;

  const fetchProjectData = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        navigate('/login');
        return;
      }
      const projectResponse = await axiosInstance.get(`/projects/${id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setProject(projectResponse.data);
      // lấy module theo projectId
      const modulesData = await ModuleService.getModulesByProject(id);
      setModules(modulesData);
      setError(null);
    } catch (error) {
      setError('Có lỗi xảy ra khi tải thông tin dự án hoặc module');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchProjectData(); }, [fetchProjectData]);
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try { setCurrentUser(JSON.parse(userStr)); } catch (error) { console.error('Lỗi khi parse user data:', error); }
    }
  }, []);
  useEffect(() => {
    const socket = socketManager.socket;
    if (socket) {
      const handleProjectUpdate = (data) => {
        if (data.project && data.project._id === id) {
          setProject(prevProject => ({ ...prevProject, ...data.project }));
        }
      };
      socket.on('project_updated', handleProjectUpdate);
      return () => { socket.off('project_updated', handleProjectUpdate); };
    }
  }, [id]);

  // Thay thế hàm download file cũ bằng gọi service
  const handleDownloadFile = (file) => {
    ProjectService.downloadFile(project._id, file);
  };

  const handleViewImage = async (file) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      // Use the download endpoint to get the file for viewing
      const response = await axiosInstance.get(`/projects/${project._id}/files/${encodeURIComponent(file.publicId)}/download`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        responseType: 'blob'
      });

      if (response.status === 200) {
        const blob = new Blob([response.data], { type: response.data.type });
        const imageUrl = URL.createObjectURL(blob);

        setImagePreview({
          open: true,
          src: imageUrl,
          name: file.fileName
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error loading image:', error);
      toast.error('Không thể tải hình ảnh. Vui lòng kiểm tra quyền truy cập hoặc thử lại sau.');
    }
  };

  const handleCloseImagePreview = () => {
    if (imagePreview.src) {
      URL.revokeObjectURL(imagePreview.src);
    }
    setImagePreview({ open: false, src: '', name: '' });
  };

  const canEditProject = !!currentUser && currentUser.role === 'PM';
  const canCreateModule = !!currentUser && currentUser.role === 'BA';
  const isMember = !!currentUser && !!project && project.members && project.members.some(m => m.user?._id === currentUser._id);

  if (loading) {
    return (
      <div className={styles.container}>
        <LoadingOverlay text="Đang tải thông tin dự án..." style={{zIndex: 10}} />
      </div>
    );
  }
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <div className={styles.errorMessage}>{error}</div>
          <button className={styles.backButton} onClick={() => navigate('/projects')}>
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }
  if (!project) {
    return (
      <div className={styles['projectDetail-errorContainer']}>
        <div className={styles['projectDetail-errorIcon']}>❌</div>
        <p className={styles['projectDetail-errorMessage']}>Không tìm thấy thông tin dự án</p>
        <button className={styles['projectDetail-backButton']} onClick={() => navigate('/projects')}>
          Quay lại danh sách
        </button>
      </div>
    );
  }
  if (project && currentUser && !['PM','BA'].includes(currentUser.role) && !isMember) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⛔</div>
          <div className={styles.errorMessage}>Bạn không có quyền truy cập dự án này.</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
        <CopyToast show={copyFeedback.show} message={copyFeedback.message} onClose={() => setCopyFeedback({ show: false, message: '' })} />
        {/* Header */}
        <div className={styles.headerSection}>
          {!isMobile && (
            <div className={styles.headerLeft}>
              {canEditProject && (
                <button
                  className={styles.editButton}
                  onClick={()=>setShowEditPopup(true)}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={styles.iconMarginRight}>
                    <path d="M16.474 5.474a2.121 2.121 0 1 1 3 3L8.5 19.448l-4 1 1-4 11.974-11.974z" stroke="#FA2B4D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                  <span>Chỉnh sửa</span>
                </button>
              )}
            </div>
          )}
          <div className={styles.headerCenter}>
            <h1 className={styles.projectName}>{project.name}</h1>
            {!isMobile ? (
              <div className={styles.projectMeta}>
                <span className={styles.projectId}>#{project.projectId}</span>
                <span className={styles.projectVersion}>v{project.version || '1.0'}</span>
              </div>
            ) : (
              <>
                <div className={styles.headerContentRow}>
                  <span className={styles.projectId}>#{project.projectId}</span>
                  <span className={styles.projectVersion}>v{project.version || '1.0'}</span>
                  <div
                    className={styles.statusBadge}
                    style={{
                      backgroundColor: statusColors[project.status]?.background,
                      color: statusColors[project.status]?.color
                    }}
                  >
                    {project.status}
                  </div>
                </div>
                <button
                  className={styles.editButton}
                  onClick={()=>setShowEditPopup(true)}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={styles.iconMarginRight}>
                    <path d="M16.474 5.474a2.121 2.121 0 1 1 3 3L8.5 19.448l-4 1 1-4 11.974-11.974z" stroke="#FA2B4D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                  <span>Chỉnh sửa</span>
                </button>
              </>
            )}
          </div>
          {!isMobile && (
            <div className={styles.headerRight}>
              <span className={styles.statusLabel}>Trạng thái</span>
              <div
                className={styles.statusBadge}
                style={{
                  backgroundColor: moduleStatusColors[project.status]?.background,
                  color: moduleStatusColors[project.status]?.color
                }}
              >
                {project.status}

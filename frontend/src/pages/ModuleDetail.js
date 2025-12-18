import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import EditModulePopup from '../components/popups/EditModulePopup';
import UserService from '../api/services/user.service';
import ModuleService from '../api/services/module.service';
import NewSprintPopup from '../components/popups/NewSprintPopup';
import { useAuth } from '../contexts/AuthContext';
import styles from './ModuleDetail.module.css';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import HistoryList from '../components/common/HistoryList';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { Close as CloseIcon, Visibility as ViewIcon } from '@mui/icons-material';
import socketManager from '../utils/socket';

const TABS = {
  SPRINTS: 'Danh sách sprint',
  HISTORY: 'Lịch sử cập nhật',
};

const statusColors = {
  'Chưa phát triển': { background: '#f1f3f5', color: '#6c757d' },
  'Đang phát triển': { background: '#e3f2fd', color: '#1976d2' },
  'Hoàn thành': { background: '#e6f4ea', color: '#28a745' },
};

// Enhanced styles cho sprint cards
const sprintCardStyles = {
  card: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    cursor: 'pointer',
  },
  cardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
    borderColor: '#cbd5e0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 4px 0',
    lineHeight: '1.4',
  },
  goal: {
    fontSize: '13px',
    color: '#718096',
    margin: '0',
    lineHeight: '1.5',
  },
  badges: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'flex-end',
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
  },
  label: {
    color: '#718096',
    fontWeight: '500',
  },
  value: {
    color: '#2d3748',
    fontWeight: '600',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: '12px',
    borderTop: '1px solid #f7fafc',
  },
  viewButton: {
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    color: '#4a5568',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  viewButtonHover: {
    background: '#edf2f7',
    borderColor: '#cbd5e0',
    color: '#2d3748',
  },
};
// Badge màu cho trạng thái sprint
const sprintStatusColors = {
  'Chưa bắt đầu': { background: '#f1f3f5', color: '#6c757d' },
  'Đang thực hiện': { background: '#e3f2fd', color: '#1976d2' },
  'Hoàn thành': { background: '#e6f4ea', color: '#28a745' },
};

const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
};

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

const ModuleDetail = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(TABS.SPRINTS);
  const [editOpen, setEditOpen] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [editModuleLoading, setEditModuleLoading] = useState(false);
  // Thêm state cho popup tạo sprint
  const [sprintOpen, setSprintOpen] = useState(false);
  // Sử dụng react-toastify cho thông báo
  const { user } = useAuth();
  const [imagePreview, setImagePreview] = useState({ open: false, src: '', name: '' });
  // Thêm biến kiểm tra quyền chỉnh sửa và tạo sprint
  const canEditModule = user && (
    user.role === 'admin' ||
    user._id === module?.createdBy ||
    user._id === module?.owner?._id
  );
  const canCreateSprint = user && user.role === 'BA';
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth <= 900;

  const fetchModuleData = useCallback(async () => {
    setLoading(true);
    console.log('fetchModuleData called with moduleId:', moduleId);
    try {
      const accessToken = localStorage.getItem('accessToken');
      console.log('AccessToken exists:', !!accessToken);
      const res = await axiosInstance.get(`/modules/${moduleId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setModule(res.data);
      setError(null);
      try {
        // Fetch sprints instead of releases
        console.log('Fetching sprints for module:', moduleId);
        const sprintRes = await axiosInstance.get(`/sprints/by-module/${moduleId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        setSprints(sprintRes.data);
      } catch (e) {
        console.error('Error fetching sprints:', e);
        if (e.response && e.response.status === 403) {
          setError('Bạn không có quyền xem các sprint của module này.');
        } else {
          setError('Không thể tải thông tin sprint.');
        }
        setSprints([]);
      }
    } catch (err) {
      console.error('Error fetching module:', err);
      setError('Không thể tải thông tin module');
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  const refreshModuleData = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const res = await axiosInstance.get(`/modules/${moduleId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setModule(res.data);
      setError(null);
      try {
        // Fetch sprints instead of releases
        const sprintRes = await axiosInstance.get(`/sprints/by-module/${moduleId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        setSprints(sprintRes.data);
      } catch (e) {
        setSprints([]);
      }
    } catch (err) {
      console.error('Lỗi khi refresh dữ liệu module:', err);
    }
  }, [moduleId]);

  useEffect(() => {
    fetchModuleData();
  }, [fetchModuleData]);

  // Socket handling for real-time sprint updates
  useEffect(() => {
    if (moduleId) {
      // Join module room for real-time updates
      socketManager.joinModuleRoom(moduleId);

      // Listen for sprint creation events
      const handleSprintCreated = (event) => {
        const { newSprint, moduleId: eventModuleId } = event.detail;
        // Only update if the sprint belongs to this module
        if (eventModuleId === moduleId) {
          console.log('New sprint created in this module:', newSprint);
          setSprints(prevSprints => [...prevSprints, newSprint]);
        }
      };

      window.addEventListener('sprint-created', handleSprintCreated);

      // Cleanup function
      return () => {
        socketManager.leaveModuleRoom(moduleId);
        window.removeEventListener('sprint-created', handleSprintCreated);
      };
    }
  }, [moduleId]);

  // Lấy danh sách user khi mở popup
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
    setEditModuleLoading(true);
    try {
      await ModuleService.updateModule(moduleId, formData);
      setEditOpen(false);
      await refreshModuleData();
      toast.success('Cập nhật module thành công!');
    } catch (e) {
      alert('Cập nhật module thất bại!');
    } finally {
      setEditModuleLoading(false);
    }
  };

  // Thay thế hàm download file cũ bằng gọi service
  const handleDownloadFile = (doc) => {
    ModuleService.downloadFile(moduleId, doc);
  };

  const handleViewImage = async (doc) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      // Use the download endpoint to get the file for viewing
      const response = await axiosInstance.get(`/modules/${moduleId}/files/${encodeURIComponent(doc.publicId)}/download`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        responseType: 'blob'
      });

      if (response.status === 200) {
        const blob = new Blob([response.data], { type: response.data.type });
        const imageUrl = URL.createObjectURL(blob);

        setImagePreview({
          open: true,
          src: imageUrl,
          name: doc.fileName
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

  const handleDeleteSprint = async (sprintId, e) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa sprint này?')) return;
    try {
      const accessToken = localStorage.getItem('accessToken');
      await axiosInstance.delete(`/sprints/${sprintId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      await refreshModuleData();
      toast.success('Xóa sprint thành công');
    } catch (err) {
      console.error('Lỗi khi xóa sprint:', err);
      toast.error('Không thể xóa sprint. Vui lòng thử lại.');
    }
  };

  if (error) return (
    <div className={styles.container}>
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <div className={styles.errorMessage}>{error}</div>
        <button className={styles.backButton} onClick={() => navigate('/modules')}>
          Quay lại danh sách
        </button>
      </div>
    </div>
  );
  if (!module) return null;

  // Kiểm tra quyền truy cập
  let userData = user;
  if (!userData) {
    // fallback nếu chưa có user từ context
    const userStr = localStorage.getItem('user');
    userData = userStr ? JSON.parse(userStr) : null;
  }
  let isMember = false;
  if (userData && module.project && Array.isArray(module.project.members)) {
    isMember = module.project.members.some(mem => {
      if (typeof mem.user === 'object') {
        return mem.user._id === userData._id;
      }
      return mem.user === userData._id;
    });
  }
  const isAdmin = userData && userData.role === 'admin';
  const isBA = userData && userData.role === 'BA';
  if (!isAdmin && !isBA && !isMember) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⛔</div>
          <div className={styles.errorMessage}>Bạn không có quyền truy cập Module này.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {loading && <LoadingOverlay text="Đang tải thông tin module..." />}
      {/* Improved Header Row */}
      <div className={styles.headerSection}>
        {/* Responsive buttons */}
        {!isMobile && (
          <div className={styles.headerActions}>
            {module.project && module.project._id ? (
              <button
                className={styles.backButton}
                onClick={() => navigate(`/projects/${module.project._id}`)}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M12.5 15l-5-5 5-5" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Quay lại dự án
              </button>
            ) : <div className={styles.headerActionsPlaceholder}></div>}
            {canEditModule && (
              <button
                className={styles.editButton}
                onClick={handleOpenEdit}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M16.474 5.474a2.121 2.121 0 1 1 3 3L8.5 19.448l-4 1 1-4 11.974-11.974z" stroke="#FA2B4D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                <span>Chỉnh sửa</span>
              </button>
            )}
          </div>
        )}
        {isMobile && (
          <>
            {module.project && module.project._id && (
              <button
                className={`${styles.backButton} ${styles.mobileButton} ${styles.mobileBackButton}`}
                onClick={() => navigate(`/projects/${module.project._id}`)}
                title="Quay lại dự án"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M12.5 15l-5-5 5-5" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )}
            {canEditModule && (
              <button
                className={`${styles.editButton} ${styles.mobileButton} ${styles.mobileEditButton}`}
                onClick={handleOpenEdit}
                title="Chỉnh sửa"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M16.474 5.474a2.121 2.121 0 1 1 3 3L8.5 19.448l-4 1 1-4 11.974-11.974z" stroke="#FA2B4D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </button>
            )}
          </>
        )}
        {/* Module Title & Meta */}
        <div className={styles.moduleTitleWrapper}>
          <h1 className={`${styles.moduleName} ${styles.moduleNameCentered}`}>{module.name}</h1>
          {!isMobile ? (
            <div className={`${styles.moduleMeta} ${styles.moduleMetaCentered}`}>
              <span className={styles.moduleId}>#{module.moduleId}</span>
              <span className={styles.moduleVersion}>v{module.version || '-'}</span>
            </div>
          ) : (
            <div className={styles.headerContentRow}>
              <div className={styles.moduleMeta}>
                <span className={styles.moduleId}>#{module.moduleId}</span>
                <span className={styles.moduleVersion}>v{module.version || '-'}</span>
              </div>
              <div className={styles.statusContainer}>
                <div
                  className={styles.statusBadge}
                  style={{backgroundColor: statusColors[module.status]?.background, color: statusColors[module.status]?.color}}
                >{module.status}</div>
              </div>
            </div>
          )}
        </div>
        {/* Status */}
        {!isMobile && (
          <div className={styles.statusContainer}>
            <span className={styles.statusLabel}>Trạng thái</span>
            <div
              className={styles.statusBadge}
              style={{backgroundColor: statusColors[module.status]?.background, color: statusColors[module.status]?.color}}
            >{module.status}</div>
          </div>
        )}
      </div>
      {/* Info Section */}
      <div className={styles.infoSection}>
        <div className={styles.infoGrid2Col}>
          {/* Cột trái */}
          <div className={styles.infoColLeft}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Thuộc dự án:</span>
              <span className={styles.infoValue}>{module.project?.name || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Người phụ trách:</span>
              <span className={styles.infoValue}>{module.owner?.name || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Thời gian dự kiến:</span>
              <span className={styles.infoValue}>
                {module.startDate ? new Date(module.startDate).toLocaleDateString('vi-VN') : '-'}
                {' - '}
                {module.endDate ? new Date(module.endDate).toLocaleDateString('vi-VN') : '-'}
              </span>
            </div>
          </div>
          {/* Cột phải */}
          <div className={styles.infoColRight}>
            <div className={styles.infoLabel}>Mô tả:</div>
            <div className={styles.descriptionBox}>
              {module.description ? (
                <span className={styles.descriptionText}>{module.description}</span>
              ) : (
                <span className={styles.noDescription}>Chưa có mô tả</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Documents Section */}
      <div className={styles.documentsSection}>
        <div className={styles.documentsHeader}>
          <h3 className={styles.documentsTitle}>Tài liệu nghiệp vụ</h3>
        </div>
        {module.docs && module.docs.length > 0 ? (
          <div className={styles.documentsGrid}>
            {module.docs.map((doc, idx) => {
              const name = doc.fileName || '';
              const dotIdx = name.lastIndexOf('.');
              const base = dotIdx !== -1 ? name.slice(0, dotIdx).replace(/\s+$/, '') : name.replace(/\s+$/, '');
              const ext = dotIdx !== -1 ? name.slice(dotIdx) : '';
              const isImage = isImageFile(name);
              return (
                <div key={idx} className={styles.documentCard}>
                  <div className={styles.documentIcon}>{getFileIcon(name)}</div>
                  <div className={styles.documentInfo}>
                    <span className={styles.documentName} title={doc.fileName}>
                      <span className={styles.fileBase}>{base}</span>
                      <span className={styles.fileExt}>{ext}</span>
                    </span>
                    <div className={styles.documentMeta}>
                      <span className={styles.documentSize}>{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : ''}</span>
                      <span className={styles.documentUploadTime}>{doc.uploadedAt ? `, ${new Date(doc.uploadedAt).toLocaleDateString('vi-VN')}` : ''}</span>
                    </div>
                  </div>
                  <div className={styles.documentActions}>
                    {isImage && (
                      <button
                        className={styles.viewButton}
                        onClick={() => handleViewImage(doc)}
                        title="Xem hình ảnh"
                      >
                        <ViewIcon sx={{ fontSize: 18 }} />
                      </button>
                    )}
                    <button
                      className={styles.downloadButton}
                      onClick={() => handleDownloadFile(doc)}
                      title="Tải xuống"
                    >
                      <img src="https://cdn-icons-png.flaticon.com/512/0/532.png" alt="download" className={styles.downloadIcon} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyDocuments}>
            <span className={styles.emptyIcon}>📄</span>
            <p className={styles.emptyText}>Chưa có tài liệu nghiệp vụ nào</p>
          </div>
        )}
      </div>
      {/* Tabs */}
      <div className={styles.tabsHeader}>
        <button
          className={`${styles.tabButton} ${tab === TABS.SPRINTS ? styles.tabButtonActive : ''}`}
          onClick={() => setTab(TABS.SPRINTS)}
        >
          {TABS.SPRINTS}
        </button>
        <button
          className={`${styles.tabButton} ${tab === TABS.HISTORY ? styles.tabButtonActive : ''}`}
          onClick={() => setTab(TABS.HISTORY)}
        >
          {TABS.HISTORY}
        </button>
      </div>
      <div className={styles.tabContent}>
        {tab === TABS.SPRINTS && (
          <div>
            {canCreateSprint && (
              <div className={styles.createReleaseWrapper}>
                <button
                  className={styles.createReleaseBtn}
                  onClick={() => setSprintOpen(true)}
                >
                  + Tạo sprint
                </button>
              </div>
            )}
            {sprints.length > 0 ? (
              <div className={styles.sprintsGrid}>
                {sprints.map(s => (
                  <div 
                    key={s._id} 
                    className={styles.sprintCard}
                    onClick={() => navigate(`/sprints/${s._id}`)}
                    style={sprintCardStyles.card}
                    onMouseEnter={(e) => {
                      Object.assign(e.target.style, sprintCardStyles.cardHover);
                    }}
                    onMouseLeave={(e) => {
                      Object.assign(e.target.style, sprintCardStyles.card);
                    }}
                  >
                    <div style={sprintCardStyles.header}>
                      <div>
                        <h3 style={sprintCardStyles.title}>{s.name}</h3>
                        <p style={sprintCardStyles.goal}>{s.goal || 'Chưa có mục tiêu'}</p>
                      </div>
                      <div style={sprintCardStyles.badges}>
                        <span
                          style={{
                            ...sprintCardStyles.badge,
                            ...sprintStatusColors[s.status]
                          }}
                        >
                          {s.status}
                        </span>
                      </div>
                    </div>
                    
                    <div style={sprintCardStyles.details}>
                      <div style={sprintCardStyles.detailRow}>
                        <span style={sprintCardStyles.label}>Thời gian:</span>
                        <span style={sprintCardStyles.value}>
                          {s.startDate ? new Date(s.startDate).toLocaleDateString('vi-VN') : '-'} - {s.endDate ? new Date(s.endDate).toLocaleDateString('vi-VN') : '-'}
                        </span>
                      </div>
                      <div style={sprintCardStyles.detailRow}>
                        <span style={sprintCardStyles.label}>Thành viên:</span>
                        <span style={sprintCardStyles.value}>{s.members?.length || 0} người</span>
                      </div>
                      <div style={sprintCardStyles.detailRow}>
                        <span style={sprintCardStyles.label}>Tasks:</span>
                        <span style={sprintCardStyles.value}>{s.tasks?.length || 0} task</span>
                      </div>
                      <div style={sprintCardStyles.detailRow}>
                        <span style={sprintCardStyles.label}>Velocity:</span>
                        <span style={sprintCardStyles.value}>{s.velocity || 0}</span>
                      </div>
                    </div>
                    
                    <div style={sprintCardStyles.footer}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {(isAdmin || isBA) && (
                          <button
                            style={{
                              ...sprintCardStyles.viewButton,
                              background: '#fff5f5',
                              borderColor: '#feb2b2',
                              color: '#c53030',
                            }}
                            onClick={(e) => handleDeleteSprint(s._id, e)}
                          >
                            Xóa
                          </button>
                        )}
                        <button
                          style={sprintCardStyles.viewButton}
                          onMouseEnter={(e) => {
                            Object.assign(e.target.style, sprintCardStyles.viewButtonHover);
                          }}
                          onMouseLeave={(e) => {
                            Object.assign(e.target.style, sprintCardStyles.viewButton);
                          }}
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyReleaseBox}>
                <div className={styles.emptyReleaseText}>Chưa có sprint nào cho module này</div>
              </div>
            )}
          </div>
        )}
        {tab === TABS.HISTORY && (
          <div>
            {module.history && module.history.length > 0 ? (
              <HistoryList history={module.history} />
            ) : <div className={styles.noHistory}>Chưa có lịch sử cập nhật</div>}
          </div>
        )}
      </div>
      <EditModulePopup 
        open={editOpen} 
        onClose={() => setEditOpen(false)} 
        module={module} 
        onSubmit={handleEditSubmit} 
        usersList={usersList}
        loading={editModuleLoading}
      />
      {/* Popup tạo sprint */}
      <NewSprintPopup
        isOpen={sprintOpen}
        onClose={() => setSprintOpen(false)}
        moduleId={module?._id}
        onSprintCreated={async () => {
          await refreshModuleData();
          toast.success('Tạo sprint thành công!');
        }}
      />
      {/* Image Preview Dialog */}
      <Dialog
        open={imagePreview.open}
        onClose={handleCloseImagePreview}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh',
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1
        }}>
          {imagePreview.name}
          <IconButton onClick={handleCloseImagePreview} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center' }}>
          <img
            src={imagePreview.src}
            alt={imagePreview.name}
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              borderRadius: '4px'
            }}
          />
        </DialogContent>
      </Dialog>
      {/* SuccessToast đã được thay thế bằng react-toastify */}
    </div>
  );
};

export default ModuleDetail;

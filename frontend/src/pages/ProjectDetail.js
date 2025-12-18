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
  const exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  return exts.some(ext => fileName.toLowerCase().endsWith(ext));
}

function getFileIcon(fileName) {
  if (isImageFile(fileName)) return '🖼️';
  if (fileName.toLowerCase().includes('.pdf')) return '📕';
  if (fileName.toLowerCase().includes('.doc')) return '📄';
  if (fileName.toLowerCase().includes('.xls')) return '📊';
  return '📄';
}

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return width;
}

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
      const token = localStorage.getItem('accessToken');
      if (!token) return navigate('/login');

      const projectRes = await axiosInstance.get(`/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProject(projectRes.data);

      const moduleRes = await ModuleService.getModulesByProject(id);
      setModules(moduleRes);

      setError(null);
    } catch (err) {
      setError('Có lỗi xảy ra khi tải thông tin dự án hoặc module');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchProjectData(); }, [fetchProjectData]);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  useEffect(() => {
    const socket = socketManager.socket;
    if (!socket) return;

    const handler = (data) => {
      if (data.project && data.project._id === id) {
        setProject((prev) => ({ ...prev, ...data.project }));
      }
    };

    socket.on('project_updated', handler);
    return () => socket.off('project_updated', handler);
  }, [id]);

  // Tải xuống
  const handleDownloadFile = (file) => {
    ProjectService.downloadFile(project._id, file);
  };

  // Xem ảnh
  const handleViewImage = async (file) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const res = await axiosInstance.get(
        `/projects/${project._id}/files/${encodeURIComponent(file.publicId)}/download`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          responseType: 'blob',
        }
      );

      const blob = new Blob([res.data], { type: res.data.type });
      const url = URL.createObjectURL(blob);

      setImagePreview({ open: true, src: url, name: file.fileName });
    } catch (err) {
      toast.error('Không thể tải hình ảnh.');
    }
  };

  const closeImage = () => {
    if (imagePreview.src) URL.revokeObjectURL(imagePreview.src);
    setImagePreview({ open: false, src: '', name: '' });
  };

  const canCreateModule = currentUser?.role === 'BA';
  const isMember =
    currentUser &&
    project?.members?.some((m) => m.user?._id === currentUser._id);

  if (loading) return <LoadingOverlay text="Đang tải thông tin dự án..." />;

  if (error) return <div className={styles.errorContainer}>{error}</div>;

  if (!project) return <div>Không tìm thấy dự án.</div>;

  if (!['PM', 'BA'].includes(currentUser?.role) && !isMember)
    return <div>Bạn không có quyền truy cập.</div>;

  return (
    <>
      <div className={styles.container}>
        <CopyToast
          show={copyFeedback.show}
          message={copyFeedback.message}
          onClose={() => setCopyFeedback({ show: false, message: '' })}
        />

        {/* HEADER */}
        {/* ... GIỮ NGUYÊN TOÀN BỘ HEADER ... */}

        {/* INFO SECTION */}
        {/* ... GIỮ NGUYÊN ... */}

        {/* PROJECT MEMBERS SECTION */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 600 }}>Nhân sự tham gia dự án</h3>
          {project.members && project.members.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {project.members.map((m) => (
                <span
                  key={m.user?._id || String(m.user)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    background: '#f1f3f5',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  {m.user?.name || m.user?.userID || m.user?.email || 'User'}
                  {m.user?.role && (
                    <span style={{ color: '#888', marginLeft: 6 }}>({m.user.role})</span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 14, color: '#888' }}>Chưa có nhân sự nào được thêm vào dự án.</div>
          )}
        </div>

        {/* DOCUMENT SECTION (CHỈ 1 LẦN – ĐÃ XOÁ BẢN LẶP) */}
        <div className={styles.documentsSection}>
          <div className={styles.documentsHeader}>
            <h3 className={styles.documentsTitle}>Tài liệu tổng quan</h3>
          </div>

          {project.overviewDocs?.length > 0 ? (
            <div className={styles.documentsGrid}>
              {project.overviewDocs.map((file, index) => {
                const name = file.fileName || '';
                const dot = name.lastIndexOf('.');
                const base = dot !== -1 ? name.slice(0, dot) : name;
                const ext = dot !== -1 ? name.slice(dot) : '';
                const isImage = isImageFile(name);

                return (
                  <div key={index} className={styles.documentCard}>
                    <div className={styles.documentIcon}>{getFileIcon(name)}</div>

                    <div className={styles.documentInfo}>
                      <span className={styles.documentName}>
                        {base}
                        <span className={styles.fileExt}>{ext}</span>
                      </span>
                      <span className={styles.documentSize}>{formatFileSize(file.fileSize)}</span>
                    </div>

                    <div className={styles.documentActions}>
                      {isImage && (
                        <button onClick={() => handleViewImage(file)} className={styles.viewButton}>
                          <ViewIcon sx={{ fontSize: 18 }} />
                        </button>
                      )}

                      <button
                        className={styles.downloadButton}
                        onClick={() => handleDownloadFile(file)}
                      >
                        <img
                          src="https://cdn-icons-png.flaticon.com/512/0/532.png"
                          alt="download"
                          className={styles.downloadIcon}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyDocuments}>
              <span className={styles.emptyIcon}>📄</span>
              <p className={styles.emptyText}>Chưa có tài liệu tổng quan nào</p>
            </div>
          )}
        </div>

        {/* TABS */}
        <div className={styles.tabsHeader}>
          {[0, 1].map((idx) => (
            <button
              key={idx}
              className={
                styles.tabButton +
                (tabActive === idx ? ' ' + styles.tabButtonActive : '') +
                (hoverTab[idx] ? ' ' + styles.tabButtonHover : '')
              }
              onClick={() => setTabActive(idx)}
              onMouseEnter={() =>
                setHoverTab((prev) => prev.map((v, i) => (i === idx ? true : v)))
              }
              onMouseLeave={() =>
                setHoverTab((prev) => prev.map((v, i) => (i === idx ? false : v)))
              }
            >
              {idx === 0 ? 'Danh sách Module' : 'Lịch sử cập nhật'}
            </button>
          ))}
        </div>

        <div className={styles.tabContent}>
          {/* TAB MODULES */}
          {tabActive === 0 && (
            <>
              <div className={isMobile ? styles.addModuleContainerMobile : styles.addModuleContainerDesktop}>
                {/* Nút thêm thành viên project cho PM/BA */}
                {['PM', 'BA'].includes(currentUser?.role) && (
                  <button
                    className={styles.addModuleButton}
                    style={{ marginRight: '8px' }}
                    onClick={() => setShowAddMember(true)}
                  >
                    <span className={styles.addModulePlus}>+</span>
                    Thêm thành viên
                  </button>
                )}

                {/* Nút tạo module (chỉ BA) */}
                {canCreateModule && (
                  <button
                    className={styles.addModuleButton}
                    onClick={() => setOpenModulePopup(true)}
                  >
                    <span className={styles.addModulePlus}>+</span>
                    Thêm module
                  </button>
                )}
              </div>

              {modules.length === 0 ? (
                <div className={styles.emptyModules}>
                  <span className={styles.emptyIcon}>📦</span>
                  <p className={styles.emptyText}>Chưa có module nào</p>
                </div>
              ) : (
                <div className={isMobile ? styles.moduleGridMobile : styles.moduleGridDesktop}>
                  {modules.map((module) => (
                    <div key={module._id} className={styles.moduleCard}>
                      <div className={styles.moduleCardHeader}>
                        <span className={styles.moduleId}>#{module.moduleId}</span>
                        <span
                          className={styles.statusBadge}
                          style={{
                            backgroundColor: moduleStatusColors[module.status]?.background,
                            color: moduleStatusColors[module.status]?.color,
                          }}
                        >
                          {module.status}
                        </span>
                      </div>

                      <div className={styles.moduleName}>{module.name}</div>

                      <div className={styles.moduleMeta}>
                        <div className={styles.moduleOwner}>👤 {module.owner?.name}</div>
                        <div className={styles.moduleTime}>
                          📅 {formatDate(module.startDate)} - {formatDate(module.endDate)}
                        </div>
                      </div>

                      <div className={styles.moduleProgress}>
                        <div className={styles.moduleProgressBar}>
                          <div
                            className={styles.moduleProgressFill}
                            style={{
                              width:
                                module.status === 'Hoàn thành'
                                  ? '100%'
                                  : module.status === 'Đang phát triển'
                                  ? '65%'
                                  : '15%',
                            }}
                          ></div>
                        </div>
                      </div>

                      <button
                        className={styles.moduleDetailButton}
                        onClick={() => navigate(`/modules/${module._id}`)}
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* TAB HISTORY */}
          {tabActive === 1 && (
            project.history?.length > 0 ? (
              <HistoryList history={project.history} />
            ) : (
              <div className={styles.noHistory}>Chưa có lịch sử cập nhật.</div>
            )
          )}
        </div>
      </div>

      {/* POPUPS */}
      <NewModulePopup
        open={openModulePopup}
        onClose={() => setOpenModulePopup(false)}
        members={project.members?.map((m) => m.user) || []}
        currentUser={currentUser}
        modules={modules}
        onSubmit={async (formData) => {
          try {
            formData.append('projectId', id);
            formData.append('status', 'Chưa phát triển');

            const newModule = await ModuleService.createModule(formData);
            setModules((prev) => [...prev, newModule]);
            await fetchProjectData();

            setOpenModulePopup(false);
            toast.success('Tạo module thành công!');
          } catch (err) {
            toast.error('Lỗi khi tạo module.');
          }
        }}
      />

      <AddMemToProjectPopup
        open={showAddMember}
        onClose={() => setShowAddMember(false)}
        loading={addingMember}
        existingUserIds={project.members?.map((m) => m.user?._id) || []}
        onAdd={async (userIds) => {
          setAddingMember(true);
          try {
            const token = localStorage.getItem('accessToken');
            await axiosInstance.put(
              `/projects/${id}`,
              {
                members: [
                  ...project.members.map((m) => ({ user: m.user._id })),
                  ...userIds.map((uid) => ({ user: uid })),
                ],
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            setShowAddMember(false);
            await fetchProjectData();
            toast.success('Thêm nhân sự vào dự án thành công!');
          } catch {
            toast.error('Lỗi khi thêm nhân sự');
          } finally {
            setAddingMember(false);
          }
        }}
      />

      <EditProjectPopup
        open={showEditPopup}
        onClose={() => setShowEditPopup(false)}
        project={project}
        membersList={project.members?.map((m) => m.user) || []}
        loading={editProjectLoading}
        onSubmit={async (formData) => {
          setEditProjectLoading(true);
          try {
            const token = localStorage.getItem('accessToken');
            await axiosInstance.put(`/projects/${id}`, formData, {
              headers: { Authorization: `Bearer ${token}` },
            });
            await fetchProjectData();

            setShowEditPopup(false);
            toast.success('Cập nhật dự án thành công!');
          } catch {
            toast.error('Lỗi khi cập nhật dự án!');
          } finally {
            setEditProjectLoading(false);
          }
        }}
      />

      {/* IMAGE PREVIEW */}
      <Dialog open={imagePreview.open} onClose={closeImage} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {imagePreview.name}
          <IconButton onClick={closeImage}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', justifyContent: 'center' }}>
          <img
            src={imagePreview.src}
            alt={imagePreview.name}
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProjectDetail;

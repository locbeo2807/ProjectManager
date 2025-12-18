import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatePicker from '../components/common/DatePicker';
import styles from './NewProject.module.css';

function generateProjectId() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const NewProject = () => {
  // Tất cả hooks phải được gọi trước khi có bất kỳ return nào
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    version: '',
    projectId: generateProjectId(),
    projectManager: ''
  });
  const [files, setFiles] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();
  const [dragActive, setDragActive] = useState(false);
  const dropdownRef = useRef();
  
  // Kiểm tra quyền user sau khi đã gọi tất cả hooks
  const userStr = localStorage.getItem('user');
  let role = '';
  if (userStr) {
    try {
      role = JSON.parse(userStr).role;
    } catch {}
  }

  // Debounced server-side tìm kiếm user theo tên hoặc email
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setFilteredUsers([]);
      return;
    }

    let cancelled = false;
    const delay = 300; // ms
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await axiosInstance.get('/users/search', { params: { q: searchTerm } });
        if (cancelled) return;
        // Chỉ giữ lại các vai trò phù hợp
        const eligible = (res.data || []).filter(user => ['PM', 'BA', 'Scrum Master', 'Product Owner', 'TestPM'].includes(user.role));
        setFilteredUsers(eligible);
      } catch (err) {
        console.error('Search users error:', err);
        if (!cancelled) setFilteredUsers([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setSearchLoading(false);
    };
  }, [searchTerm]);

  // Click outside để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Nếu không có quyền, hiển thị thông báo
  if (role !== 'admin' && role !== 'PM' && role !== 'TestPM') {
    return (
      <div className={styles.permissionDenied}>
        <div className={styles.permissionIcon}>⛔</div>
        <div className={styles.permissionMessage}>Bạn không có quyền tạo dự án mới.</div>
        <button onClick={() => navigate('/dashboard')} className={styles.backButton}>
          Quay lại Dashboard
        </button>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowDropdown(true);
    
    // Nếu đang không tìm kiếm, cập nhật formData.projectManager = ''
    if (!value) {
      setFormData(prev => ({ ...prev, projectManager: '' }));
    }
  };

  const handleUserSelect = (user) => {
    console.log('User selected:', user);
    console.log('Setting projectManager to:', user._id);
    setFormData(prev => ({ ...prev, projectManager: user._id }));
    setSearchTerm(`${user.name} - ${user.email}`);
    setShowDropdown(false);
  };

  const handleSearchFocus = () => {
    setShowDropdown(true);
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles(prevFiles => {
      const existingNames = new Set(prevFiles.map(f => f.name));
      const uniqueNewFiles = newFiles.filter(f => !existingNames.has(f.name));
      return [...prevFiles, ...uniqueNewFiles];
    });
  };

  const handleRemoveFile = (fileToRemove) => {
    setFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    console.log('Form data khi submit:', formData);
    console.log('ProjectManager value:', formData.projectManager);
    console.log('SearchTerm:', searchTerm);
    if (!formData.name || !formData.startDate || !formData.version || !formData.projectManager) {
      alert('Vui lòng nhập đầy đủ các trường bắt buộc: Tên dự án, Ngày bắt đầu, Version, và Người phụ trách!');
      return;
    }
    setLoading(true);
    try {
      const data = new FormData();
      data.append('projectId', formData.projectId);
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('startDate', formData.startDate);
      if (formData.endDate) data.append('endDate', formData.endDate);
      data.append('version', formData.version);
      data.append('projectManager', formData.projectManager);
      // Lấy userId từ localStorage (object user)
      const userStr = localStorage.getItem('user');
      let userId = '';
      if (userStr) {
        try {
          userId = JSON.parse(userStr)._id;
        } catch {}
      }
      if (userId) {
        const membersJson = JSON.stringify([{ user: userId }]);
        data.append('members', membersJson);
      }
      files.forEach(file => {
        data.append('overviewDocs', file);
      });
      await axiosInstance.post('/projects', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Tạo dự án thành công!');
      setTimeout(() => {
        navigate('/projects');
      }, 1500);
    } catch (error) {
      console.error('Lỗi khi tạo dự án:', error);
      alert('Có lỗi xảy ra khi tạo dự án. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Bạn có chắc chắn muốn hủy? Dữ liệu đã nhập sẽ bị mất.')) {
      navigate('/projects');
    }
  };

  const formatFileSize = (size) => {
    if (!size) return '0 B';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  };



  return (
    <div className={styles.pageWrapper}>
      {/* SuccessToast đã được thay thế bằng react-toastify */}
      <form onSubmit={handleSubmit} encType="multipart/form-data" className={styles.formCard}>        
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Thông tin dự án</h3>
          <div className={styles.contentGrid}>
            <div className={styles.leftColumn}>
              <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.label}>Tên dự án <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                  placeholder="Nhập tên dự án"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="description" className={styles.label}>Mô tả</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  placeholder="Mô tả dự án..."
                />
              </div>
            </div>
            
            <div className={styles.rightColumn}>
              <div className={styles.formGroup}>
                <label htmlFor="version" className={styles.label}>Version <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  id="version"
                  value={formData.version}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                  placeholder="VD: 1.0.0"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="projectManager" className={styles.label}>Người phụ trách <span className={styles.required}>*</span></label>
                <div className={styles.searchContainer} ref={dropdownRef}>
                  <input
                    type="text"
                    id="projectManagerSearch"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={handleSearchFocus}
                    required
                    className={styles.input}
                    placeholder="Nhập tên hoặc email người phụ trách..."
                  />
                  <input
                    type="hidden"
                    id="projectManager"
                    value={formData.projectManager}
                  />
                  {showDropdown && filteredUsers.length > 0 && (
                    <div className={styles.dropdown}>
                      {searchLoading ? (
                        <div className={styles.dropdownLoading}>Đang tìm kiếm...</div>
                      ) : (
                        filteredUsers.map(user => (
                          <div
                            key={user._id}
                            className={styles.dropdownItem}
                            onClick={() => handleUserSelect(user)}
                          >
                            <div className={styles.userInfo}>
                              <div className={styles.userName}>{user.name}</div>
                              <div className={styles.userEmail}>{user.email}</div>
                              <div className={styles.userRole}>{user.role}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {showDropdown && searchTerm && filteredUsers.length === 0 && (
                    <div className={styles.dropdown}>
                      <div className={styles.noResults}>Không tìm thấy người dùng nào</div>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="startDate" className={styles.label}>Ngày bắt đầu <span className={styles.required}>*</span></label>
                <DatePicker
                  value={formData.startDate}
                  onChange={(value) => setFormData(prev => ({ ...prev, startDate: value }))}
                  placeholder="Chọn ngày bắt đầu"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="endDate" className={styles.label}>Ngày kết thúc</label>
                <DatePicker
                  value={formData.endDate}
                  onChange={(value) => setFormData(prev => ({ ...prev, endDate: value }))}
                  placeholder="Chọn ngày kết thúc"
                />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Tài liệu tổng quan</h3>
          <div className={styles.documentGrid}>

            <div className={styles.dropZoneColumn}>
              <div
                className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
              >
                <div className={styles.dropZoneText}>
                  <div className={styles.dropZoneIcon}>☁️</div>
                  <div>Kéo và thả file vào đây<br />hoặc <span className={styles.dropZoneLink}>chọn file</span></div>
                </div>
                <input
                  type="file"
                  id="overviewDocs"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className={styles.hiddenInput}
                />
              </div>
            </div>
            
            <div className={styles.fileListColumn}>
              <div className={styles.fileListBox}>
                {files.length > 0 && (
                  <div className={styles.fileCount}>Đã chọn {files.length} file</div>
                )}
                {files.length > 0 ? (
                  <div className={styles.fileListScroll}>
                    {files.map((file, idx) => (
                      <div key={idx} className={styles.fileItem}>
                        <span className={styles.fileIcon}>📄</span>
                        <span className={styles.fileName} title={file.name}>
                          <span className={styles.fileBase}>{(() => {
                            const name = file.name || '';
                            const dotIdx = name.lastIndexOf('.');
                            return dotIdx !== -1 ? name.slice(0, dotIdx).replace(/\s+$/, '') : name.replace(/\s+$/, '');
                          })()}</span>
                          <span className={styles.fileExt}>{(() => {
                            const name = file.name || '';
                            const dotIdx = name.lastIndexOf('.');
                            return dotIdx !== -1 ? name.slice(dotIdx) : '';
                          })()}</span>
                        </span>
                        <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                        <button type="button" className={styles.fileRemoveBtn} onClick={() => handleRemoveFile(file)} title="Xóa file">×</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.noFileMessage}>
                    <div className={styles.noFileIcon}>📁</div>
                    <div>Chưa có file nào được chọn</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.buttonSection}>
          <div className={styles.buttonRow}>
            <button type="button" onClick={() => console.log('Current formData:', formData)} className={styles.cancelButton}>
              Test Debug
            </button>
            <button type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Đang tạo...' : '+ Tạo dự án'}
            </button>
            <button type="button" className={styles.cancelButton} onClick={handleCancel}>Hủy</button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewProject;

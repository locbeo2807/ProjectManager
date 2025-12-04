import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../../api/axios';
import styles from './AddMemberToModulePopup.module.css';

const AddMemberToModulePopup = ({ isOpen, onClose, moduleId, onMemberAdded }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchInputRef = useRef();

  useEffect(() => {
    if (isOpen && moduleId) {
      fetchAvailableUsers();
    }
  }, [isOpen, moduleId]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = availableUsers.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userID?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(availableUsers);
    }
  }, [searchTerm, availableUsers]);

  const fetchAvailableUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await axiosInstance.get('/users', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setAvailableUsers(response.data);
      setFilteredUsers(response.data);
    } catch (err) {
      setError('Không thể tải danh sách người dùng');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    if (!selectedUsers.find(u => u._id === user._id)) {
      setSelectedUsers([...selectedUsers, user]);
      setSearchTerm('');
      searchInputRef.current?.focus();
    }
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u._id !== userId));
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) {
      setError('Vui lòng chọn ít nhất một người dùng');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const accessToken = localStorage.getItem('accessToken');
      await axiosInstance.post(`/modules/${moduleId}/add-members`, {
        members: selectedUsers.map(user => ({ user: user._id, role: 'member' }))
      }, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      setSelectedUsers([]);
      setSearchTerm('');
      onMemberAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể thêm thành viên vào module');
      console.error('Error adding members:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setSearchTerm('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>Thêm thành viên vào Module</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          {/* Search */}
          <div className={styles.searchSection}>
            <div className={styles.searchContainer}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm theo tên, email hoặc ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
                autoFocus
              />
            </div>

            {/* Search Results */}
            {searchTerm && (
              <div className={styles.searchResults}>
                {loading ? (
                  <div className={styles.loadingText}>Đang tìm kiếm...</div>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <div
                      key={user._id}
                      className={styles.userItem}
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className={styles.userInfo}>
                        <div className={styles.userName}>{user.name}</div>
                        <div className={styles.userEmail}>{user.email}</div>
                        <div className={styles.userId}>ID: {user.userID}</div>
                      </div>
                      <div className={styles.userRole}>{user.role}</div>
                    </div>
                  ))
                ) : (
                  <div className={styles.noResults}>Không tìm thấy người dùng nào</div>
                )}
              </div>
            )}
          </div>

          {/* Selected Users */}
          <div className={styles.selectedSection}>
            <h3>Thành viên đã chọn ({selectedUsers.length})</h3>
            {selectedUsers.length === 0 ? (
              <div className={styles.noSelected}>Chưa chọn thành viên nào</div>
            ) : (
              <div className={styles.selectedList}>
                {selectedUsers.map(user => (
                  <div key={user._id} className={styles.selectedUser}>
                    <div className={styles.userInfo}>
                      <div className={styles.userName}>{user.name}</div>
                      <div className={styles.userEmail}>{user.email}</div>
                    </div>
                    <button
                      className={styles.removeButton}
                      onClick={() => handleRemoveUser(user._id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && <div className={styles.error}>{error}</div>}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={isSubmitting || selectedUsers.length === 0}
          >
            {isSubmitting ? 'Đang thêm...' : `Thêm ${selectedUsers.length} thành viên`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberToModulePopup;

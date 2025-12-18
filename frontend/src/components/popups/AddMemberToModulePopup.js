import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../../api/axios';
import styles from './AddMemberToModulePopup.module.css';
import { toast } from 'react-toastify';

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
      // Lấy user hiện tại để kiểm tra role
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      
      console.log('Current user:', currentUser);
      console.log('Fetching available users...');
      
      let response;
      if (currentUser?.role === 'PM') {
        // PM có thể lấy tất cả users
        response = await axiosInstance.get('/users');
      } else {
        // Users khác dùng search API với query rỗng để lấy danh sách
        response = await axiosInstance.get('/users/search?q=');
      }
      
      console.log('Users fetched:', response.data);
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
    console.log('Selected user:', user);
    console.log('User ID:', user._id);
    console.log('Current selected users:', selectedUsers);
    
    // Sử dụng functional update để đảm bảo state được cập nhật đúng
    setSelectedUsers(prevSelected => {
      const previous = prevSelected || [];
      console.log('Previous selected users:', previous);
      const alreadySelected = previous.find(u => u._id === user._id);
      console.log('Already selected?', alreadySelected);
      
      if (!alreadySelected) {
        console.log('Adding user to selection');
        const newSelected = [...previous, user];
        console.log('New selected users:', newSelected);
        return newSelected;
      } else {
        console.log('User already selected');
        return previous;
      }
    });
    
    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Real-time search khi gõ
    if (value.length >= 2) {
      try {
        console.log('Searching for:', value);
        const response = await axiosInstance.get(`/users/search?q=${encodeURIComponent(value)}`);
        console.log('Search results:', response.data);
        setFilteredUsers(response.data);
      } catch (err) {
        console.error('Error searching users:', err);
        setFilteredUsers([]);
      }
    } else if (value.length === 0) {
      setFilteredUsers(availableUsers);
    }
  };

  
  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u._id !== userId));
  };

  const handleSubmit = async () => {
    console.log('Submit clicked - selected users:', selectedUsers);
    
    if (selectedUsers.length === 0) {
      setError('Vui lòng chọn ít nhất một người dùng');
      return;
    }

    if (!moduleId) {
      setError('Không tìm thấy ID module. Vui lòng thử lại.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const accessToken = localStorage.getItem('accessToken');
      console.log('Sending API request to add members...');
      
      const response = await axiosInstance.post(`/modules/${moduleId}/add-members`, {
        members: selectedUsers.map(user => ({ user: user._id, role: 'member' }))
      }, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      console.log('Members added successfully!', response.data);
      toast.success(`Đã thêm ${selectedUsers.length} thành viên vào module thành công!`);
      setSelectedUsers([]);
      setSearchTerm('');
      onMemberAdded(response.data.module); // Truyền module data đã cập nhật
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

  if (!isOpen || !moduleId) return null;

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
                onChange={handleInputChange}
                className={styles.searchInput}
                autoFocus
              />
            </div>

            {/* Search Results Dropdown */}
            {searchTerm && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '6px',
                marginTop: '4px',
                zIndex: 9999,
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {loading ? (
                  <div style={{padding: '12px', textAlign: 'center', color: '#666'}}>
                    Đang tìm kiếm...
                  </div>
                ) : (
                  <>
                    {filteredUsers.length > 0 && filteredUsers.slice(0, 10).map(user => (
                      <div
                        key={user._id}
                        style={{
                          padding: '12px',
                          borderBottom: '1px solid #f0f0f0',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onClick={() => handleUserSelect(user)}
                      >
                        <div>
                          <div style={{fontWeight: '500'}}>{user.name}</div>
                          <div style={{fontSize: '12px', color: '#666'}}>{user.email}</div>
                        </div>
                        <div style={{
                          background: '#007bff',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>{user.role}</div>
                      </div>
                    ))}
                    {filteredUsers.length === 0 && searchTerm.length >= 2 && (
                      <div style={{padding: '12px', textAlign: 'center', color: '#666'}}>
                        Không tìm thấy người dùng nào
                      </div>
                    )}
                  </>
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

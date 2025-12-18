import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import axiosInstance from '../../api/axios';
import DatePicker from '../common/DatePicker';

const NewTaskPopup = ({ isOpen, onClose, sprintId, onTaskAdded, members = [] }) => {
  const generateTaskId = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  };

  const generateUniqueTaskId = (currentTasks) => {
    const existingTaskIds = new Set(currentTasks.map(t => t.taskId));
    let newId;
    do {
      newId = generateTaskId();
    } while (existingTaskIds.has(newId));
    return newId;
  };

  const [tasks, setTasks] = useState([{
    name: '',
    request: '',
    assignees: [],
    reviewers: [],
    assigneeSearch: '',
    reviewerSearch: '',
    assigneeError: '',
    reviewerError: '',
    taskId: generateTaskId()
  }]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  // Cờ để ngăn xóa lựa chọn khi dropdown đang đặt giá trị
  const [dropdownSetting, setDropdownSetting] = useState({});

  // Dropdown state cho từng task
  const [assigneeDropdown, setAssigneeDropdown] = useState({});
  const [reviewerDropdown, setReviewerDropdown] = useState({});
  // Ref cho input để lấy vị trí
  const assigneeInputRefs = useRef({});
  const reviewerInputRefs = useRef({});
  const [assigneeDropdownPos, setAssigneeDropdownPos] = useState({});
  const [reviewerDropdownPos, setReviewerDropdownPos] = useState({});
  const [showUserSelector, setShowUserSelector] = useState({ show: false, field: '', index: -1, selectedUsers: [] });

  // Hàm trợ giúp để định dạng kích thước file
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Xử lý chọn file
  const handleFileChange = (index, files) => {
    const newTasks = [...tasks];
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/zip',
      'application/x-rar-compressed'
    ];

    const validFiles = [];
    const invalidFiles = [];

    Array.from(files).forEach(file => {
      if (file.size > maxFileSize) {
        invalidFiles.push(`${file.name} (quá lớn, tối đa 10MB)`);
      } else if (!allowedTypes.includes(file.type)) {
        invalidFiles.push(`${file.name} (định dạng không hỗ trợ)`);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      alert(`Các file sau không hợp lệ:\n${invalidFiles.join('\n')}`);
    }

    if (validFiles.length > 0) {
      newTasks[index].selectedFiles = validFiles;
      setTasks(newTasks);
    }
  };

  // Xử lý xóa file
  const handleRemoveFile = (index, fileIndex) => {
    const newTasks = [...tasks];
    const updatedFiles = Array.from(newTasks[index].selectedFiles || []);
    updatedFiles.splice(fileIndex, 1);
    newTasks[index].selectedFiles = updatedFiles.length > 0 ? updatedFiles : null;
    setTasks(newTasks);
  };

  const resetForm = useCallback(() => {
    setTasks([{
      name: '',
      request: '',
      taskType: 'Feature',
      priority: 'Trung bình',
      assignees: [],
      reviewers: [],
      assigneeSearch: '',
      reviewerSearch: '',
      assigneeError: '',
      reviewerError: '',
      storyPoints: '',
      estimatedHours: '',
      startDate: '',
      endDate: '',
      deadline: '',
      description: '',
      acceptanceCriteria: [],
      newCriterion: '',
      selectedFiles: null,
      taskId: generateTaskId()
    }]);
    setAssigneeDropdown({});
    setReviewerDropdown({});
  }, []);

  // Khi mở popup reset dropdown
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      setAssigneeDropdown({});
      setReviewerDropdown({});
    }
  }, [isOpen, resetForm]);

  // Tìm kiếm user
  const filterMembers = (search) => {
    if (!search || search.trim().length === 0) return [];
    const s = search.toLowerCase().trim();
    return members.filter(m =>
      m.name?.toLowerCase().includes(s) ||
      m.email?.toLowerCase().includes(s) ||
      (m.userID && m.userID.toLowerCase().includes(s))
    );
  };

  // Xử lý blur input để validate và tìm kiếm user
  const handleInputBlur = (index, field) => {
    const newTasks = [...tasks];
    const searchField = `${field}Search`;
    const searchValue = newTasks[index][searchField] || '';
    const currentSelection = newTasks[index][field] || [];

    console.log('Blur handler called:', {
      index,
      field,
      searchValue,
      currentSelection: currentSelection.length,
      members: members.length,
      dropdownSetting: dropdownSetting[`${index}-${field}`]
    });

    // Không xử lý nếu dropdown đang đặt giá trị
    if (dropdownSetting[`${index}-${field}`]) {
      console.log('Dropdown is setting value, skipping blur handler');
      return;
    }

    // Nếu có giá trị tìm kiếm nhưng không có lựa chọn hiện tại, thử tìm kết quả khớp chính xác
    if (searchValue.trim() && currentSelection.length === 0) {
      const typedNames = searchValue.split(',').map(name => name.trim()).filter(name => name);
      const matchedUsers = [];

      console.log('Looking for exact matches:', typedNames);
      console.log('Available members:', members.map(m => m.name));

      typedNames.forEach(typedName => {
        const matchedUser = members.find(m =>
          m.name === typedName ||
          m.email === typedName ||
          m.userID === typedName
        );
        console.log('Searching for:', typedName, 'Found:', matchedUser ? matchedUser.name : 'Not found');
        if (matchedUser) {
          matchedUsers.push(matchedUser);
        }
      });

      if (matchedUsers.length > 0) {
        console.log('Setting matched users:', matchedUsers);
        newTasks[index][field] = matchedUsers;
        newTasks[index][searchField] = matchedUsers.map(u => {
          const parts = [u.name];
          if (u.userID) parts.push(`(${u.userID})`);
          if (u.email) parts.push(`(${u.email})`);
          return parts.join(' ');
        }).join(', ');
        newTasks[index][`${field.replace(/s$/, '')}Error`] = '';
        setTasks(newTasks);
        console.log('Successfully set users after blur');
      } else {
        console.log('No matched users found');
        // Xóa lỗi nếu không tìm thấy kết quả
        newTasks[index][`${field.replace(/s$/, '')}Error`] = 'Không tìm thấy người dùng';
        setTasks(newTasks);
      }
    }
  };

  // Xử lý thay đổi input
  const handleTaskChange = (index, field, value) => {
    const newTasks = [...tasks];
    if (field === 'assigneeSearch' || field === 'reviewerSearch') {
      const selectionField = field.replace('Search', 's');
      const currentSelection = newTasks[index][selectionField] || [];

      // Không xóa lựa chọn nếu dropdown đang đặt giá trị
      const isDropdownSettingValue = dropdownSetting[`${index}-${selectionField}`];

      if (!isDropdownSettingValue) {
        // Chỉ xóa lựa chọn nếu người dùng đang thực sự gõ (không phải khi dropdown đang đặt giá trị)
        const selectionText = currentSelection.length > 0 ? currentSelection.map(u => u.name).join(', ') : '';

        // Không xóa lựa chọn nếu giá trị khớp với văn bản lựa chọn hiện tại
        if (value !== selectionText && !currentSelection.some(user => user.name === value.trim())) {
          newTasks[index][selectionField] = [];
        }
      }

      newTasks[index][field] = value;
    } else if (field === 'assignees' || field === 'reviewers') {
      newTasks[index][field] = value;
      newTasks[index][`${field.replace(/s$/, '')}Error`] = '';
    } else {
      newTasks[index][field] = value;
    }
    setTasks(newTasks);
  };

  // Thêm tiêu chí chấp nhận
  const handleAddCriterion = (index) => {
    const newTasks = [...tasks];
    const task = newTasks[index];
    if (task.newCriterion && task.newCriterion.trim()) {
      task.acceptanceCriteria = [...(task.acceptanceCriteria || []), task.newCriterion.trim()];
      task.newCriterion = '';
      setTasks(newTasks);
    }
  };

  // Xóa tiêu chí chấp nhận
  const handleRemoveCriterion = (index, criterionIndex) => {
    const newTasks = [...tasks];
    newTasks[index].acceptanceCriteria = newTasks[index].acceptanceCriteria.filter((_, i) => i !== criterionIndex);
    setTasks(newTasks);
  };

  // Chọn user từ dropdown
  const handleSelectUser = (index, field, user) => {
    console.log('handleSelectUser called:', { index, field, user: user.name });

    // Đặt cờ để ngăn xóa lựa chọn trong quá trình chọn từ dropdown
    setDropdownSetting(prev => ({ ...prev, [`${index}-${field}`]: true }));

    const newTasks = [...tasks];
    const currentSelection = newTasks[index][field] || [];

    console.log('Current selection before update:', currentSelection.length, currentSelection.map(u => u.name));
    console.log('Task object before update:', {
      assignees: newTasks[index].assignees,
      assigneesLength: newTasks[index].assignees ? newTasks[index].assignees.length : 0,
      reviewers: newTasks[index].reviewers,
      reviewersLength: newTasks[index].reviewers ? newTasks[index].reviewers.length : 0
    });

    // Đối với lựa chọn từ dropdown, luôn thêm user (không toggle)
    // Điều này đảm bảo clicking dropdown luôn thêm user
    if (!currentSelection.some(selected => selected._id === user._id)) {
      newTasks[index][field] = [...currentSelection, user];
      console.log('User added to selection:', user.name);
    } else {
      console.log('User already selected, keeping current selection');
    }

    // Cập nhật trường tìm kiếm để hiển thị văn bản user đã chọn với đầy đủ thông tin
    const searchField = `${field}Search`;
    const selectedUsers = newTasks[index][field] || [];
    const searchText = selectedUsers.length > 0
      ? selectedUsers.map(u => {
          const parts = [u.name];
          if (u.userID) parts.push(`(${u.userID})`);
          if (u.email) parts.push(`(${u.email})`);
          return parts.join(' ');
        }).join(', ')
      : '';
    newTasks[index][searchField] = searchText;

    console.log('Setting search field to:', searchText);
    console.log('Task object after update:', {
      assignees: newTasks[index].assignees,
      assigneesLength: newTasks[index].assignees ? newTasks[index].assignees.length : 0,
      reviewers: newTasks[index].reviewers,
      reviewersLength: newTasks[index].reviewers ? newTasks[index].reviewers.length : 0
    });

    newTasks[index][`${field.replace(/s$/, '')}Error`] = '';
    setTasks(newTasks);

    console.log('Tasks updated, new selection count:', newTasks[index][field].length, newTasks[index][field].map(u => u.name));

    // Đóng dropdown
    if (field === 'assignees') setAssigneeDropdown(prev => ({ ...prev, [index]: false }));
    if (field === 'reviewers') setReviewerDropdown(prev => ({ ...prev, [index]: false }));

    // Xóa cờ sau độ trễ dài hơn để đảm bảo blur handler không can thiệp
    setTimeout(() => {
      setDropdownSetting(prev => ({ ...prev, [`${index}-${field}`]: false }));
    }, 300);
  };

  // Xóa một user đã chọn
  const handleRemoveUser = (index, field, userId) => {
    const newTasks = [...tasks];
    const updatedSelection = (newTasks[index][field] || []).filter(user => user._id !== userId);
    newTasks[index][field] = updatedSelection;

    // Cập nhật trường tìm kiếm để hiển thị các user đã chọn còn lại với đầy đủ thông tin
    const searchField = `${field}Search`;
    if (updatedSelection.length > 0) {
      newTasks[index][searchField] = updatedSelection.map(u => {
        const parts = [u.name];
        if (u.userID) parts.push(`(${u.userID})`);
        if (u.email) parts.push(`(${u.email})`);
        return parts.join(' ');
      }).join(', ');
    } else {
      newTasks[index][searchField] = '';
    }

    setTasks(newTasks);
  };

  // Hàm validate
  const validateTasks = () => {
    let valid = true;
    const newTasks = tasks.map((task, idx) => {
      const t = { ...task };

      if (!t.name.trim()) { t.nameError = 'Vui lòng nhập tên task'; valid = false; }
      else t.nameError = '';
      if (!t.request.trim()) { t.requestError = 'Vui lòng nhập yêu cầu task'; valid = false; } else t.requestError = '';
      // Validate assignees
      if (!t.assignees || t.assignees.length === 0) {
        t.assigneeError = 'Vui lòng chọn ít nhất một người thực hiện'; valid = false;
      } else t.assigneeError = '';
      // Validate reviewers
      if (!t.reviewers || t.reviewers.length === 0) {
        t.reviewerError = 'Vui lòng chọn ít nhất một người đánh giá'; valid = false;
      } else t.reviewerError = '';
      return t;
    });
    setTasks(newTasks);
    return valid;
  };

  // Submit
  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Debug: Log trạng thái hiện tại trước khi validate
    console.log('Current tasks state before validation:', tasks.map(t => ({
      name: t.name,
      assignees: t.assignees,
      assigneesLength: t.assignees ? t.assignees.length : 0,
      reviewers: t.reviewers,
      reviewersLength: t.reviewers ? t.reviewers.length : 0,
      assigneeSearch: t.assigneeSearch,
      reviewerSearch: t.reviewerSearch,
      selectedFiles: t.selectedFiles ? t.selectedFiles.length : 0
    })));

    if (!validateTasks()) return;

    setIsSubmitting(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        alert('Vui lòng đăng nhập để tiếp tục.');
        setIsSubmitting(false);
        return;
      }
      const validTasks = tasks.filter(task => task.name && task.request && task.assignees.length > 0 && task.reviewers.length > 0);
      if (validTasks.length === 0) {
        alert('Vui lòng điền thông tin cho ít nhất một task hợp lệ.');
        setIsSubmitting(false);
        return;
      }
      let hasError = false;
      const errorMessages = [];

      for (const task of validTasks) {
        try {
          // Validate assignees và reviewers arrays
          if (!task.assignees || task.assignees.length === 0 || !task.reviewers || task.reviewers.length === 0) {
            throw new Error(`Task ${task.taskId}: Thiếu thông tin assignees hoặc reviewers`);
          }

          // Tạo FormData để upload file
          const formData = new FormData();

          // Thêm dữ liệu task cơ bản
          formData.append('taskId', task.taskId);
          formData.append('name', task.name.trim());
          formData.append('goal', task.request.trim() || '');
          formData.append('taskType', task.taskType || 'Feature');
          formData.append('priority', task.priority || 'Trung bình');
          formData.append('assignees', JSON.stringify(task.assignees.map(user => user._id)));
          formData.append('reviewers', JSON.stringify(task.reviewers.map(user => user._id)));
          formData.append('sprint', sprintId);

          // Thêm các trường tùy chọn
          if (task.storyPoints) formData.append('storyPoints', parseInt(task.storyPoints));
          if (task.estimatedHours) formData.append('estimatedHours', parseFloat(task.estimatedHours));
          if (task.startDate) formData.append('startDate', new Date(task.startDate));
          if (task.endDate) formData.append('taskEndDate', new Date(task.endDate));
          if (task.deadline) formData.append('deadline', new Date(task.deadline));
          if (task.description) formData.append('description', task.description.trim());
          if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
            formData.append('acceptanceCriteria', JSON.stringify(task.acceptanceCriteria));
          }

          // Thêm file nếu có (phải khớp với tên field backend "docs")
          if (task.selectedFiles && task.selectedFiles.length > 0) {
            Array.from(task.selectedFiles).forEach((file) => {
              formData.append('docs', file);
            });
          }

          console.log('Sending FormData with files:', {
            taskId: task.taskId,
            fileCount: task.selectedFiles ? task.selectedFiles.length : 0
          });

          await axiosInstance.post('/tasks', formData, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'multipart/form-data'
            }
          });
        } catch (error) {
          hasError = true;
          const errorMsg = error.response?.data?.message || error.message || 'Lỗi không xác định';
          errorMessages.push(`Task ${task.taskId || 'N/A'}: ${errorMsg}`);
          console.error('Error creating task:', error);
        }
      }

      if (hasError) {
        alert('Có lỗi xảy ra khi tạo task:\n' + errorMessages.join('\n'));
        setIsSubmitting(false);
        return;
      }

      onTaskAdded();
      onClose();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi thêm task';
      alert(errorMsg);
      setIsSubmitting(false);
    }
  };

  const handleAddTask = () => {
    setTasks([...tasks, {
      name: '',
      request: '',
      taskType: 'Feature',
      priority: 'Trung bình',
      assignees: [],
      reviewers: [],
      assigneeSearch: '',
      reviewerSearch: '',
      assigneeError: '',
      reviewerError: '',
      storyPoints: '',
      estimatedHours: '',
      startDate: '',
      endDate: '',
      deadline: '',
      description: '',
      acceptanceCriteria: [],
      newCriterion: '',
      taskId: generateUniqueTaskId(tasks)
    }]);
  };

  const handleRemoveTask = (index) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  // Mở popup chọn user
  const handleOpenUserSelector = (index, field) => {
    const currentTask = tasks[index];
    const currentSelection = currentTask[field] || [];
    setShowUserSelector({
      show: true,
      field,
      index,
      selectedUsers: [...currentSelection]
    });
  };

  // Xử lý chọn/bỏ chọn user trong popup
  const handleToggleUserSelection = (user) => {
    setShowUserSelector(prev => {
      const isSelected = prev.selectedUsers.some(selected => selected._id === user._id);
      if (isSelected) {
        return {
          ...prev,
          selectedUsers: prev.selectedUsers.filter(selected => selected._id !== user._id)
        };
      } else {
        return {
          ...prev,
          selectedUsers: [...prev.selectedUsers, user]
        };
      }
    });
  };

  // Xác nhận chọn user từ popup
  const handleConfirmUserSelection = () => {
    const { field, index, selectedUsers } = showUserSelector;

    // Đặt cờ để ngăn xóa lựa chọn trong quá trình chọn từ popup
    setDropdownSetting(prev => ({ ...prev, [`${index}-${field}`]: true }));

    const newTasks = [...tasks];
    newTasks[index][field] = selectedUsers;

    // Cập nhật trường tìm kiếm để hiển thị các user đã chọn trực tiếp trong input
    const searchField = `${field}Search`;
    const searchText = selectedUsers.length > 0
      ? selectedUsers.map(u => u.name).join(', ')
      : '';
    newTasks[index][searchField] = searchText;

    // Xóa lỗi
    newTasks[index][`${field.replace(/s$/, '')}Error`] = '';

    setTasks(newTasks);
    setShowUserSelector({ show: false, field: '', index: -1, selectedUsers: [] });

    // Xóa cờ sau độ trễ để đảm bảo state update hoàn tất
    setTimeout(() => {
      setDropdownSetting(prev => ({ ...prev, [`${index}-${field}`]: false }));
    }, 100);
  };

  // Hủy chọn user
  const handleCancelUserSelection = () => {
    setShowUserSelector({ show: false, field: '', index: -1, selectedUsers: [] });
  };



  // Khi mở dropdown, tính toán vị trí
  const handleAssigneeFocus = (index) => {
    setAssigneeDropdown(prev => ({ ...prev, [index]: true }));
    const input = assigneeInputRefs.current[index];
    if (input) {
      const rect = input.getBoundingClientRect();
      setAssigneeDropdownPos(prev => ({
        ...prev,
        [index]: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        }
      }));
    }
  };
  const handleReviewerFocus = (index) => {
    setReviewerDropdown(prev => ({ ...prev, [index]: true }));
    const input = reviewerInputRefs.current[index];
    if (input) {
      const rect = input.getBoundingClientRect();
      setReviewerDropdownPos(prev => ({
        ...prev,
        [index]: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        }
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        <div style={styles.headerSection}>
          <h2 style={styles.title} id="new-task-modal-title">Thêm Task Mới</h2>
          <button
            onClick={onClose}
            style={styles.closeButton}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#e9ecef'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#f1f3f5'}
          >&times;</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} style={styles.form}>
          <div style={styles.bodySection}>
            {tasks.map((task, index) => (
              <div key={index} style={styles.taskCard}>
                <div style={styles.taskHeader}>
                  <span style={styles.taskNumber}>Task #{task.taskId}</span>
                  {tasks.length > 1 && (
                    <button onClick={() => handleRemoveTask(index)} style={styles.removeTaskButton} type="button">
                      <img src="https://img.icons8.com/ios-glyphs/20/d9480f/trash.png" alt="remove task"/>
                    </button>
                  )}
                </div>
                <div style={styles.taskBodyContent}>
                  {/* Basic Information */}
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Thông tin cơ bản</h3>
                    <div style={styles.formGrid}>
                      <div style={{...styles.fieldGroup, position: 'relative'}}>
                        <label style={styles.label}>Tên Task <span style={{color:'#FA2B4D', fontSize:15, marginLeft:2, verticalAlign:'middle'}}>*</span></label>
                        <input
                          type="text"
                          style={{...styles.input, borderColor: task.nameError ? '#dc3545' : '#ccc'}}
                          placeholder="Tên công việc cụ thể"
                          value={task.name}
                          onChange={(e) => handleTaskChange(index, 'name', e.target.value)}
                        />
                        {task.nameError && <div style={styles.errorTextInline}>{task.nameError}</div>}
                      </div>
                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>Loại Task</label>
                        <select
                          style={styles.input}
                          value={task.taskType}
                          onChange={(e) => handleTaskChange(index, 'taskType', e.target.value)}
                        >
                          <option value="Feature">Feature</option>
                          <option value="Bug">Bug</option>
                          <option value="Improvement">Improvement</option>
                          <option value="Research/Spike">Research/Spike</option>
                        </select>
                      </div>
                    </div>
                    <div style={styles.formGrid}>
                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>Mức độ ưu tiên</label>
                        <select
                          style={styles.input}
                          value={task.priority}
                          onChange={(e) => handleTaskChange(index, 'priority', e.target.value)}
                        >
                          <option value="Thấp">Thấp</option>
                          <option value="Trung bình">Trung bình</option>
                          <option value="Cao">Cao</option>
                          <option value="Khẩn cấp">Khẩn cấp</option>
                        </select>
                      </div>
                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>Story Points</label>
                        <input
                          type="number"
                          style={styles.input}
                          placeholder="1, 2, 3, 5, 8..."
                          value={task.storyPoints}
                          onChange={(e) => handleTaskChange(index, 'storyPoints', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{...styles.fieldGroup, position: 'relative'}}>
                    <label style={styles.label}>Yêu cầu Task <span style={{color:'#FA2B4D', fontSize:15, marginLeft:2, verticalAlign:'middle'}}>*</span></label>
                    <textarea
                      style={{...styles.textarea, borderColor: task.requestError ? '#dc3545' : '#ccc'}}
                      placeholder="Mô tả chi tiết yêu cầu của công việc"
                      value={task.request}
                      onChange={(e) => handleTaskChange(index, 'request', e.target.value)}
                      rows={3}
                    ></textarea>
                    {task.requestError && <div style={styles.errorTextInline}>{task.requestError}</div>}
                  </div>

                  <div style={{...styles.fieldGroup, position: 'relative'}}>
                    <label style={styles.label}>Mô tả chi tiết</label>
                    <textarea
                      style={styles.textarea}
                      placeholder="Mô tả bổ sung chi tiết hơn về task (tùy chọn)"
                      value={task.description}
                      onChange={(e) => handleTaskChange(index, 'description', e.target.value)}
                      rows={2}
                    ></textarea>
                  </div>

                  {/* Time Tracking */}
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Thời gian</h3>
                    <div style={styles.formGrid}>
                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>Giờ dự kiến</label>
                        <input
                          type="number"
                          step="0.5"
                          style={styles.input}
                          placeholder="8.5"
                          value={task.estimatedHours}
                          onChange={(e) => handleTaskChange(index, 'estimatedHours', e.target.value)}
                        />
                      </div>
                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>Deadline</label>
                        <DatePicker
                          value={task.deadline}
                          onChange={(value) => handleTaskChange(index, 'deadline', value)}
                          placeholder="Chọn deadline"
                        />
                      </div>
                    </div>
                    <div style={styles.formGrid}>
                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>Ngày bắt đầu</label>
                        <DatePicker
                          value={task.startDate}
                          onChange={(value) => handleTaskChange(index, 'startDate', value)}
                          placeholder="Chọn ngày bắt đầu"
                        />
                      </div>
                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>Ngày kết thúc</label>
                        <DatePicker
                          value={task.endDate}
                          onChange={(value) => handleTaskChange(index, 'endDate', value)}
                          placeholder="Chọn ngày kết thúc"
                        />
                      </div>
                    </div>
                  </div>

                  {/* File Attachments */}
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Files đính kèm</h3>
                    <div style={styles.fileUploadArea}>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => handleFileChange(index, e.target.files)}
                        style={{ display: 'none' }}
                        id={`file-upload-${index}`}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.zip,.rar"
                      />
                      <label htmlFor={`file-upload-${index}`} style={styles.fileUploadLabel}>
                        <div style={styles.uploadIcon}>📎</div>
                        <div>Chọn files để upload</div>
                        <div style={styles.uploadHint}>PDF, DOC, XLS, TXT, hình ảnh, ZIP (tối đa 10MB mỗi file)</div>
                      </label>
                    </div>

                    {/* Display selected files */}
                    {task.selectedFiles && task.selectedFiles.length > 0 && (
                      <div style={styles.selectedFilesList}>
                        <h4 style={styles.filesTitle}>Files đã chọn:</h4>
                        {Array.from(task.selectedFiles).map((file, fileIndex) => (
                          <div key={fileIndex} style={styles.fileItem}>
                            <div style={styles.fileInfo}>
                              <span style={styles.fileName}>{file.name}</span>
                              <span style={styles.fileSize}>({formatFileSize(file.size)})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(index, fileIndex)}
                              style={styles.removeFileBtn}
                              title="Xóa file"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Acceptance Criteria */}
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Tiêu chí chấp nhận</h3>
                    {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
                      <div style={styles.criteriaList}>
                        {task.acceptanceCriteria.map((criterion, criterionIndex) => (
                          <div key={criterionIndex} style={styles.criterionItem}>
                            <span>{criterion}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCriterion(index, criterionIndex)}
                              style={styles.removeCriterionBtn}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={styles.addCriterionGroup}>
                      <input
                        type="text"
                        style={{...styles.input, flex: 1}}
                        placeholder="Thêm tiêu chí chấp nhận..."
                        value={task.newCriterion || ''}
                        onChange={(e) => handleTaskChange(index, 'newCriterion', e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCriterion(index))}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCriterion(index)}
                        style={styles.addCriterionBtn}
                        disabled={!task.newCriterion || !task.newCriterion.trim()}
                      >
                        Thêm
                      </button>
                    </div>
                  </div>

                  <div style={styles.formGrid}>
                    {/* Người thực hiện */}
                    <div style={{...styles.fieldGroup, position: 'relative'}}>
                      <label style={styles.label}>Người thực hiện <span style={{color:'#FA2B4D', fontSize:15, marginLeft:2, verticalAlign:'middle'}}>*</span></label>
                      <div style={styles.inputWithAddon}>
                        <input
                          style={{...styles.input, borderColor: task.assigneeError ? '#dc3545' : '#ccc', borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0}}
                          placeholder="Tìm theo tên, email hoặc ID"
                          value={task.assigneeSearch}
                          onChange={e => handleTaskChange(index, 'assigneeSearch', e.target.value)}
                          onFocus={() => handleAssigneeFocus(index)}
                          onBlur={() => {
                            setTimeout(() => setAssigneeDropdown(prev => ({ ...prev, [index]: false })), 200);
                            handleInputBlur(index, 'assignees');
                          }}
                          autoComplete="off"
                          ref={el => assigneeInputRefs.current[index] = el}
                        />
                        <button
                          type="button"
                          style={styles.addonBtn}
                          onClick={() => handleOpenUserSelector(index, 'assignees')}
                          title="Chọn người thực hiện"
                        >
                          +
                        </button>
                      </div>
                      {task.assigneeError && <div style={styles.errorTextInline}>{task.assigneeError}</div>}
                      {/* Selected assignees display */}
                      {(task.assignees || []).length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(task.assignees || []).map(user => (
                            <div key={user._id} style={{
                              background: '#e3f2fd',
                              border: '1px solid #2196f3',
                              borderRadius: 16,
                              padding: '4px 8px',
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              {user.name}
                              <button
                                type="button"
                                onClick={() => handleRemoveUser(index, 'assignees', user._id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#666',
                                  cursor: 'pointer',
                                  padding: 0,
                                  fontSize: 14,
                                  lineHeight: 1
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {assigneeDropdown[index] && assigneeDropdownPos[index] && ReactDOM.createPortal(
                        <div style={{
                          ...styles.autocompleteList,
                          position: 'absolute',
                          top: assigneeDropdownPos[index].top,
                          left: assigneeDropdownPos[index].left,
                          width: assigneeDropdownPos[index].width,
                          zIndex: 9999,
                          maxHeight: 220,
                          overflowY: 'auto',
                        }}>
                          {task.assigneeSearch.trim() && filterMembers(task.assigneeSearch).length > 0 ? (
                            filterMembers(task.assigneeSearch).map((m) => (
                              <div
                                key={m._id}
                                style={{
                                  ...styles.autocompleteItem,
                                  backgroundColor: (task.assignees || []).some(selected => selected._id === m._id) ? '#e3f2fd' : 'transparent',
                                  cursor: 'pointer'
                                }}
                                onMouseDown={e => {
                                  console.log('Dropdown item clicked:', m.name);
                                  e.preventDefault();
                                  handleSelectUser(index, 'assignees', m);
                                }}
                              >
                                {m.name} {m.email && <span style={{ color: '#888' }}>({m.email})</span>}
                              </div>
                            ))
                          ) : task.assigneeSearch.trim() ? (
                            <div style={{ ...styles.autocompleteItem, color: '#888', fontStyle: 'italic' }}>Không tìm thấy</div>
                          ) : null}
                        </div>,
                        document.body
                      )}
                    </div>
                    {/* Người đánh giá */}
                    <div style={{...styles.fieldGroup, position: 'relative'}}>
                      <label style={styles.label}>Người đánh giá <span style={{color:'#FA2B4D', fontSize:15, marginLeft:2, verticalAlign:'middle'}}>*</span></label>
                      <div style={styles.inputWithAddon}>
                        <input
                          style={{...styles.input, borderColor: task.reviewerError ? '#dc3545' : '#ccc', borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0}}
                          placeholder="Tìm theo tên, email hoặc ID"
                          value={task.reviewerSearch}
                          onChange={e => handleTaskChange(index, 'reviewerSearch', e.target.value)}
                          onFocus={() => handleReviewerFocus(index)}
                          onBlur={() => {
                            setTimeout(() => setReviewerDropdown(prev => ({ ...prev, [index]: false })), 200);
                            handleInputBlur(index, 'reviewers');
                          }}
                          autoComplete="off"
                          ref={el => reviewerInputRefs.current[index] = el}
                        />
                        <button
                          type="button"
                          style={styles.addonBtn}
                          onClick={() => handleOpenUserSelector(index, 'reviewers')}
                          title="Chọn người đánh giá"
                        >
                          +
                        </button>
                      </div>
                      {task.reviewerError && <div style={styles.errorTextInline}>{task.reviewerError}</div>}
                      {/* Selected reviewers display */}
                      {(task.reviewers || []).length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(task.reviewers || []).map(user => (
                            <div key={user._id} style={{
                              background: '#f3e5f5',
                              border: '1px solid #9c27b0',
                              borderRadius: 16,
                              padding: '4px 8px',
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              {user.name}
                              <button
                                type="button"
                                onClick={() => handleRemoveUser(index, 'reviewers', user._id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#666',
                                  cursor: 'pointer',
                                  padding: 0,
                                  fontSize: 14,
                                  lineHeight: 1
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {reviewerDropdown[index] && reviewerDropdownPos[index] && ReactDOM.createPortal(
                        <div style={{
                          ...styles.autocompleteList,
                          position: 'absolute',
                          top: reviewerDropdownPos[index].top,
                          left: reviewerDropdownPos[index].left,
                          width: reviewerDropdownPos[index].width,
                          zIndex: 9999,
                          maxHeight: 220,
                          overflowY: 'auto',
                        }}>
                          {task.reviewerSearch.trim() && filterMembers(task.reviewerSearch).length > 0 ? (
                            filterMembers(task.reviewerSearch).map((m) => (
                              <div
                                key={m._id}
                                style={{
                                  ...styles.autocompleteItem,
                                  backgroundColor: (task.reviewers || []).some(selected => selected._id === m._id) ? '#e3f2fd' : 'transparent',
                                }}
                                onMouseDown={e => {
                                  console.log('Dropdown item clicked:', m.name);
                                  e.preventDefault();
                                  handleSelectUser(index, 'reviewers', m);
                                }}
                              >
                                {m.name} {m.email && <span style={{ color: '#888' }}>({m.email})</span>}
                              </div>
                            ))
                          ) : task.reviewerSearch.trim() ? (
                            <div style={{ ...styles.autocompleteItem, color: '#888', fontStyle: 'italic' }}>Không tìm thấy</div>
                          ) : null}
                        </div>,
                        document.body
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={handleAddTask}
              style={styles.addTaskButton}
              type="button"
              onMouseOver={e => { e.currentTarget.style.backgroundColor = '#e6f2ff'; e.currentTarget.style.borderColor = '#0056b3';}}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#007BFF';}}
            >+ Thêm Task</button>
          </div>
          <div style={styles.actions}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              style={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? `Đang thêm...` : `Thêm ${tasks.length > 1 ? `${tasks.length} Task` : 'Task'}`}
            </button>
          </div>
        </form>

        {/* User Selector Popup */}
        {showUserSelector.show && (
          <div style={styles.userSelectorOverlay}>
            <div style={styles.userSelectorPopup}>
              <div style={styles.userSelectorHeader}>
                <h3 style={styles.userSelectorTitle}>
                  Chọn {showUserSelector.field === 'assignees' ? 'Người thực hiện' : 'Người đánh giá'}
                </h3>
                <button
                  onClick={handleCancelUserSelection}
                  style={styles.userSelectorCloseBtn}
                >
                  ×
                </button>
              </div>
              <div style={styles.userSelectorBody}>
                {members && members.length > 0 ? (
                  members.map((user) => {
                    const isSelected = showUserSelector.selectedUsers.some(selected => selected._id === user._id);
                    return (
                      <div
                        key={user._id}
                        style={{
                          ...styles.userSelectorItem,
                          backgroundColor: isSelected ? '#e3f2fd' : '#fff',
                          borderColor: isSelected ? '#2196f3' : '#dee2e6'
                        }}
                        onClick={() => handleToggleUserSelection(user)}
                      >
                        <div style={styles.userInfo}>
                          <div style={styles.userAvatar}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={styles.userDetails}>
                            <div style={styles.userName}>{user.name}</div>
                            <div style={styles.userEmail}>{user.email}</div>
                          </div>
                        </div>
                        <div style={{
                          ...styles.checkbox,
                          backgroundColor: isSelected ? '#2196f3' : '#fff',
                          borderColor: isSelected ? '#2196f3' : '#ccc'
                        }}>
                          {isSelected && <span style={styles.checkmark}>✓</span>}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={styles.noUsers}>Không có thành viên nào</div>
                )}
              </div>
              <div style={styles.userSelectorFooter}>
                <button
                  onClick={handleCancelUserSelection}
                  style={styles.userSelectorCancelBtn}
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmUserSelection}
                  style={styles.userSelectorConfirmBtn}
                >
                  Xác nhận ({showUserSelector.selectedUsers.length})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(30,34,45,0.22)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(2.5px)',
  },
  popup: {
    background: '#fafdff',
    borderRadius: 28,
    padding: '20px 40px',
    width: '92vw',
    maxWidth: 900,
    minWidth: 480,
    maxHeight: '92vh',
    overflowY: 'auto',
    boxShadow: '0 8px 40px 0 rgba(30,34,45,0.18)',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    border: '1.5px solid #e3e8f0',
  },
  headerSection: {
    textAlign: 'center',
    marginBottom: 16,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
    marginBottom: 4,
    letterSpacing: 0.5,
    color: '#1a2236',
    flex: 1,
  },
  closeButton: {
    background: '#f1f3f5',
    border: 'none',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5em',
    cursor: 'pointer',
    color: '#868e96',
    transition: 'all 0.2s ease',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  bodySection: {
    padding: '0 0 8px 0',
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    border: '1px solid #e9ecef',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: '0 0 16px 0',
    color: '#495057',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 6,
    color: '#333',
  },
  input: {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #ccc',
    fontSize: 14,
    background: '#fff',
    transition: 'all 0.2s ease',
    outline: 'none',
    height: 40,
    boxSizing: 'border-box',
  },
  textarea: {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #ccc',
    fontSize: 14,
    background: '#fff',
    resize: 'vertical',
    transition: 'border 0.2s',
    outline: 'none',
    minHeight: 80,
    boxSizing: 'border-box',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: 8,
  },
  criteriaList: {
    marginBottom: 12,
  },
  criterionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#fff',
    border: '1px solid #dee2e6',
    borderRadius: 4,
    marginBottom: 8,
  },
  removeCriterionBtn: {
    background: 'none',
    border: 'none',
    color: '#dc3545',
    cursor: 'pointer',
    fontSize: 18,
    padding: 0,
    width: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCriterionGroup: {
    display: 'flex',
    gap: 8,
  },
  addCriterionBtn: {
    background: '#007BFF',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: 14,
    whiteSpace: 'nowrap',
  },
  taskCard: {
    border: '1px solid #dee2e6',
    borderRadius: '12px',
    marginBottom: '24px',
    backgroundColor: '#fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  taskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#f1f3f5',
    borderBottom: '1px solid #dee2e6',
  },
  taskNumber: {
    fontWeight: 700,
    fontSize: '1.1em',
    color: '#495057',
  },
  removeTaskButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '5px',
  },
  taskBodyContent: {
    padding: '20px',
  },
  addTaskButton: {
    backgroundColor: 'transparent',
    color: '#007BFF',
    padding: '10px 20px',
    border: '2px dashed #007BFF',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: 600,
    margin: '20px 0 10px 0',
    display: 'block',
    width: '100%',
    transition: 'all 0.2s',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 18,
  },
  cancelBtn: {
    background: '#f0f0f0',
    color: '#333',
    border: 'none',
    borderRadius: 6,
    padding: '10px 20px',
    fontSize: 14,
    cursor: 'pointer',
  },
  submitBtn: {
    background: '#FA2B4D',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  autocompleteList: {
    border: '1px solid #ccc',
    borderRadius: 4,
    backgroundColor: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    zIndex: 1000,
    maxHeight: 220,
    overflowY: 'auto',
  },
  autocompleteItem: {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 14,
    color: '#333',
    borderBottom: '1px solid #eee',
  },
  addUserBtn: {
    background: '#007BFF',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 'bold',
    padding: 0,
    minWidth: 20,
    '&:disabled': {
      background: '#ccc',
      cursor: 'not-allowed',
    },
  },
  inputWithAddon: {
    display: 'flex',
    alignItems: 'stretch',
  },
  addonBtn: {
    background: '#007BFF',
    color: '#fff',
    border: '1px solid #007BFF',
    borderLeft: 'none',
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    width: 40,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
  },
  userSelectorOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  userSelectorPopup: {
    background: '#fff',
    borderRadius: 12,
    width: '90vw',
    maxWidth: 500,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  userSelectorHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #e9ecef',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userSelectorTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: '#333',
  },
  userSelectorCloseBtn: {
    background: 'none',
    border: 'none',
    fontSize: 24,
    cursor: 'pointer',
    color: '#666',
    padding: 0,
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSelectorBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  userSelectorItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    cursor: 'pointer',
    border: '1px solid #dee2e6',
    borderLeft: 'none',
    borderRight: 'none',
    borderTop: 'none',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#f8f9fa',
    },
    '&:first-child': {
      borderTop: '1px solid #dee2e6',
    },
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#007BFF',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
    margin: 0,
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
    margin: 0,
  },
  checkbox: {
    width: 20,
    height: 20,
    border: '2px solid #ccc',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noUsers: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#666',
    fontStyle: 'italic',
  },
  userSelectorFooter: {
    padding: '16px 20px',
    borderTop: '1px solid #e9ecef',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
  },
  userSelectorCancelBtn: {
    background: '#f0f0f0',
    color: '#333',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: 14,
  },
  userSelectorConfirmBtn: {
    background: '#007BFF',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  errorTextInline: {
    color: '#dc3545',
    fontSize: 11,
    fontWeight: 500,
    position: 'absolute',
    bottom: -16,
    left: 0,
    zIndex: 1,
    animation: 'fadeIn 0.2s ease-in',
  },
  fileUploadArea: {
    border: '2px dashed #dee2e6',
    borderRadius: 8,
    padding: '20px',
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: 16,
  },
  fileUploadLabel: {
    cursor: 'pointer',
    display: 'block',
    width: '100%',
    height: '100%',
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadHint: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  selectedFilesList: {
    marginTop: 16,
  },
  filesTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#495057',
    marginBottom: 8,
  },
  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#fff',
    border: '1px solid #dee2e6',
    borderRadius: 4,
    marginBottom: 8,
  },
  fileInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  fileName: {
    fontSize: 14,
    fontWeight: 500,
    color: '#333',
  },
  fileSize: {
    fontSize: 12,
    color: '#6c757d',
  },
  removeFileBtn: {
    background: 'none',
    border: 'none',
    color: '#dc3545',
    cursor: 'pointer',
    fontSize: 18,
    padding: 0,
    width: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default NewTaskPopup;

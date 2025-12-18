import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

const DatePicker = ({
  value,
  onChange,
  placeholder = "Chọn ngày",
  disabled = false,
  minDate,
  maxDate,
  className = "",
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const inputRef = useRef(null);
  const calendarRef = useRef(null);

  // Cập nhật selected date khi value prop thay đổi
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      setCurrentMonth(date.getMonth());
      setCurrentYear(date.getFullYear());
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  // Đóng calendar khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target) &&
          calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Xử lý keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          break;
        case 'Enter':
          event.preventDefault();
          // Chọn ngày hiện tại nếu calendar đang mở
          break;
        default:
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const formatDate = (date) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseDate = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    
    // Validate các thành phần ngày
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31) return null;
    if (month < 0 || month > 11) return null;
    if (year < 1900 || year > 2100) return null;
    
    const date = new Date(year, month, day);
    
    // Kiểm tra ngày có hợp lệ bằng cách so sánh các thành phần
    // Điều này xử lý các trường hợp như 30 tháng 2 sẽ tràn sang 2 tháng 3
    if (date.getFullYear() !== year || 
        date.getMonth() !== month || 
        date.getDate() !== day) {
      return null;
    }
    
    return date;
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const isToday = (day, month, year) => {
    const today = new Date();
    return today.getDate() === day &&
           today.getMonth() === month &&
           today.getFullYear() === year;
  };

  const isSelected = (day, month, year) => {
    if (!selectedDate) return false;
    return selectedDate.getDate() === day &&
           selectedDate.getMonth() === month &&
           selectedDate.getFullYear() === year;
  };

  const isDateDisabled = (day, month, year) => {
    const date = new Date(year, month, day);
    if (minDate && date < new Date(minDate)) return true;
    if (maxDate && date > new Date(maxDate)) return true;
    return false;
  };

  const handleDateClick = (day, month, year) => {
    if (isDateDisabled(day, month, year)) return;

    const newDate = new Date(year, month, day);
    setSelectedDate(newDate);
    onChange(newDate.toISOString().split('T')[0]); // Format thành YYYY-MM-DD
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handlePrevYear = () => {
    setCurrentYear(currentYear - 1);
  };

  const handleNextYear = () => {
    setCurrentYear(currentYear + 1);
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    const parsedDate = parseDate(inputValue);
    if (parsedDate) {
      setSelectedDate(parsedDate);
      onChange(parsedDate.toISOString().split('T')[0]);
    } else {
      setSelectedDate(null);
      onChange('');
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Các ngày của tháng trước
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear);

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      days.push(
        <div
          key={`prev-${day}`}
          style={{
            ...calendarStyles.day,
            ...calendarStyles.otherMonth,
            cursor: 'default'
          }}
        >
          {day}
        </div>
      );
    }

    // Các ngày của tháng hiện tại
    for (let day = 1; day <= daysInMonth; day++) {
      const isTodayDate = isToday(day, currentMonth, currentYear);
      const isSelectedDate = isSelected(day, currentMonth, currentYear);
      const isDisabled = isDateDisabled(day, currentMonth, currentYear);

      days.push(
        <div
          key={`current-${day}`}
          style={{
            ...calendarStyles.day,
            ...(isTodayDate && calendarStyles.today),
            ...(isSelectedDate && calendarStyles.selected),
            ...(isDisabled && calendarStyles.disabled),
            cursor: isDisabled ? 'not-allowed' : 'pointer'
          }}
          onClick={() => !isDisabled && handleDateClick(day, currentMonth, currentYear)}
        >
          {day}
        </div>
      );
    }

    // Các ngày của tháng sau
    const remainingCells = 42 - days.length; // 6 hàng * 7 ngày
    for (let day = 1; day <= remainingCells; day++) {
      days.push(
        <div
          key={`next-${day}`}
          style={{
            ...calendarStyles.day,
            ...calendarStyles.otherMonth,
            cursor: 'default'
          }}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const inputRect = inputRef.current ? inputRef.current.getBoundingClientRect() : null;

  return (
    <div style={{ ...styles.container, ...style }} className={className}>
      <div style={styles.inputWrapper} ref={inputRef}>
        <input
          type="text"
          value={formatDate(selectedDate)}
          onChange={handleInputChange}
          onClick={handleInputClick}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            ...styles.input,
            ...(disabled && styles.disabled),
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
          readOnly
        />
        <div
          style={{
            ...styles.icon,
            ...(disabled && styles.disabled)
          }}
          onClick={!disabled ? handleInputClick : undefined}
        >
          📅
        </div>
      </div>

      {isOpen && inputRect && ReactDOM.createPortal(
        <div
          ref={calendarRef}
          style={{
            ...styles.calendar,
            position: 'absolute',
            top: inputRect.bottom + window.scrollY + 4,
            left: inputRect.left + window.scrollX,
            width: inputRect.width,
            zIndex: 9999
          }}
        >
          {/* Header */}
          <div style={styles.header}>
            <button
              type="button"
              onClick={handlePrevYear}
              style={styles.navButton}
            >
              ‹‹
            </button>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={styles.navButton}
            >
              ‹
            </button>
            <div style={styles.monthYear}>
              {monthNames[currentMonth]} {currentYear}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              style={styles.navButton}
            >
              ›
            </button>
            <button
              type="button"
              onClick={handleNextYear}
              style={styles.navButton}
            >
              ››
            </button>
          </div>

          {/* Weekdays */}
          <div style={styles.weekdays}>
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
              <div key={day} style={styles.weekday}>
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div style={styles.days}>
            {renderCalendar()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative',
    display: 'inline-block',
    width: '100%'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  input: {
    width: '100%',
    padding: '8px 40px 8px 12px',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 14,
    background: '#fff',
    outline: 'none',
    height: 40,
    boxSizing: 'border-box',
    cursor: 'pointer'
  },
  disabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
    cursor: 'not-allowed'
  },
  icon: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 16,
    color: '#666',
    pointerEvents: 'none',
    cursor: 'pointer'
  },
  calendar: {
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: 8,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    padding: 16,
    minWidth: 280
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  navButton: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 4,
    color: '#666',
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  monthYear: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
    minWidth: 120,
    textAlign: 'center'
  },
  weekdays: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 4,
    marginBottom: 8
  },
  weekday: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 600,
    color: '#666',
    padding: '8px 0'
  },
  days: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 2
  }
};

const calendarStyles = {
  day: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    fontSize: 14,
    borderRadius: 4,
    userSelect: 'none'
  },
  today: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    fontWeight: 600
  },
  selected: {
    backgroundColor: '#1976d2',
    color: '#fff',
    fontWeight: 600
  },
  disabled: {
    color: '#ccc',
    cursor: 'not-allowed'
  },
  otherMonth: {
    color: '#999'
  }
};

export default DatePicker;

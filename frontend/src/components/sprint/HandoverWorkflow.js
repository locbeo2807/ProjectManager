import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Box, Grid, Card, CardContent, Typography, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select, MenuItem,
  IconButton, Paper, Stepper, Step, StepLabel, StepContent, LinearProgress
} from '@mui/material';
import {
  SwapHoriz,
  CheckCircle,
  Send,
  Close
} from '@mui/icons-material';
import { useNotify } from '../../hooks/useNotify';
import TaskService from '../../services/taskService';
import styles from './HandoverWorkflow.module.css';

const HandoverWorkflow = ({ sprint, onSprintUpdate, readOnly }) => {
  const notify = useNotify();
  const [tasks, setTasks] = useState([]);
  const [handoverDialogOpen, setHandoverDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newAssignee, setNewAssignee] = useState('');
  const [newReviewer, setNewReviewer] = useState('');
  const [handoverComment, setHandoverComment] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const fetchSprintTasks = useCallback(async () => {
    try {
      const response = await TaskService.getTasksBySprint(sprint._id);
      setTasks(response.data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, [sprint]);

  useEffect(() => {
    if (sprint) {
      fetchSprintTasks();
      fetchAvailableUsers();
    }
  }, [sprint, fetchSprintTasks]);

  const fetchAvailableUsers = async () => {
    try {
      // This would be an API call to get project users
      // For now, using mock data
      const mockUsers = [
        { _id: '1', name: 'Nguyễn Văn A', email: 'a@example.com', role: 'Developer' },
        { _id: '2', name: 'Trần Thị B', email: 'b@example.com', role: 'Developer' },
        { _id: '3', name: 'Lê Văn C', email: 'c@example.com', role: 'QA Tester' },
        { _id: '4', name: 'Phạm Thị D', email: 'd@example.com', role: 'Developer' }
      ];
      setAvailableUsers(mockUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };





  const handleOpenHandoverDialog = (task) => {
    setSelectedTask(task);
    setHandoverDialogOpen(true);
    setActiveStep(0);
    setNewAssignee('');
    setNewReviewer('');
    setHandoverComment('');
  };

  const handleCloseHandoverDialog = () => {
    setHandoverDialogOpen(false);
    setSelectedTask(null);
    setActiveStep(0);
    setNewAssignee('');
    setNewReviewer('');
    setHandoverComment('');
  };

  const handleHandoverSubmit = async () => {
    if (!selectedTask || !newAssignee || !newReviewer) {
      notify.error('Vui lòng điền đầy đủ thông tin', 'Error');
      return;
    }

    setLoading(true);
    try {
      // This would be an API call to perform the handover
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      notify.success('Bàn giao task thành công!', 'Success');
      handleCloseHandoverDialog();
      fetchSprintTasks();
      if (onSprintUpdate) {
        onSprintUpdate();
      }
    } catch (error) {
      console.error('Error handing over task:', error);
      notify.error('Không thể bàn giao task', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const getHandoverSteps = (task) => {
    if (!task) return [];
    return [
      {
        label: 'Chọn task',
        description: `Task: ${task.name}`,
        completed: true
      },
      {
        label: 'Chọn người nhận',
        description: newAssignee ? `Đã chọn: ${availableUsers.find(u => u._id === newAssignee)?.name}` : 'Chưa chọn',
        completed: !!newAssignee
      },
      {
        label: 'Chọn reviewer',
        description: newReviewer ? `Đã chọn: ${availableUsers.find(u => u._id === newReviewer)?.name}` : 'Chưa chọn',
        completed: !!newReviewer
      },
      {
        label: 'Ghi chú',
        description: handoverComment || 'Không có ghi chú',
        completed: !!handoverComment
      },
      {
        label: 'Xác nhận',
        description: 'Hoàn tất bàn giao',
        completed: false
      }
    ];
  };

  return (
    <Box className={styles.handoverWorkflow}>
      <Typography variant="h5" className={styles.title} gutterBottom>
        <SwapHoriz className={styles.titleIcon} />
        Workflow Bàn Giao Task
      </Typography>

      {/* Tasks List */}
      <Grid container spacing={3} className={styles.tasksGrid}>
        {tasks.map((task) => (
          <Grid item xs={12} sm={6} md={4} key={task._id}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={styles.taskCard}>
                <CardContent>
                  <Box className={styles.taskHeader}>
                    <Typography variant="h6" className={styles.taskName}>
                      {task.name}
                    </Typography>
                    <Chip
                      label={task.taskId}
                      size="small"
                      className={styles.taskIdChip}
                    />
                  </Box>

                  <Box className={styles.taskInfo}>
                    <Typography variant="body2" color="textSecondary">
                      {task.goal}
                    </Typography>
                    <Box className={styles.assignmentRow}>
                      <CheckCircle className={styles.assignmentIcon} />
                      <Typography variant="body2" color="textSecondary">
                        Reviewer:
                      </Typography>
                      <Typography variant="body2" fontWeight="500">
                        {task.reviewer?.name || 'Chưa gán'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Progress Bar */}
                  <Box className={styles.progressSection}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Tiến độ bàn giao
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={task.status === 'Hoàn thành' ? 100 : task.status === 'Đang làm' ? 50 : 25}
                      className={styles.progressBar}
                    />
                  </Box>

                  {/* Handover Button */}
                  {!readOnly && (
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      startIcon={<SwapHoriz />}
                      onClick={() => handleOpenHandoverDialog(task)}
                      className={styles.handoverButton}
                    >
                      Bàn giao
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Handover Dialog */}
      <Dialog 
        open={handoverDialogOpen} 
        onClose={handleCloseHandoverDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          className: styles.handoverDialog
        }}
      >
        <DialogTitle className={styles.dialogTitle}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <SwapHoriz />
              <Typography>Bàn giao Task</Typography>
            </Box>
            <IconButton onClick={handleCloseHandoverDialog}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent className={styles.dialogContent}>
          {selectedTask && (
            <Box>
              {/* Task Info */}
              <Paper className={styles.taskInfoPaper} elevation={1}>
                <Typography variant="subtitle1" gutterBottom fontWeight="600">
                  {selectedTask.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedTask.taskId} • {selectedTask.status}
                </Typography>
              </Paper>

              {/* Handover Steps */}
              <Stepper 
                activeStep={activeStep} 
                orientation="vertical" 
                className={styles.handoverStepper}
              >
                {getHandoverSteps(selectedTask).map((step, index) => (
                  <Step key={index} completed={step.completed}>
                    <StepLabel
                      StepIconComponent={() => (
                        <Box className={styles.stepIcon}>
                          {step.icon}
                        </Box>
                      )}
                    >
                      <Typography variant="subtitle2" fontWeight="600">
                        {step.label}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {step.description}
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      {index === 1 && ( // New Assignee step
                        <FormControl fullWidth margin="normal">
                          <InputLabel>Người nhận bàn giao</InputLabel>
                          <Select
                            value={newAssignee}
                            onChange={(e) => {
                              setNewAssignee(e.target.value);
                              if (e.target.value) setActiveStep(2);
                            }}
                            label="Người nhận bàn giao"
                          >
                            {availableUsers.map((user) => (
                              <MenuItem key={user._id} value={user._id}>
                                {user.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                      {index === 2 && ( // New Reviewer step
                        <FormControl fullWidth margin="normal">
                          <InputLabel>Người xem xét</InputLabel>
                          <Select
                            value={newReviewer}
                            onChange={(e) => {
                              setNewReviewer(e.target.value);
                              if (e.target.value) setActiveStep(3);
                            }}
                            label="Người xem xét"
                          >
                            {availableUsers.map((user) => (
                              <MenuItem key={user._id} value={user._id}>
                                {user.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </StepContent>
                  </Step>
                ))}
              </Stepper>

              {/* Comment */}
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Ghi chú bàn giao"
                value={handoverComment}
                onChange={(e) => setHandoverComment(e.target.value)}
                margin="normal"
                className={styles.commentField}
                placeholder="Nhập ghi chú cho việc bàn giao task này..."
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions className={styles.dialogActions}>
          <Button onClick={handleCloseHandoverDialog}>
            Hủy
          </Button>
          <Button
            onClick={handleHandoverSubmit}
            variant="contained"
            color="primary"
            disabled={loading || !newAssignee || !newReviewer}
            startIcon={<Send />}
          >
            {loading ? 'Đang bàn giao...' : 'Bàn giao'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HandoverWorkflow;

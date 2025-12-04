// Script Test Workflow - Quy trình quản lý dự án hoàn chỉnh
// Chạy script này để test toàn bộ workflow local

const axios = require('axios');

// Cấu hình
const API_BASE = 'http://localhost:5000/api';
const FRONTEND_URL = 'http://localhost:3000';

// User Test (tạo những user này trong database trước)
const USERS = {
  pm: { email: 'pm@test.com', password: '123456', role: 'PM' },
  ba: { email: 'ba@test.com', password: '123456', role: 'BA' },
  dev: { email: 'dev@test.com', password: '123456', role: 'Developer' },
  qa: { email: 'qa@test.com', password: '123456' }
};

let tokens = {};
let projectId = null;
let moduleId = null;
let releaseId = null;
let sprintId = null;
let taskId = null;

// Hàm tiện ích
async function login(email, password) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
    console.log(`✅ ${email} logged in successfully`);
    return response.data.accessToken;
  } catch (error) {
    console.log(`❌ Login failed for ${email}:`, error.response?.data?.message);
    return null;
  }
}

async function makeRequest(method, url, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${url}`,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    };

    if (data && (method === 'post' || method === 'put')) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.log(`❌ ${method.toUpperCase()} ${url} failed:`, error.response?.data?.message);
    throw error;
  }
}

// Workflow test chính
async function runTestWorkflow() {
  console.log('🚀 Starting Complete Project Management Workflow Test\n');

  try {
    // Phase 1: Authentication
    console.log('📋 Phase 1: User Authentication');
    tokens.pm = await login(USERS.pm.email, USERS.pm.password);
    tokens.ba = await login(USERS.ba.email, USERS.ba.password);
    tokens.dev = await login(USERS.dev.email, USERS.dev.password);
    tokens.qa = await login(USERS.qa.email, USERS.qa.password);

    if (!tokens.pm || !tokens.ba || !tokens.dev || !tokens.qa) {
      throw new Error('Authentication failed');
    }

    // Phase 2: Project Creation (PM)
    console.log('\n📋 Phase 2: Project Creation (PM Role)');
    const projectData = {
      projectId: `TEST-${Date.now()}`,
      name: 'Test Project - Complete Workflow',
      description: 'Testing complete project management workflow',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      version: '1.0.0'
    };

    const project = await makeRequest('post', '/projects', projectData, tokens.pm);
    projectId = project._id;
    console.log(`✅ Project created: ${project.name} (ID: ${project.projectId})`);

    // Phase 3: Add Team Members (PM)
    console.log('\n👥 Phase 3: Add Team Members (PM Role)');
    const membersData = {
      members: [
        { user: 'BA_USER_ID' }, // Replace with actual user IDs
        { user: 'DEV_USER_ID' },
        { user: 'QA_USER_ID' }
      ]
    };

    await makeRequest('put', `/projects/${projectId}`, membersData, tokens.pm);
    console.log('✅ Team members added to project');

    // Phase 4: Create Module (BA)
    console.log('\n📦 Phase 4: Create Module (BA Role)');
    const moduleData = {
      moduleId: `MOD-${Date.now()}`,
      name: 'User Authentication Module',
      description: 'Login, register, password reset functionality',
      status: 'Chưa phát triển',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      owner: 'DEV_USER_ID' // Replace with actual user ID
    };

    const module = await makeRequest('post', '/modules', {
      ...moduleData,
      projectId: projectId
    }, tokens.ba);
    moduleId = module._id;
    console.log(`✅ Module created: ${module.name} (ID: ${module.moduleId})`);

    // Phase 5: Create Release (BA)
    console.log('\n🚀 Phase 5: Create Release (BA Role)');
    const releaseData = {
      releaseId: `REL-${Date.now()}`,
      version: '1.0.0',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Chưa bắt đầu',
      fromUser: 'BA_USER_ID', // Replace with actual user ID
      toUser: 'DEV_USER_ID',
      approver: 'QA_USER_ID',
      moduleId: moduleId
    };

    const release = await makeRequest('post', '/releases', releaseData, tokens.ba);
    releaseId = release._id;
    console.log(`✅ Release created: ${release.version} (ID: ${release.releaseId})`);

    // Phase 6: Create Sprint (PM)
    console.log('\n🏃 Phase 6: Create Sprint (PM Role)');
    const sprintData = {
      name: 'Sprint 1 - Authentication',
      goal: 'Complete user authentication features',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Chưa bắt đầu',
      releaseId: releaseId
    };

    const sprint = await makeRequest('post', `/sprints/by-release/${releaseId}`, sprintData, tokens.pm);
    sprintId = sprint._id;
    console.log(`✅ Sprint created: ${sprint.name}`);

    // Phase 7: Create Task (PM)
    console.log('\n📝 Phase 7: Create Task (PM Role)');
    const taskData = {
      taskId: `TASK-${Date.now()}`,
      name: 'Implement User Login API',
      goal: 'Create login endpoint with JWT authentication',
      status: 'Chưa làm',
      reviewStatus: 'Chưa',
      priority: 'Cao',
      estimatedHours: 8
    };

    const task = await makeRequest('post', '/tasks', {
      ...taskData,
      sprintId: sprintId
    }, tokens.pm);
    taskId = task._id;
    console.log(`✅ Task created: ${task.name} (ID: ${task.taskId})`);

    // Phase 8: Task Execution Workflow
    console.log('\n🔄 Phase 8: Task Execution Workflow');

    // Developer starts task
    console.log('👨‍💻 Developer: Start working on task');
    await makeRequest('put', `/tasks/${taskId}/status`, { status: 'Đang làm' }, tokens.dev);
    console.log('✅ Task status: Chưa làm → Đang làm');

    // Developer completes task
    console.log('👨‍💻 Developer: Complete task');
    await makeRequest('put', `/tasks/${taskId}/status`, { status: 'Đã xong' }, tokens.dev);
    console.log('✅ Task status: Đang làm → Đã xong');

    // QA reviews task - Approve
    console.log('🧪 QA: Review and approve task');
    await makeRequest('put', `/tasks/${taskId}/review-status`, {
      reviewStatus: 'Đạt',
      comment: 'Code quality is good, all tests pass'
    }, tokens.qa);
    console.log('✅ Task review: Đạt');

    // Phase 9: Status Cascade Check
    console.log('\n🔄 Phase 9: Automatic Status Updates');

    // Update module status to "Đang phát triển"
    console.log('📦 Update module status to "Đang phát triển"');
    await makeRequest('put', `/modules/${moduleId}`, { status: 'Đang phát triển' }, tokens.ba);
    console.log('✅ Module status updated - Project should auto-update to "Đang triển khai"');

    // Update module status to "Hoàn thành"
    console.log('📦 Update module status to "Hoàn thành"');
    await makeRequest('put', `/modules/${moduleId}`, { status: 'Hoàn thành' }, tokens.ba);
    console.log('✅ Module status updated - Project should auto-update to "Hoàn thành"');

    console.log('\n🎉 Workflow Test Completed Successfully!');
    console.log('\n📊 Test Summary:');
    console.log(`   Project: ${projectData.name}`);
    console.log(`   Module: ${moduleData.name}`);
    console.log(`   Release: ${releaseData.version}`);
    console.log(`   Sprint: ${sprintData.name}`);
    console.log(`   Task: ${taskData.name}`);
    console.log('\n🔗 Frontend URL:', FRONTEND_URL);
    console.log('   1. Login as PM and view project progress');
    console.log('   2. Login as BA and manage modules/releases');
    console.log('   3. Login as Developer and work on tasks');
    console.log('   4. Login as QA and review tasks');

  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure backend server is running on port 5000');
    console.log('   2. Ensure test users exist in database');
    console.log('   3. Check network connectivity');
    console.log('   4. Verify API endpoints are correct');
  }
}

// Hướng dẫn
console.log('📋 Complete Project Management Workflow Test');
console.log('==========================================');
console.log('');
console.log('This script tests the complete workflow:');
console.log('1. User Authentication');
console.log('2. Project Creation (PM)');
console.log('3. Team Member Management (PM)');
console.log('4. Module Creation (BA)');
console.log('5. Release Creation (BA)');
console.log('6. Sprint Creation (PM)');
console.log('7. Task Creation & Assignment');
console.log('8. Task Execution (Developer → QA Review)');
console.log('9. Automatic Status Updates');
console.log('');
console.log('Prerequisites:');
console.log('- Backend server running on http://localhost:5000');
console.log('- Test users created with roles: PM, BA, Developer, QA Tester');
console.log('- Replace USER_ID placeholders with actual MongoDB ObjectIds');
console.log('');

// Chạy test
if (require.main === module) {
  runTestWorkflow();
}

module.exports = { runTestWorkflow };
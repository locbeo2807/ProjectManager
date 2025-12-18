const request = require('supertest');
const app = require('../src/app');

describe('API Health Check', () => {
  test('GET /healthcheck should return 200', async () => {
    const response = await request(app)
      .get('/healthcheck')
      .expect(200);
    
    expect(response.body.status).toBe('ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
  });

  test('GET / should return welcome message', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('environment');
    expect(response.body).toHaveProperty('timestamp');
  });

  test('GET /api should return API endpoints', async () => {
    const response = await request(app)
      .get('/api')
      .expect(200);
    
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('endpoints');
    expect(response.body.endpoints).toHaveProperty('auth');
    expect(response.body.endpoints).toHaveProperty('users');
    expect(response.body.endpoints).toHaveProperty('projects');
  });
});

const request = require('supertest');
const app = require('../src/app');

describe('API', () => {
  test('GET /api/health returns healthy status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'production-devsecops-platform-backend',
    });
  });

  test('unknown route returns JSON 404', async () => {
    const response = await request(app).get('/api/unknown');

    expect(response.status).toBe(404);
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('Route not found');
  });

  test('malformed JSON returns a client error', async () => {
    const response = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"invalid":');

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('error');
  });
});
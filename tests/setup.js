// Test setup file
require('dotenv').config({ path: '.env.example' });

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-secret-key-for-jwt-tokens';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = '';
process.env.DB_NAME = 'sindhu_crm_test';
process.env.MEDIASOUP_ANNOUNCED_IP = '127.0.0.1';
process.env.MEDIASOUP_MIN_PORT = '40000';
process.env.MEDIASOUP_MAX_PORT = '40100';

// Suppress console output during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

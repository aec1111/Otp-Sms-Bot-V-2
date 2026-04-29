const logger = require('../utils/logger');

describe('Logger', () => {
  test('should be defined', () => {
    expect(logger).toBeDefined();
  });
  
  test('should have info method', () => {
    expect(typeof logger.info).toBe('function');
  });
  
  test('should have error method', () => {
    expect(typeof logger.error).toBe('function');
  });
});
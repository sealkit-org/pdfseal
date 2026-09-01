import { describe, it, expect, beforeEach } from 'vitest';
import { logger, logEntries } from '../src/utils/logger';

describe('Diagnostic Logger', () => {
  beforeEach(() => {
    logger.clear();
  });

  it('should record info, warn, error, and debug entries', () => {
    logger.info('TEST_TAG', 'This is an info message', { count: 1 });
    logger.warn('TEST_TAG', 'This is a warning');
    logger.error('TEST_TAG', 'This is an error');
    logger.debug('TEST_TAG', 'This is debug');

    expect(logEntries.length).toBe(4);
    expect(logEntries[0].level).toBe('DEBUG');
    expect(logEntries[1].level).toBe('ERROR');
    expect(logEntries[2].level).toBe('WARN');
    expect(logEntries[3].level).toBe('INFO');
  });

  it('should format plain text logs correctly', () => {
    logger.info('MERGE', 'Starting merge');
    const text = logger.getPlainText();
    expect(text).toContain('[INFO]');
    expect(text).toContain('[MERGE]');
    expect(text).toContain('Starting merge');
  });

  it('should clear logs when requested', () => {
    logger.info('TEST', 'Msg');
    expect(logEntries.length).toBe(1);
    logger.clear();
    expect(logEntries.length).toBe(0);
  });
});

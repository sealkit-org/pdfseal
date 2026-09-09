import { describe, it, expect, beforeEach } from 'vitest';
import { sanitizeBaseFileName, generateExportFileName } from '../src/utils/filenameUtils';
import { userSettings } from '../src/utils/userSettings';

describe('filenameUtils', () => {
  beforeEach(() => {
    userSettings.defaultExportPrefix = 'PDFSeal';
  });

  describe('sanitizeBaseFileName', () => {
    it('should strip extension from filename', () => {
      expect(sanitizeBaseFileName('Report.pdf')).toBe('Report');
      expect(sanitizeBaseFileName('data.v1.0.pdf')).toBe('data.v1.0');
    });

    it('should strip security and unlocked tags', () => {
      expect(sanitizeBaseFileName('Report_Unlocked.pdf')).toBe('Report');
      expect(sanitizeBaseFileName('Report_unlocked.pdf')).toBe('Report');
      expect(sanitizeBaseFileName('Report-unlocked.pdf')).toBe('Report');
      expect(sanitizeBaseFileName('unlocked_Report.pdf')).toBe('Report');
      expect(sanitizeBaseFileName('Report_Protected.pdf')).toBe('Report');
      expect(sanitizeBaseFileName('Report_需密码.pdf')).toBe('Report');
      expect(sanitizeBaseFileName('Report_已解锁.pdf')).toBe('Report');
      expect(sanitizeBaseFileName('Report_已加密.pdf')).toBe('Report');
      expect(sanitizeBaseFileName('unlocked.pdf')).toBe('Document');
    });

    it('should strip default export prefix when stripping prefix', () => {
      expect(sanitizeBaseFileName('PDFSeal_Report.pdf')).toBe('Report');
      expect(sanitizeBaseFileName('PDFSeal-Report.pdf')).toBe('Report');
      expect(sanitizeBaseFileName('PDFSeal_Unlocked_Report.pdf')).toBe('Report');
      expect(sanitizeBaseFileName('PDFSeal_Protected_Report.pdf')).toBe('Report');
    });

    it('should preserve prefix if prefix is explicitly empty', () => {
      expect(sanitizeBaseFileName('PDFSeal_Report.pdf', { prefix: '' })).toBe('PDFSeal_Report');
      expect(sanitizeBaseFileName('PDFSeal_Unlocked_Report.pdf', { prefix: '' })).toBe('PDFSeal_Report');
    });

    it('should handle null/empty filename gracefully', () => {
      expect(sanitizeBaseFileName('')).toBe('Document');
      expect(sanitizeBaseFileName(null)).toBe('Document');
      expect(sanitizeBaseFileName(undefined)).toBe('Document');
    });
  });

  describe('generateExportFileName', () => {
    it('should NOT include unlocked or Unlocked in export name for unlock operations', () => {
      const output = generateExportFileName('Contract.pdf', '');
      expect(output).not.toMatch(/unlocked/i);
      expect(output).toBe('PDFSeal_Contract');
    });

    it('should clean existing security tags when unlocking', () => {
      expect(generateExportFileName('Contract_Unlocked.pdf', '')).toBe('PDFSeal_Contract');
      expect(generateExportFileName('PDFSeal_Protected_Contract.pdf', '')).toBe('PDFSeal_Contract');
      expect(generateExportFileName('Statement_需密码.pdf', '')).toBe('PDFSeal_Statement');
    });

    it('should generate formatted action names without duplicate prefix chaining', () => {
      expect(generateExportFileName('Contract.pdf', 'Watermarked')).toBe('PDFSeal_Watermarked_Contract');
      expect(generateExportFileName('PDFSeal_Contract.pdf', 'Watermarked')).toBe('PDFSeal_Watermarked_Contract');
      expect(generateExportFileName('PDFSeal_Watermarked_Contract.pdf', 'Protected')).toBe('PDFSeal_Protected_Watermarked_Contract');
      expect(generateExportFileName('PDFSeal_Watermarked_PDFSeal_Clean_PDFSeal_Unlocked.pdf', 'Split')).toBe('PDFSeal_Split_Watermarked_Clean');
    });

    it('should respect custom or empty userSettings prefix', () => {
      userSettings.defaultExportPrefix = '';
      expect(generateExportFileName('Contract.pdf', '')).toBe('Contract');
      expect(generateExportFileName('Contract_Protected.pdf', '')).toBe('Contract');
      expect(generateExportFileName('Contract.pdf', 'Watermarked')).toBe('Watermarked_Contract');

      userSettings.defaultExportPrefix = 'MyCompany';
      expect(generateExportFileName('Contract.pdf', '')).toBe('MyCompany_Contract');
      expect(generateExportFileName('Contract.pdf', 'Watermarked')).toBe('MyCompany_Watermarked_Contract');
    });
  });
});

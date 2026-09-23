import { describe, it, expect } from 'vitest';
import { 
  resolveNextActions, 
  isZipDeliverable, 
  formatFileSize, 
  ACTION_CATALOG 
} from '../src/utils/workflowStrategy';

describe('Workflow Strategy Engine (智能情境推荐引擎)', () => {
  it('should correctly format file sizes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(10 * 1024 * 1024)).toBe('10 MB');
    expect(formatFileSize(15.5 * 1024 * 1024)).toBe('15.5 MB');
  });

  it('should detect ZIP deliverables correctly', () => {
    expect(isZipDeliverable({ name: 'archive.zip' })).toBe(true);
    expect(isZipDeliverable({ name: 'ARCHIVE.ZIP' })).toBe(true);
    expect(isZipDeliverable({ isZip: true, name: 'bundle' })).toBe(true);
    expect(isZipDeliverable({ name: 'document.pdf' })).toBe(false);
    expect(isZipDeliverable(null)).toBe(false);
  });

  it('should suppress relay banner completely for ZIP deliverables (clean delivery view)', () => {
    const zipDeliverable = {
      name: 'extracted_images.zip',
      size: 5 * 1024 * 1024,
      isZip: true
    };

    const result = resolveNextActions('pdf_to_image', zipDeliverable);
    expect(result.canRelay).toBe(false);
    expect(result.isZip).toBe(true);
    expect(result.heroAction).toBeNull();
    expect(result.secondaryActions).toEqual([]);

    const splitZip = {
      name: 'split_pages.zip',
      size: 2 * 1024 * 1024,
      isZip: true
    };
    const splitResult = resolveNextActions('split', splitZip);
    expect(splitResult.canRelay).toBe(false);
    expect(splitResult.isZip).toBe(true);
  });

  it('should trigger oversized compression Hero recommendation when file >= 10MB', () => {
    const largePdf = {
      name: 'merged_big_contract.pdf',
      size: 14.8 * 1024 * 1024, // 14.8 MB
      isZip: false
    };

    const result = resolveNextActions('merge', largePdf);
    expect(result.canRelay).toBe(true);
    expect(result.isZip).toBe(false);
    expect(result.heroAction.id).toBe('compress');
    expect(result.heroAction.badgeKey).toBe('next_action_badge_oversized');
    expect(result.heroAction.badgeParams).toEqual({ size: '14.8 MB' });
    expect(result.heroAction.ctaKey).toBe('next_action_cta_compress');

    // Secondary actions should not contain compress itself or merge
    const secondaryIds = result.secondaryActions.map(a => a.id);
    expect(secondaryIds).not.toContain('compress');
    expect(secondaryIds).not.toContain('merge');
    expect(secondaryIds).toEqual(['page_number', 'organize', 'sign']);
  });

  it('should not recommend compress to itself even if compressed file is still > 10MB', () => {
    const largeCompressedPdf = {
      name: 'compressed_document.pdf',
      size: 12 * 1024 * 1024, // 12 MB
      isZip: false
    };

    const result = resolveNextActions('compress', largeCompressedPdf);
    expect(result.heroAction.id).not.toBe('compress');
  });

  it('should recommend Page Number as Hero for normal-sized Merge files (<= 10MB) with clean secondary actions', () => {
    const mergedPdf = {
      name: 'agreement_merged.pdf',
      size: 3.5 * 1024 * 1024
    };

    const result = resolveNextActions('merge', mergedPdf);
    expect(result.heroAction.id).toBe('page_number');
    expect(result.heroAction.ctaKey).toBe('next_action_cta_page_number');
    expect(result.heroAction.descKey).toBe('next_action_desc_merge_paginated');

    // Secondary actions should be organize, sign, compress (strictly omitting protect)
    const secondaryIds = result.secondaryActions.map(a => a.id);
    expect(secondaryIds).toEqual(['organize', 'sign', 'compress']);
    expect(secondaryIds).not.toContain('protect');
  });

  it('should recommend Protect (with signed badge) after Sign tool', () => {
    const signedPdf = {
      name: 'contract_signed.pdf',
      size: 1.5 * 1024 * 1024
    };

    const result = resolveNextActions('sign', signedPdf);
    expect(result.heroAction.id).toBe('protect');
    expect(result.heroAction.badgeKey).toBe('next_action_badge_signed');
    expect(result.heroAction.ctaKey).toBe('next_action_cta_protect');
    expect(result.secondaryActions.map(a => a.id)).not.toContain('sign');
  });

  it('should recommend Sanitize (metadata strip) after Redact tool', () => {
    const redactedPdf = {
      name: 'redacted_statement.pdf',
      size: 800 * 1024
    };

    const result = resolveNextActions('redact', redactedPdf);
    expect(result.heroAction.id).toBe('sanitize');
    expect(result.heroAction.badgeKey).toBe('next_action_badge_privacy');
    expect(result.heroAction.ctaKey).toBe('next_action_cta_sanitize');
    expect(result.secondaryActions.map(a => a.id)).not.toContain('redact');
  });

  it('should recommend Organize (page management) after Unlock tool', () => {
    const unlockedPdf = {
      name: 'unlocked_bank_statement.pdf',
      size: 1.2 * 1024 * 1024
    };

    const result = resolveNextActions('unlock', unlockedPdf);
    expect(result.heroAction.id).toBe('organize');
    expect(result.heroAction.badgeKey).toBe('next_action_badge_unlocked');
    expect(result.heroAction.ctaKey).toBe('next_action_cta_organize');
  });

  it('should recommend Page Number after ImageToPdf tool', () => {
    const newPdf = {
      name: 'photos_compiled.pdf',
      size: 2.1 * 1024 * 1024
    };

    const result = resolveNextActions('image_to_pdf', newPdf);
    expect(result.heroAction.id).toBe('page_number');
    expect(result.heroAction.badgeKey).toBe('next_action_badge_new_doc');
    expect(result.heroAction.ctaKey).toBe('next_action_cta_page_number');
  });

  it('should recommend Watermark after PageNumber tool', () => {
    const paginatedPdf = {
      name: 'catalog_numbered.pdf',
      size: 1.8 * 1024 * 1024
    };

    const result = resolveNextActions('page_number', paginatedPdf);
    expect(result.heroAction.id).toBe('watermark');
    expect(result.heroAction.badgeKey).toBe('next_action_badge_paginated');
    expect(result.heroAction.ctaKey).toBe('next_action_cta_watermark');
  });

  it('should ensure all action catalog entries have required fields', () => {
    for (const [key, item] of Object.entries(ACTION_CATALOG)) {
      expect(item.id).toBe(key);
      expect(item.labelKey).toBeDefined();
      expect(item.icon).toBeDefined();
      expect(item.color).toBeDefined();
      expect(item.heroColor).toBeDefined();
    }
  });
});

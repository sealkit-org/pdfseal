import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { executeSplitNode, parseRangeExpression } from '../src/utils/pipeline/nodes/splitNode';

describe('PDF Split & Extract Utility Engine', () => {
  async function createSampleDoc(pageCount = 6) {
    const doc = await PDFDocument.create();
    for (let i = 0; i < pageCount; i++) {
      doc.addPage([200, 300]);
    }
    return await doc.save();
  }

  describe('parseRangeExpression', () => {
    it('should parse ranges, individual pages, and last keyword correctly', () => {
      expect(parseRangeExpression('1-3, 5, 8', 10)).toEqual([0, 1, 2, 4, 7]);
      expect(parseRangeExpression('last', 6)).toEqual([5]);
      expect(parseRangeExpression('2-last', 5)).toEqual([1, 2, 3, 4]);
      expect(parseRangeExpression('', 4)).toEqual([0, 1, 2, 3]);
    });
  });

  describe('executeSplitNode Modes', () => {
    it('Mode 1: extract_range - should extract range and merge into 1 document', async () => {
      const data = await createSampleDoc(6);
      const items = [{ id: 'doc1', name: 'Contract.pdf', data }];

      const results = await executeSplitNode(items, { mode: 'extract_range', rangeExpr: '2, 4-5' });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Contract_Extracted.pdf');
      expect(results[0].pageCount).toBe(3);

      const parsed = await PDFDocument.load(results[0].data);
      expect(parsed.getPageCount()).toBe(3);
    });

    it('Mode 1 (Separate): extract_separate - should extract range into separate documents', async () => {
      const data = await createSampleDoc(6);
      const items = [{ id: 'doc1', name: 'Invoice.pdf', data }];

      const results = await executeSplitNode(items, { mode: 'extract_separate', rangeExpr: '1, 3' });
      expect(results.length).toBe(2);
      expect(results[0].name).toBe('Invoice_Page_1.pdf');
      expect(results[1].name).toBe('Invoice_Page_3.pdf');
      expect(results[0].pageCount).toBe(1);
      expect(results[1].pageCount).toBe(1);
    });

    it('Mode 2: burst - should split all pages into separate 1-page documents', async () => {
      const data = await createSampleDoc(4);
      const items = [{ id: 'doc1', name: 'Bundle.pdf', data }];

      const results = await executeSplitNode(items, { mode: 'burst' });
      expect(results.length).toBe(4);
      expect(results[0].name).toBe('Bundle_Page_1.pdf');
      expect(results[1].name).toBe('Bundle_Page_2.pdf');
      expect(results[2].name).toBe('Bundle_Page_3.pdf');
      expect(results[3].name).toBe('Bundle_Page_4.pdf');
      expect(results.every(r => r.pageCount === 1)).toBe(true);
    });

    it('Mode 3: interval - should split into chunks of N pages', async () => {
      const data = await createSampleDoc(5);
      const items = [{ id: 'doc1', name: 'Records.pdf', data }];

      // Every 2 pages: 5 pages -> [1-2], [3-4], [5] = 3 files
      const results = await executeSplitNode(items, { mode: 'interval', interval: 2 });
      expect(results.length).toBe(3);
      expect(results[0].name).toBe('Records_Part_1.pdf');
      expect(results[0].pageCount).toBe(2);
      expect(results[1].name).toBe('Records_Part_2.pdf');
      expect(results[1].pageCount).toBe(2);
      expect(results[2].name).toBe('Records_Part_3.pdf');
      expect(results[2].pageCount).toBe(1);
    });

    it('Mode 4: multi_range - should split by multiple custom ranges', async () => {
      const data = await createSampleDoc(6);
      const items = [{ id: 'doc1', name: 'Report.pdf', data }];

      const ranges = [
        { from: 1, to: 2 },
        { from: 3, to: 4 },
        { from: 5, to: 6 }
      ];
      const results = await executeSplitNode(items, { mode: 'multi_range', ranges });
      expect(results.length).toBe(3);
      expect(results[0].name).toBe('Report_Range_1.pdf');
      expect(results[0].pageCount).toBe(2);
      expect(results[1].name).toBe('Report_Range_2.pdf');
      expect(results[1].pageCount).toBe(2);
      expect(results[2].name).toBe('Report_Range_3.pdf');
      expect(results[2].pageCount).toBe(2);
    });
  });
});

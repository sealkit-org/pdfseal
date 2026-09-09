import { describe, it, expect, beforeEach } from 'vitest';
import { dispatchToTool, consumePendingFile, clearPendingFile, pendingToolFile } from '../src/utils/toolBridge';

describe('Tool Bridge In-Memory Bus', () => {
  beforeEach(() => {
    clearPendingFile();
  });

  it('should dispatch an ArrayBuffer and consume it in target tool', () => {
    const rawBuffer = new Uint8Array([1, 2, 3, 4]).buffer;
    dispatchToTool('compress', {
      name: 'test.pdf',
      arrayBuffer: rawBuffer,
      size: 4,
      password: 'secret_pwd'
    });

    expect(pendingToolFile.value).not.toBeNull();
    expect(pendingToolFile.value.targetTool).toBe('compress');

    // Wrong tool should not consume
    const wrong = consumePendingFile('sign');
    expect(wrong).toBeNull();
    expect(pendingToolFile.value).not.toBeNull();

    // Correct tool consumes and resets bus
    const consumed = consumePendingFile('compress');
    expect(consumed).not.toBeNull();
    expect(consumed.name).toBe('test.pdf');
    expect(consumed.password).toBe('secret_pwd');
    expect(consumed.arrayBuffer).toBe(rawBuffer);

    // Second consumption is null (reset)
    expect(consumePendingFile('compress')).toBeNull();
    expect(pendingToolFile.value).toBeNull();
  });

  it('should normalize Uint8Array data input into clean ArrayBuffer', () => {
    const u8 = new Uint8Array([10, 20, 30, 40, 50]);
    dispatchToTool('watermark', {
      name: 'invoice.pdf',
      data: u8
    });

    const consumed = consumePendingFile('watermark');
    expect(consumed).not.toBeNull();
    expect(consumed.arrayBuffer instanceof ArrayBuffer).toBe(true);
    expect(new Uint8Array(consumed.arrayBuffer)).toEqual(u8);
    expect(consumed.size).toBe(5);
  });

  it('should support manual clearing', () => {
    dispatchToTool('sign', { name: 'contract.pdf' });
    expect(pendingToolFile.value).not.toBeNull();
    clearPendingFile();
    expect(pendingToolFile.value).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import {
  parseCompressQueryParams,
  parseWatermarkQueryParams,
  parseProtectQueryParams,
  parsePageNumberQueryParams,
  parseSplitQueryParams
} from '../src/utils/toolQueryParams.js';

describe('toolQueryParams', () => {
  describe('parseCompressQueryParams', () => {
    it('returns empty object when query is null/undefined or empty', () => {
      expect(parseCompressQueryParams(null)).toEqual({});
      expect(parseCompressQueryParams(undefined)).toEqual({});
      expect(parseCompressQueryParams({})).toEqual({});
    });

    it('parses target size via ?target parameter', () => {
      const res = parseCompressQueryParams({ target: '2.0' });
      expect(res).toEqual({
        targetSizeMb: 2,
        selectedLevel: 'target'
      });
    });

    it('parses target size via ?mb parameter alias', () => {
      const res = parseCompressQueryParams({ mb: '0.95' });
      expect(res).toEqual({
        targetSizeMb: 0.95,
        selectedLevel: 'target'
      });
    });

    it('ignores invalid or out-of-range target values', () => {
      expect(parseCompressQueryParams({ target: '0' })).toEqual({});
      expect(parseCompressQueryParams({ target: '-5' })).toEqual({});
      expect(parseCompressQueryParams({ target: '101' })).toEqual({});
      expect(parseCompressQueryParams({ target: 'abc' })).toEqual({});
    });

    it('parses compression level via ?level parameter', () => {
      expect(parseCompressQueryParams({ level: 'extreme' })).toEqual({ selectedLevel: 'extreme' });
      expect(parseCompressQueryParams({ level: 'balanced' })).toEqual({ selectedLevel: 'balanced' });
      expect(parseCompressQueryParams({ level: 'lossless' })).toEqual({ selectedLevel: 'lossless' });
      expect(parseCompressQueryParams({ level: 'invalid' })).toEqual({});
    });

    it('respects explicit level over target if level is explicitly specified after target', () => {
      const res = parseCompressQueryParams({ target: '2.0', level: 'extreme' });
      expect(res).toEqual({
        targetSizeMb: 2,
        selectedLevel: 'extreme'
      });
    });
  });

  describe('parseWatermarkQueryParams', () => {
    it('returns empty object when query is null or empty', () => {
      expect(parseWatermarkQueryParams(null)).toEqual({});
      expect(parseWatermarkQueryParams({})).toEqual({});
    });

    it('parses text parameter via ?text or ?wm', () => {
      expect(parseWatermarkQueryParams({ text: 'CONFIDENTIAL' })).toEqual({ wmText: 'CONFIDENTIAL' });
      expect(parseWatermarkQueryParams({ wm: 'SAMPLE DRAFT' })).toEqual({ wmText: 'SAMPLE DRAFT' });
      expect(parseWatermarkQueryParams({ text: '   ' })).toEqual({});
    });

    it('parses opacity in 0-1 and 0-100 range', () => {
      expect(parseWatermarkQueryParams({ opacity: '0.25' })).toEqual({ wmOpacity: 25 });
      expect(parseWatermarkQueryParams({ opacity: '40' })).toEqual({ wmOpacity: 40 });
      expect(parseWatermarkQueryParams({ opacity: '1' })).toEqual({ wmOpacity: 100 });
      expect(parseWatermarkQueryParams({ opacity: '150' })).toEqual({});
      expect(parseWatermarkQueryParams({ opacity: '-10' })).toEqual({});
    });

    it('parses hex color with or without #', () => {
      expect(parseWatermarkQueryParams({ color: '2563eb' })).toEqual({ wmColor: '#2563eb' });
      expect(parseWatermarkQueryParams({ color: '#dc2626' })).toEqual({ wmColor: '#dc2626' });
      expect(parseWatermarkQueryParams({ color: 'invalid' })).toEqual({});
    });

    it('parses rotation angle between -90 and 90', () => {
      expect(parseWatermarkQueryParams({ angle: '-45' })).toEqual({ wmAngle: -45 });
      expect(parseWatermarkQueryParams({ angle: '0' })).toEqual({ wmAngle: 0 });
      expect(parseWatermarkQueryParams({ angle: '90' })).toEqual({ wmAngle: 90 });
      expect(parseWatermarkQueryParams({ angle: '120' })).toEqual({});
    });
  });

  describe('parseProtectQueryParams', () => {
    it('returns empty object when query is null or empty', () => {
      expect(parseProtectQueryParams(null)).toEqual({});
      expect(parseProtectQueryParams({})).toEqual({});
    });

    it('parses preset modes correctly', () => {
      expect(parseProtectQueryParams({ preset: 'readonly' })).toEqual({ activePreset: 'readonly' });
      expect(parseProtectQueryParams({ mode: 'permission' })).toEqual({ activePreset: 'readonly' });
      expect(parseProtectQueryParams({ preset: 'confidential' })).toEqual({ activePreset: 'confidential' });
      expect(parseProtectQueryParams({ mode: 'encrypt' })).toEqual({ activePreset: 'confidential' });
      expect(parseProtectQueryParams({ preset: 'printonly' })).toEqual({ activePreset: 'printonly' });
      expect(parseProtectQueryParams({ mode: 'print' })).toEqual({ activePreset: 'printonly' });
      expect(parseProtectQueryParams({ preset: 'unknown' })).toEqual({});
    });

    it('parses algorithm specification', () => {
      expect(parseProtectQueryParams({ algo: 'AES-256' })).toEqual({ algorithm: 'AES-256' });
      expect(parseProtectQueryParams({ algo: 'RC4' })).toEqual({ algorithm: 'RC4' });
      expect(parseProtectQueryParams({ algo: 'DES' })).toEqual({});
    });
  });

  describe('parsePageNumberQueryParams', () => {
    it('returns empty object when query is null or empty', () => {
      expect(parsePageNumberQueryParams(null)).toEqual({});
      expect(parsePageNumberQueryParams({})).toEqual({});
    });

    it('parses positions correctly', () => {
      expect(parsePageNumberQueryParams({ pos: 'bottom_center' })).toEqual({ pnPosition: 'bottom_center' });
      expect(parsePageNumberQueryParams({ position: 'top_right' })).toEqual({ pnPosition: 'top_right' });
      expect(parsePageNumberQueryParams({ pos: 'invalid_pos' })).toEqual({});
    });

    it('parses starting page number', () => {
      expect(parsePageNumberQueryParams({ start: '1' })).toEqual({ pnStartNumber: 1 });
      expect(parsePageNumberQueryParams({ start: '10' })).toEqual({ pnStartNumber: 10 });
      expect(parsePageNumberQueryParams({ start: '0' })).toEqual({});
      expect(parsePageNumberQueryParams({ start: '-5' })).toEqual({});
    });

    it('parses skip cover flag', () => {
      expect(parsePageNumberQueryParams({ skip_cover: '1' })).toEqual({ pnSkipCover: true });
      expect(parsePageNumberQueryParams({ skip_cover: 'true' })).toEqual({ pnSkipCover: true });
      expect(parsePageNumberQueryParams({ skip_cover: '0' })).toEqual({});
    });
  });

  describe('parseSplitQueryParams', () => {
    it('returns empty object when query is null or empty', () => {
      expect(parseSplitQueryParams(null)).toEqual({});
      expect(parseSplitQueryParams({})).toEqual({});
    });

    it('parses split mode', () => {
      expect(parseSplitQueryParams({ mode: 'extract' })).toEqual({ activeMode: 'extract' });
      expect(parseSplitQueryParams({ mode: 'burst' })).toEqual({ activeMode: 'burst' });
      expect(parseSplitQueryParams({ mode: 'interval' })).toEqual({ activeMode: 'interval' });
      expect(parseSplitQueryParams({ mode: 'multi_range' })).toEqual({ activeMode: 'multi_range' });
      expect(parseSplitQueryParams({ mode: 'invalid' })).toEqual({});
    });

    it('parses page range and auto sets mode to extract', () => {
      expect(parseSplitQueryParams({ range: '1-5,8' })).toEqual({
        rangeInput: '1-5,8',
        activeMode: 'extract'
      });
    });

    it('parses interval and auto sets mode to interval', () => {
      expect(parseSplitQueryParams({ interval: '2' })).toEqual({
        intervalCount: 2,
        activeMode: 'interval'
      });
      expect(parseSplitQueryParams({ interval: '0' })).toEqual({});
      expect(parseSplitQueryParams({ interval: '-3' })).toEqual({});
    });
  });
});

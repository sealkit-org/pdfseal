import { describe, it, expect } from 'vitest';
import en from '../src/locales/en.json';
import zh from '../src/locales/zh.json';
import de from '../src/locales/de.json';
import es from '../src/locales/es.json';
import fr from '../src/locales/fr.json';

describe('i18n Multi-Language Dictionary Consistency', () => {
  const masterKeys = Object.keys(en);

  it('en.json should have translation keys', () => {
    expect(masterKeys.length).toBeGreaterThan(30);
  });

  it('zh.json should match 100% of master translation keys', () => {
    const zhKeys = Object.keys(zh);
    const missingInZh = masterKeys.filter(k => !zhKeys.includes(k));
    expect(missingInZh).toEqual([]);
  });

  it('de.json should match 100% of master translation keys', () => {
    const deKeys = Object.keys(de);
    const missingInDe = masterKeys.filter(k => !deKeys.includes(k));
    expect(missingInDe).toEqual([]);
  });

  it('es.json should match 100% of master translation keys', () => {
    const esKeys = Object.keys(es);
    const missingInEs = masterKeys.filter(k => !esKeys.includes(k));
    expect(missingInEs).toEqual([]);
  });

  it('fr.json should match 100% of master translation keys', () => {
    const frKeys = Object.keys(fr);
    const missingInFr = masterKeys.filter(k => !frKeys.includes(k));
    expect(missingInFr).toEqual([]);
  });

  it('should interpolate {param} variables correctly in t()', async () => {
    const { t, setLanguage } = await import('../src/i18n.js');
    setLanguage('en');
    expect(t('pipeline_slot_free', { count: 0 })).toBe('Flows: 0/3');
    expect(t('pipeline_slot_free', { count: 2 })).toBe('Flows: 2/3');
    setLanguage('zh');
    expect(t('pipeline_slot_free', { count: 1 })).toBe('自定义流程: 1/3');
  });
});

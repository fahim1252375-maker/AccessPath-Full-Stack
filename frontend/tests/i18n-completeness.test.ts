import { describe, expect, it } from 'vitest';
import i18n from '../src/i18n/index.ts';

type Dictionary = Record<string, unknown>;

function flattenKeys(value: Dictionary, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const current = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      return flattenKeys(child as Dictionary, current);
    }
    return [current];
  });
}

describe('Bilingual translation completeness', () => {
  it('keeps English and Bengali translation key structures in sync', () => {
    const english = i18n.getResourceBundle('en', 'translation') as Dictionary;
    const bengali = i18n.getResourceBundle('bn', 'translation') as Dictionary;
    const enKeys = flattenKeys(english);
    const bnKeys = new Set(flattenKeys(bengali));
    const missingInBengali = enKeys.filter((key) => !bnKeys.has(key));
    const enSet = new Set(enKeys);
    const missingInEnglish = [...bnKeys].filter((key) => !enSet.has(key));

    expect({ missingInBengali, missingInEnglish }).toEqual({
      missingInBengali: [],
      missingInEnglish: [],
    });
  });
});

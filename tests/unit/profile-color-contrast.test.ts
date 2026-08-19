import { describe, expect, it } from 'vitest';
import { profileAccessibleColors } from '@/features/profile/profile-colors';

describe('profile accessible color roles', () => {
  it('keeps small accent text and focus indicators above their WCAG contrast floors', () => {
    expect(contrast(profileAccessibleColors.accentOnLight, profileAccessibleColors.lightCanvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(profileAccessibleColors.focusOnLight, profileAccessibleColors.lightCanvas)).toBeGreaterThanOrEqual(3);
    expect(contrast(profileAccessibleColors.focusOnDark, profileAccessibleColors.darkCanvas)).toBeGreaterThanOrEqual(3);
  });
});

function contrast(first: string, second: string) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function luminance(hex: string) {
  const channels = hex.match(/[a-f\d]{2}/gi)?.map((value) => Number.parseInt(value, 16) / 255) ?? [];
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const homeFilmCss = readFileSync(
  resolve('src/features/home/featured-destinations.module.css'),
  'utf8',
);

it('keeps previous and next controls at least 44px in both dimensions', () => {
  const controlRule = /\.filmControls button\s*\{([^}]*)\}/.exec(homeFilmCss)?.[1] ?? '';
  const width = Number(/width:\s*(\d+)px/.exec(controlRule)?.[1]);
  const height = Number(/height:\s*(\d+)px/.exec(controlRule)?.[1]);

  expect(width).toBeGreaterThanOrEqual(44);
  expect(height).toBeGreaterThanOrEqual(44);
});

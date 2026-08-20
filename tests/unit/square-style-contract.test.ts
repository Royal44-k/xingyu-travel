import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const squareCss = readFileSync(resolve('src/features/square/square.module.css'), 'utf8');

it('keeps the search focus ring visible without shifting the filter layout', () => {
  expect(squareCss).toMatch(
    /\.searchInputWrap:focus-within\s*\{[^}]*outline:\s*2px solid var\(--pine\);[^}]*outline-offset:\s*2px;/,
  );
});

it('reserves horizontal touch handling for the main frame and native scrolling for thumbnails', () => {
  expect(squareCss).toMatch(/\.galleryFrame\s*\{[^}]*touch-action:\s*pan-y pinch-zoom;/);
  expect(squareCss).toMatch(
    /\.galleryThumbnails\s*\{[^}]*overflow-x:\s*auto;[^}]*touch-action:\s*pan-x pan-y pinch-zoom;/,
  );
  expect(squareCss).toMatch(
    /@media \(max-width:\s*640px\)[^{]*\{[\s\S]*?\.galleryThumbnails\s*\{[^}]*grid-auto-columns:\s*92px;/,
  );
});

import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import HomePage from '@/app/page';

it('renders the Xingyu brand promise', () => {
  render(<HomePage />);

  expect(
    screen.getByRole('heading', {
      name: '把远方，变成一段安心抵达的旅程',
    }),
  ).toBeInTheDocument();
});

it('keeps the site banner outside the main content landmark', () => {
  render(<HomePage />);

  const banner = screen.getByRole('banner');
  const main = screen.getByRole('main');

  expect(main).not.toContainElement(banner);
});

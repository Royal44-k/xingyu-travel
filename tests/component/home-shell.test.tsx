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

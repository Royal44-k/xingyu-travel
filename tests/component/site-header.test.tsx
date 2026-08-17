import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { SiteHeader } from '@/components/site-header';

it('renders usable primary navigation with the homepage marked current', () => {
  render(<SiteHeader activePath="/" />);

  expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '行屿 XINGYU' })).toHaveAttribute(
    'href',
    '/',
  );
  expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(screen.getByRole('link', { name: '真实比价' })).toHaveAttribute(
    'href',
    '/compare',
  );
  expect(screen.getByRole('link', { name: '灵感广场' })).toHaveAttribute(
    'href',
    '/square',
  );
  expect(screen.getByRole('link', { name: '寻找搭子' })).toHaveAttribute(
    'href',
    '/partners',
  );
  expect(screen.getByRole('link', { name: '行程守护' })).toHaveAttribute(
    'href',
    '/guardian/dali-slow-5d',
  );
  expect(screen.getByRole('link', { name: '我的行程' })).toHaveAttribute(
    'href',
    '/trips/demo',
  );
});

it('marks only the matching route as current', () => {
  render(<SiteHeader activePath="/partners" />);

  expect(screen.getByRole('link', { name: '寻找搭子' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(screen.getByRole('link', { name: '首页' })).not.toHaveAttribute(
    'aria-current',
  );
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import {
  buildComparisonHref,
  SearchComposer,
} from '@/features/home/search-composer';

it('exposes the flight search as the selected accessible tab by default', () => {
  render(<SearchComposer onSubmit={vi.fn()} />);

  expect(screen.getByRole('tablist', { name: '比价类型' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: '机票' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(screen.getByLabelText('到达地')).toHaveValue('大理');
  expect(screen.getByLabelText('出发日期')).toHaveValue('2026-08-22');
  expect(screen.getByLabelText('返程日期')).toHaveValue('2026-08-27');
  expect(screen.getByLabelText('乘机人')).toHaveValue('2');
});

it('changes product-specific field labels when a different tab is selected', async () => {
  const user = userEvent.setup();
  render(<SearchComposer onSubmit={vi.fn()} />);

  await user.click(screen.getByRole('tab', { name: '酒店' }));
  expect(screen.getByLabelText('入住地')).toBeInTheDocument();
  expect(screen.getByLabelText('入住日期')).toBeInTheDocument();
  expect(screen.getByLabelText('退房日期')).toBeInTheDocument();
  expect(screen.getByLabelText('住客')).toBeInTheDocument();

  await user.click(screen.getByRole('tab', { name: '门票' }));
  expect(screen.getByLabelText('游玩地')).toBeInTheDocument();
  expect(screen.getByLabelText('游玩日期')).toBeInTheDocument();
  expect(screen.queryByLabelText('返程日期')).not.toBeInTheDocument();
  expect(screen.getByLabelText('游客')).toBeInTheDocument();
});

it('supports arrow-key movement between search tabs', async () => {
  const user = userEvent.setup();
  render(<SearchComposer onSubmit={vi.fn()} />);

  const flightTab = screen.getByRole('tab', { name: '机票' });
  flightTab.focus();
  await user.keyboard('{ArrowRight}');

  expect(screen.getByRole('tab', { name: '酒店' })).toHaveFocus();
  expect(screen.getByRole('tab', { name: '酒店' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

it('submits the active product kind and edited destination', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<SearchComposer onSubmit={onSubmit} />);

  await user.click(screen.getByRole('tab', { name: '酒店' }));
  const destination = screen.getByLabelText('入住地');
  await user.clear(destination);
  await user.type(destination, '大理古城');
  await user.click(screen.getByRole('button', { name: '开始规划' }));

  expect(onSubmit).toHaveBeenCalledWith({
    kind: 'hotel',
    destination: '大理古城',
    from: '2026-08-22',
    to: '2026-08-27',
    travelers: 2,
  });
});

it('builds the exact encoded comparison route used by default submission', () => {
  expect(
    buildComparisonHref({
      kind: 'flight',
      destination: '大理',
      from: '2026-08-22',
      to: '2026-08-27',
      travelers: 2,
    }),
  ).toBe(
    '/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2',
  );
});

it('uses the default submission path to assign the encoded comparison URL', async () => {
  const user = userEvent.setup();
  const assignLocation = vi.fn();
  render(<SearchComposer assignLocation={assignLocation} />);

  await user.click(screen.getByRole('button', { name: '开始规划' }));

  expect(assignLocation).toHaveBeenCalledOnce();
  expect(assignLocation).toHaveBeenCalledWith(
    '/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2',
  );
});

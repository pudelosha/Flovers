import React from 'react';
import { render } from '@testing-library/react-native';
import TaskTile from '../TaskTile';
import { ThemeContext } from '../../../../shared/theme/ThemeContext';
import { LIGHT_COLORS } from '../../../../shared/theme/palette';
import type { Task } from '../../types/home.types';

it('preserves the red overdue pulse in light mode and removes it when no longer overdue', () => {
  jest.useFakeTimers();
  const task: Task = { id: '1', plant: 'Fern', location: 'Bedroom', type: 'watering', due: 'Overdue', dueDiffDays: -1, dueDate: new Date('2026-11-07') };
  const callbacks = { isMenuOpen: false, onToggleMenu: jest.fn(), onMarkComplete: jest.fn(), onEdit: jest.fn(), onGoToPlant: jest.fn() };
  const tile = (overdue: boolean) => <ThemeContext.Provider value={{ isLight: true, colors: LIGHT_COLORS }}>
    <TaskTile compact task={{ ...task, dueDiffDays: overdue ? -1 : 0 }} {...callbacks} />
  </ThemeContext.Provider>;
  const view = render(tile(true));
  expect(view.getByTestId('overdue-task-pulse').props.colors).toEqual([
    'rgba(255, 59, 48, 0.55)', 'rgba(255, 59, 48, 0.18)', 'rgba(255, 59, 48, 0.00)',
  ]);
  view.rerender(tile(false));
  expect(view.queryByTestId('overdue-task-pulse')).toBeNull();
  view.unmount();
  jest.useRealTimers();
});

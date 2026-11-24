import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';
import InboxModals from '../InboxModals';
import AppModalFrame from '../../../../shared/ui/AppModalFrame';

it.each([
  { mode: 'sort' as const, single: false },
  { mode: 'filter' as const, single: false },
  { mode: 'delete' as const, single: true },
  { mode: 'delete' as const, single: false },
])('uses shared modal alignment for $mode (single: $single)', ({ mode, single }) => {
  const close = jest.fn();
  const view = render(<InboxModals mode={mode} single={single} busy={false} query={{ sort: 'date', direction: 'desc' }} onClose={close} onApply={jest.fn()} onDelete={jest.fn()} />);
  expect(view.UNSAFE_getByType(AppModalFrame).props.centerContent).toBe(true);
  expect(StyleSheet.flatten(view.getByTestId('inbox-modal-fields').props.style).marginHorizontal).toBe(16);
  const actions = view.getByTestId('inbox-modal-actions');
  expect(StyleSheet.flatten(actions.props.style).justifyContent).toBe('flex-end');
  const scroll = view.UNSAFE_getByType(ScrollView);
  expect(StyleSheet.flatten(scroll.props.contentContainerStyle).flexGrow).toBe(1);
  expect(within(scroll).queryByTestId('app-modal-close')).toBeNull();
  expect(StyleSheet.flatten(view.getByTestId('app-modal-close').props.style).right).toBe(32);
  fireEvent.press(view.getByTestId('app-modal-close'));
  expect(close).toHaveBeenCalledTimes(1);
});

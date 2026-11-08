import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import SupportCopyCheckbox from '../modals/SupportCopyCheckbox';
import { prompts } from '../../styles/profile.styles';

it('aligns with the input outer edge without an extra inner inset and toggles through the whole row', () => {
  const onToggle = jest.fn();
  const ui = render(<SupportCopyCheckbox checked disabled={false} onToggle={onToggle} />);
  const checkbox = ui.getByRole('checkbox');
  const style = StyleSheet.flatten(checkbox.props.style);
  expect(style.marginHorizontal).toBe(prompts.input.marginHorizontal);
  expect(style.paddingHorizontal).toBe(0);
  fireEvent.press(checkbox);
  expect(onToggle).toHaveBeenCalledTimes(1);
  ui.rerender(<SupportCopyCheckbox checked={false} disabled onToggle={onToggle} />);
  fireEvent.press(ui.getByRole('checkbox'));
  expect(onToggle).toHaveBeenCalledTimes(1);
});

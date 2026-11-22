import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import LevelUpModal from '../LevelUpModal';
jest.mock('lottie-react-native', () => 'LottieView');
it('plays the supplied plant once and displays the server level and rank', () => {
  const onClose = jest.fn();
  const view = render(
    <LevelUpModal
      celebration={{ previousLevel: 10, level: 11 }}
      onClose={onClose}
    />,
  );
  expect(view.getByText('You reached level 11!')).toBeTruthy();
  expect(view.getByText('Sprout Keeper')).toBeTruthy();
  const animation = view.getByTestId('level-up-animation');
  expect(animation.props.loop).toBe(false);
  expect(animation.props.source.nm).toBe('step5');
  fireEvent.press(view.getByText('Continue'));
  expect(onClose).toHaveBeenCalledTimes(1);
});
it('shows bulk failures in the celebration and remains hidden without a level increase', () => {
  const view = render(<LevelUpModal celebration={null} onClose={jest.fn()} />);
  expect(view.queryByTestId('level-up-animation')).toBeNull();
  view.rerender(
    <LevelUpModal
      celebration={{ previousLevel: 1, level: 2, notice: 'One task failed' }}
      onClose={jest.fn()}
    />,
  );
  expect(view.getByRole('alert')).toHaveTextContent('One task failed');
});

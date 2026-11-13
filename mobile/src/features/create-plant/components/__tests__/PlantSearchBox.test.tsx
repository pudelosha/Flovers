import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PlantSearchBox from '../PlantSearchBox';

const mockT = (key: string) => key;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT }) }));

it('uses an inline placeholder, keeps matching suggestions, and selects without navigating', () => {
  const selected = jest.fn();
  const plant = { id: '7', name: 'Bird of paradise', latin: 'Strelitzia alba' };
  function Search() {
    const [value, setValue] = React.useState('');
    const [show, setShow] = React.useState(false);
    return <PlantSearchBox value={value} placeholder="Search plant" suggestions={[plant]}
      onChange={text => { setValue(text); setShow(!!text.trim()); }}
      showSuggestions={show} setShowSuggestions={setShow} onSelectSuggestion={selected} />;
  }
  const view = render(<Search />);
  const input = view.getByPlaceholderText('Search plant');
  expect(view.queryByText('Search plant')).toBeNull();
  fireEvent.changeText(input, 'Bird');
  expect(view.getByDisplayValue('Bird')).toBeTruthy();
  expect(view.queryByText('Search plant')).toBeNull();
  fireEvent.press(view.getByText('Bird of paradise'));
  expect(selected).toHaveBeenCalledWith(plant);
  expect(view.queryByText('Bird of paradise')).toBeNull();
});

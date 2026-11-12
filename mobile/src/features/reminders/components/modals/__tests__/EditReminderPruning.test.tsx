import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import EditReminderModal from '../EditReminderModal';

const mockT = (key: string) => key;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock('../../../../../app/providers/LanguageProvider', () => ({ useLanguage: () => ({ currentLanguage: 'en' }) }));
jest.mock('../../../../../app/providers/SettingsProvider', () => ({ useSettings: () => ({ settings: {} }) }));

it('offers pruning fourth and keeps a day-based interval when selected', () => {
  const setType = jest.fn(), setUnit = jest.fn();
  const props = {
    visible: true, plants: [{ id: '1', name: 'Coleus' }], fType: 'watering' as const, setFType: setType,
    fPlantId: '1', setFPlantId: jest.fn(), fDueDate: '2026-11-10', setFDueDate: jest.fn(),
    fIntervalValue: 60, setFIntervalValue: jest.fn(), fIntervalUnit: 'days' as const,
    setFIntervalUnit: setUnit, onCancel: jest.fn(), onSave: jest.fn(),
  };
  const view = render(<EditReminderModal {...props} />);
  fireEvent.press(view.getByText('Watering'));
  const options = view.getAllByText(/^(Watering|Misting|Moisture|Fertilising|Pruning|Care|Repot)$/).map(node => node.props.children);
  expect(options.slice(-6)).toEqual(['Watering', 'Moisture', 'Fertilising', 'Pruning', 'Care', 'Repot']);
  fireEvent.press(view.getByText('Pruning'));
  expect(setType).toHaveBeenCalledWith('pruning');
  view.rerender(<EditReminderModal {...props} fType="pruning" />);
  expect(view.queryByText(/Trim shoots or leaves/)).toBeNull();
  expect(setUnit).not.toHaveBeenCalledWith('months');
});

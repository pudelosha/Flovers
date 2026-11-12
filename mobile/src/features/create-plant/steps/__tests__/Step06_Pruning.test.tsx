import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import Step06_AutoTasks from '../Step06_AutoTasks';
import { CreatePlantProvider, useCreatePlantWizard } from '../../context/CreatePlantProvider';

const mockT = (key: string) => key;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock('../../../../app/providers/LanguageProvider', () => ({ useLanguage: () => ({ currentLanguage: 'en' }) }));
jest.mock('../../../../shared/utils/photoStorage', () => ({ deleteLocalPhoto: jest.fn() }));
jest.mock('../../../../api/services/plant-photos.service', () => ({ uploadPlantPhoto: jest.fn(), updatePlantPhotoFraming: jest.fn() }));

let wizard: ReturnType<typeof useCreatePlantWizard>;
function Probe() {
  wizard = useCreatePlantWizard();
  return <Step06_AutoTasks />;
}
const definition = (pruning: boolean, id = '1') => ({
  id, latin: 'Coleus scutellarioides', image: null, description: '', traits: [],
  pruning_required: pruning, pruning_interval_days: pruning ? 180 : null,
});

it('prefills the recommended pruning interval without enabling the task and preserves an edited interval on re-entry', () => {
  const view = render(<CreatePlantProvider><Probe /></CreatePlantProvider>);
  act(() => {
    wizard.actions.setSelectedPlantDefinition(definition(true));
    wizard.actions.setCreateAutoTasks(true);
  });
  expect(wizard.state.pruningIntervalDays).toBe(180);
  expect(wizard.state.pruningRequired).toBe(false);
  expect(view.queryByText(/Light pruning during active growth/)).toBeNull();
  expect(view.queryByText(/General care: clean leaves/)).toBeNull();
  fireEvent.press(view.getByText('Generate pruning task'));
  expect(wizard.state.pruningRequired).toBe(true);
  act(() => { wizard.actions.setPruningInterval(120); });
  view.rerender(<CreatePlantProvider><Probe /></CreatePlantProvider>);
  expect(wizard.state.pruningIntervalDays).toBe(120);
  act(() => { wizard.actions.setSelectedPlantDefinition(definition(false, '2')); });
  expect(wizard.state.pruningRequired).toBe(false);
  fireEvent.press(view.getByText('Generate pruning task'));
  expect(wizard.state.pruningRequired).toBe(false);
});

it('keeps pruning disabled when an older backend provides no recommendation fields', () => {
  const view = render(<CreatePlantProvider><Probe /></CreatePlantProvider>);
  act(() => {
    wizard.actions.setSelectedPlantDefinition({ id: '1', image: null, description: '', traits: [] });
    wizard.actions.setCreateAutoTasks(true);
  });
  fireEvent.press(view.getByText('Generate pruning task'));
  expect(wizard.state.pruningRequired).toBe(false);
});

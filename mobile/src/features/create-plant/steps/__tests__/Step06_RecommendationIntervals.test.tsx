import React from 'react';
import { act, render } from '@testing-library/react-native';
import Step06_AutoTasks from '../Step06_AutoTasks';
import Slider from '../../../../shared/theme/Slider';
import { CreatePlantProvider, useCreatePlantWizard } from '../../context/CreatePlantProvider';
import { request } from '../../../../api/client';

const mockT = (key: string) => key;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock('../../../../app/providers/LanguageProvider', () => ({ useLanguage: () => ({ currentLanguage: 'en' }) }));
jest.mock('../../../../shared/utils/photoStorage', () => ({ deleteLocalPhoto: jest.fn() }));
jest.mock('../../../../api/services/plant-photos.service', () => ({ uploadPlantPhoto: jest.fn(), updatePlantPhotoFraming: jest.fn() }));
jest.mock('../../../../api/client', () => ({ ...jest.requireActual('../../../../api/client'), request: jest.fn() }));

let wizard: ReturnType<typeof useCreatePlantWizard>;
function Probe() {
  wizard = useCreatePlantWizard();
  return <Step06_AutoTasks />;
}

it.each([[120, 24], [365, 48], [32767, 32767]])('preserves a %i-day feeding and %i-month repot recommendation through creation', async (fertilize, repot) => {
  (request as jest.Mock).mockReset().mockResolvedValue({ id: 99 });
  const view = render(<CreatePlantProvider><Probe /></CreatePlantProvider>);
  act(() => {
    wizard.actions.setSelectedPlant({ id: '12', name: 'Plant', latin: 'Plant' });
    wizard.actions.setSelectedPlantDefinition({
      id: '12', image: null, description: '', traits: [],
      fertilize_required: true, fertilize_interval_days: fertilize,
      repot_required: true, repot_interval_months: repot,
      pruning_required: true, pruning_interval_days: 180,
    });
    wizard.actions.patch({ selectedLocationId: '4', displayName: 'My plant' });
    wizard.actions.setCreateAutoTasks(true);
    wizard.actions.setFertilizeRequired(true);
    wizard.actions.setRepotTaskEnabled(true);
    wizard.actions.setPruningRequired(true);
  });
  expect(wizard.state).toMatchObject({ fertilizeIntervalDays: fertilize, repotIntervalMonths: repot, pruningIntervalDays: 180 });
  const controls = view.UNSAFE_getAllByType(Slider).map(slider => slider.props);
  expect(controls).toEqual(expect.arrayContaining([
    expect.objectContaining({ value: fertilize, maximumValue: Math.max(365, fertilize) }),
    expect.objectContaining({ value: repot, maximumValue: Math.max(48, repot) }),
    expect.objectContaining({ value: 180 }),
  ]));
  await act(async () => { await wizard.actions.createPlant(); });
  expect(request).toHaveBeenCalledWith('/plant-instances/', 'POST', expect.objectContaining({
    fertilize_required: true, fertilize_interval_days: fertilize,
    repot_task_enabled: true, repot_interval_months: repot,
    pruning_required: true, pruning_interval_days: 180,
  }), { auth: true });
});

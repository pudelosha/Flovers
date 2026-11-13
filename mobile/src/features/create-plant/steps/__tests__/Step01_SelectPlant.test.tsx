import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import Step01_SelectPlant from '../Step01_SelectPlant';
import PlantSearchBox from '../../components/PlantSearchBox';
import { fetchPopularPlants, fetchPlantSearchIndex } from '../../../../api/services/plant-definitions.service';

const mockT = (key: string) => key;
const mockState = {};
const mockActions = { setSelectedPlant: jest.fn(), goTo: jest.fn() };
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (callback: any) => require('react').useEffect(callback, [callback]) }));
jest.mock('../../../../app/providers/LanguageProvider', () => ({ useLanguage: () => ({ currentLanguage: 'en' }) }));
jest.mock('../../hooks/useCreatePlantWizard', () => ({ useCreatePlantWizard: () => ({ state: mockState, actions: mockActions }) }));
jest.mock('../../hooks/useWizardImagePreload', () => ({ useWizardImagePreload: () => ({ loading: false }) }));
jest.mock('../../../../api/services/plant-definitions.service', () => ({ fetchPopularPlants: jest.fn(), fetchPlantSearchIndex: jest.fn() }));
jest.mock('../../components/PlantSearchBox', () => () => null);
jest.mock('../../../../shared/ui/PlantDescriptionSurface', () => () => null);

const plant = { id: '42', name: 'Bird of paradise', latin: 'Strelitzia alba', image: 'https://example.test/bird.jpg' };
const props = { onScrollToTop: jest.fn(), onOpenScanner: jest.fn(), onRegisterScanResultHandler: jest.fn() };
beforeEach(() => {
  jest.clearAllMocks();
  (fetchPopularPlants as jest.Mock).mockResolvedValue([plant]);
  (fetchPlantSearchIndex as jest.Mock).mockResolvedValue([plant]);
});

it('makes the complete popular plant tile select the definition and open traits', async () => {
  const view = render(<Step01_SelectPlant {...props} />);
  const tile = await view.findByTestId('popular-plant-42');
  fireEvent.press(tile);
  expect(mockActions.setSelectedPlant).toHaveBeenCalledWith({ id: '42', name: plant.latin, latin: plant.latin, predefined: true });
  expect(mockActions.goTo).toHaveBeenCalledWith('traits');
  expect(props.onScrollToTop).toHaveBeenCalled();
});

it('keeps search selection on step one and retains the scan action', async () => {
  const view = render(<Step01_SelectPlant {...props} />);
  await view.findByTestId('popular-plant-42');
  act(() => view.UNSAFE_getByType(PlantSearchBox).props.onSelectSuggestion(plant));
  expect(mockActions.setSelectedPlant).toHaveBeenCalledWith(expect.objectContaining({ id: '42', predefined: true }));
  expect(mockActions.goTo).not.toHaveBeenCalled();
  expect(view.UNSAFE_getByType(PlantSearchBox).props.value).toBe(plant.latin);
  fireEvent.press(view.getByLabelText('createPlant.step01.scanButton'));
  expect(props.onOpenScanner).toHaveBeenCalledTimes(1);
});

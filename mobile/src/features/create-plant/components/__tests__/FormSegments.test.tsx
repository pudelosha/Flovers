import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import AddLocationModal from '../modals/AddLocationModal';
import EditLocationModal from '../../../locations/components/modals/EditLocationModal';
import Step04Exposure from '../../steps/Step04_Exposure';
import EditPlantModal from '../../../plants/components/modals/EditPlantModal';

const mockTranslations: Record<string, string> = {
  'createPlant.step03.categories.indoor': 'Indoor',
  'createPlant.step03.categories.outdoor': 'Outdoor',
  'createPlant.step03.categories.other': 'Other',
  'createPlant.step04.orientationsShort.S': 'Płd.',
  'createPlant.step04.orientationsShort.E': 'Wsch.',
  'createPlant.step04.orientationsShort.W': 'Zach.',
  'createPlant.step04.orientationsShort.N': 'Płn.',
  'plantsModals.edit.orientations.S': 'Południe',
  'plantsModals.edit.orientations.E': 'Wschód',
  'plantsModals.edit.orientations.W': 'Zachód',
  'plantsModals.edit.orientations.N': 'Północ',
};
const mockOrientation = jest.fn();
let mockState: any;
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => mockTranslations[key] ?? key }),
}));
jest.mock('../../../../app/providers/LanguageProvider', () => ({
  useLanguage: () => ({ currentLanguage: 'pl' }),
}));
jest.mock('../../hooks/useCreatePlantWizard', () => ({
  useCreatePlantWizard: () => ({
    state: mockState,
    actions: { setOrientation: mockOrientation },
  }),
}));
jest.mock('../modals/MeasureExposureModal', () => () => null);

beforeEach(() => {
  jest.clearAllMocks();
  mockState = { orientation: 'E', lightLevel: 'medium', distanceCm: 20 };
});

it('saves the category chosen in the wizard location modal', () => {
  const create = jest.fn();
  const view = render(
    <AddLocationModal visible onClose={jest.fn()} onCreate={create} />,
  );
  expect(view.getByRole('tab', { name: 'Indoor' })).toBeSelected();
  expect(StyleSheet.flatten(view.getByTestId('wizard-location-categories').props.style).borderRadius).toBe(16);
  fireEvent.changeText(view.getByPlaceholderText('Location name'), ' Balcony ');
  fireEvent.press(view.getByRole('tab', { name: 'Outdoor' }));
  fireEvent.press(view.getByText('Create'));
  expect(create).toHaveBeenCalledWith('Balcony', 'outdoor');
});

it.each(['create', 'edit'] as const)(
  'saves the selected location category in Locations %s mode',
  mode => {
    const save = jest.fn();
    const view = render(
      <EditLocationModal
        visible
        mode={mode}
        initialName="Garden"
        initialCategory="outdoor"
        onCancel={jest.fn()}
        onSave={save}
      />,
    );
    expect(view.getByRole('tab', { name: 'Outdoor' })).toBeSelected();
    expect(
      StyleSheet.flatten(view.getByTestId('location-categories').props.style)
        .marginHorizontal,
    ).toBe(16);
    fireEvent.press(view.getByRole('tab', { name: 'Other' }));
    fireEvent.press(view.getByText(mode === 'create' ? 'Create' : 'Save'));
    expect(save).toHaveBeenCalledWith('Garden', 'other');
  },
);

it('keeps full direction accessibility labels while changing the wizard orientation', () => {
  const view = render(<Step04Exposure onOpenMeasureModal={jest.fn()} />);
  expect(
    view.getAllByRole('tab').map(tab => tab.props.accessibilityLabel),
  ).toEqual(['Południe', 'Wschód', 'Zachód', 'Północ']);
  expect(view.getByText('Płd.')).toBeTruthy();
  expect(StyleSheet.flatten(view.getByTestId('wizard-orientations').props.style).borderRadius).toBe(14);
  fireEvent.press(view.getByRole('tab', { name: 'Południe' }));
  expect(mockOrientation).toHaveBeenCalledWith('S');
  mockState = { ...mockState, orientation: 'S' };
  view.rerender(<Step04Exposure onOpenMeasureModal={jest.fn()} />);
  expect(view.getByRole('tab', { name: 'Południe' })).toBeSelected();
});

it('uses the same direction selection in Edit plant', () => {
  const change = jest.fn();
  const props: React.ComponentProps<typeof EditPlantModal> = {
    visible: true,
    latinCatalog: [],
    locations: [],
    fName: 'Bird',
    setFName: jest.fn(),
    fLatinQuery: '',
    setFLatinQuery: jest.fn(),
    setFLatinSelected: jest.fn(),
    setFLocation: jest.fn(),
    fNotes: '',
    setFNotes: jest.fn(),
    setFPurchaseDateISO: jest.fn(),
    fLightLevel: 'medium',
    setFLightLevel: jest.fn(),
    fOrientation: 'E',
    setFOrientation: change,
    fDistanceCm: 20,
    setFDistanceCm: jest.fn(),
    setFPotMaterial: jest.fn(),
    setFSoilMix: jest.fn(),
    onCancel: jest.fn(),
    onSave: jest.fn(),
  };
  const view = render(<EditPlantModal {...props} />);
  expect(StyleSheet.flatten(view.getByTestId('edit-plant-orientations').props.style).borderRadius).toBe(16);
  fireEvent.press(view.getByRole('tab', { name: 'Północ' }));
  expect(change).toHaveBeenCalledWith('N');
  view.rerender(<EditPlantModal {...props} fOrientation="N" />);
  expect(view.getByRole('tab', { name: 'Północ' })).toBeSelected();
  expect(view.getByText('Płn.')).toBeTruthy();
});

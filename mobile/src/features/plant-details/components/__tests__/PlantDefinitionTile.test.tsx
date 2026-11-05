import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import PlantDefinitionModal from '../modals/PlantDefinitionModal';
import { fetchPlantProfile } from '../../../../api/services/plant-definitions.service';

jest.mock('react-i18next', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

jest.mock('../../../../api/services/plant-definitions.service', () => ({ fetchPlantProfile: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

it('loads the linked definition as inline content without a modal or Close button', async () => {
  (fetchPlantProfile as jest.Mock).mockResolvedValue({ name: 'Fern', latin: 'Nephrolepis', description: 'Keep soil moist.', traits: [{ key: 'watering', value: 'Weekly' }] });
  const view = render(<PlantDefinitionModal visible embedded onClose={jest.fn()} plantDefinitionId={42} />);
  await waitFor(() => expect(view.getByText('Keep soil moist.')).toBeTruthy());
  expect(fetchPlantProfile).toHaveBeenCalledWith(42, expect.objectContaining({ auth: true }));
  expect(view.getByTestId('plant-definition-tile')).toBeTruthy();
  expect(view.getByText('Nephrolepis')).toBeTruthy();
  expect(view.getByText('Weekly')).toBeTruthy();
  expect(view.queryByText('Close')).toBeNull();
});

it('shows a definition load error without removing the tile', async () => {
  (fetchPlantProfile as jest.Mock).mockRejectedValue(new Error('Definition unavailable'));
  const view = render(<PlantDefinitionModal visible embedded onClose={jest.fn()} plantDefinitionId={42} />);
  await waitFor(() => expect(view.getByText('Definition unavailable')).toBeTruthy());
  expect(view.getByTestId('plant-definition-tile')).toBeTruthy();
});

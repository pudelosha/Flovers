import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import PlantMenu from '../PlantMenu';

jest.mock('../../../../app/providers/LanguageProvider', () => ({ useLanguage: () => ({ currentLanguage: 'en' }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('../../../../shared/ui/FloatingTileMenu', () => ({ children }: any) => children);

const props = () => ({
  onDetails: jest.fn(), onEdit: jest.fn(), onChangeImage: jest.fn(),
  onShare: jest.fn(), onReminders: jest.fn(), onJournal: jest.fn(),
  onDelete: jest.fn(), onShowQr: jest.fn(),
});

it('places Change image third, before sharing, and opens the supplied action', () => {
  const actions = props();
  const view = render(<PlantMenu {...actions} />);
  const labels = view.UNSAFE_getAllByType(Text).map(text => text.props.children)
    .filter(label => ['Plant details', 'Edit plant', 'Change image', 'Share plant'].includes(label));
  expect(labels).toEqual(['Plant details', 'Edit plant', 'Change image', 'Share plant']);
  fireEvent.press(view.getByText('Change image'));
  expect(actions.onChangeImage).toHaveBeenCalledTimes(1);
});

it('does not offer changing another owner’s plant photo', () => {
  const view = render(<PlantMenu {...props()} canEdit={false} />);
  expect(view.queryByText('Change image')).toBeNull();
});

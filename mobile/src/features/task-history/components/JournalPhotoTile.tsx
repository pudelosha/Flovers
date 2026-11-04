import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from '../../../shared/theme/native';
import { useAppTheme } from '../../../shared/theme/ThemeContext';
import FloatingTileMenu from '../../../shared/ui/FloatingTileMenu';
import LinearGradient from '../../../shared/theme/Gradient';
import MaterialCommunityIcons from '../../../shared/theme/Icon';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../../app/providers/SettingsProvider';
import SharedPlantBadge from '../../../shared/ui/SharedPlantBadge';
import {
  plantAccess,
  SHARED_PLANT_TINT,
} from '../../../shared/utils/plantAccess';
import { formatDateWithPattern } from '../../home/utils/taskGrouping';
import type { JournalPhotoItem } from '../types/task-history.types';
import { s } from '../styles/task-history.styles';

export default function JournalPhotoTile({
  item,
  isMenuOpen,
  onToggleMenu,
  onViewPhoto,
  onEdit,
  onPlantDetails,
  onDelete,
}: {
  item: JournalPhotoItem;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onViewPhoto: () => void;
  onEdit: () => void;
  onPlantDetails: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { isLight } = useAppTheme();
  const access = plantAccess(item.access);
  // Only the plant owner can create journal photos; server access metadata identifies the author.
  const author =
    access.ownerName.trim() ||
    t('taskHistory.tile.unknownUser', { defaultValue: 'Unknown user' });
  const addedDate = formatDateWithPattern(
    item.createdAt,
    settings.dateFormat || 'DD.MM.YYYY',
  );
  const action = (callback: () => void) => {
    onToggleMenu();
    callback();
  };
  return (
    <View
      style={[
        s.cardWrap,
        { minHeight: access.isShared ? 78 : 66 },
        isMenuOpen && s.cardWrapRaised,
      ]}
    >
      <View pointerEvents="none" style={s.cardGlass}>
        <LinearGradient
          colors={['rgba(16,80,63,0.9)', 'rgba(5,31,24,0.9)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.cardTint} />
        {access.isShared && (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: SHARED_PLANT_TINT },
            ]}
          />
        )}
      </View>
      <Pressable
        accessible={false}
        onPress={onToggleMenu}
        style={styles.body}
      >
        <View style={[s.cardRow, { minHeight: access.isShared ? 78 : 66 }]}>
          <View style={s.cardBodyPressable}>
            <View style={[s.leftCol, { width: 38 }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('taskHistory.photo.view', {
                  defaultValue: 'View photo',
                })}
                style={[
                  s.leftIconBubble,
                  {
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: isLight ? '#C5E8DD' : '#244C40',
                  },
                ]}
                onPress={event => {
                  event.stopPropagation();
                  if (isMenuOpen) onToggleMenu();
                  onViewPhoto();
                }}
              >
                <MaterialCommunityIcons
                  name="image-search-outline"
                  size={20}
                  color="#7AC8BC"
                />
              </Pressable>
            </View>
            <View style={[s.centerCol, { marginLeft: 10 }]}>
              <Text
                style={[s.plantName, { fontSize: 14, marginTop: 0 }]}
                numberOfLines={1}
              >
                {item.plant}
              </Text>
              {!!item.location && (
                <View style={s.locationRow}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={12}
                    color="#FFFFFF"
                    style={s.locationIcon}
                  />
                  <Text
                    style={[s.location, { fontSize: 11 }]}
                    numberOfLines={1}
                  >
                    {item.location}
                  </Text>
                </View>
              )}
              <SharedPlantBadge access={item.access} compact />
            </View>
            <View style={s.rightCol}>
              <Text
                style={[s.completedDateText, { marginTop: 0 }]}
                numberOfLines={1}
              >
                {addedDate}
              </Text>
              <Text style={s.completedByText} numberOfLines={1}>
                {author}
              </Text>
            </View>
          </View>
        </View>
        {!!item.note?.trim() && (
          <View style={styles.notes}>
            <Text style={s.noteText}>{item.note}</Text>
          </View>
        )}
      </Pressable>
      {isMenuOpen && (
        <FloatingTileMenu style={s.menuSheet}>
          <Pressable style={s.menuItem} onPress={() => action(onViewPhoto)}>
            <MaterialCommunityIcons
              name="image-search-outline"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 10 }}
            />
            <Text style={s.menuItemText}>
              {t('taskHistory.photo.view', { defaultValue: 'View photo' })}
            </Text>
          </Pressable>
          {access.canEdit && (
            <Pressable style={s.menuItem} onPress={() => action(onEdit)}>
              <MaterialCommunityIcons
                name="image-edit-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 10 }}
              />
              <Text style={s.menuItemText}>
                {t('taskHistory.photo.edit', { defaultValue: 'Edit photo' })}
              </Text>
            </Pressable>
          )}
          <Pressable style={s.menuItem} onPress={() => action(onPlantDetails)}>
            <MaterialCommunityIcons
              name="flower-tulip-outline"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 10 }}
            />
            <Text style={s.menuItemText}>
              {t('taskHistory.menu.goToPlant', {
                defaultValue: 'Plant details',
              })}
            </Text>
          </Pressable>
          {access.canEdit && (
            <Pressable style={s.menuItem} onPress={() => action(onDelete)}>
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={18}
                color="#FF6B6B"
                style={{ marginRight: 10 }}
              />
              <Text style={[s.menuItemText, { color: '#FF6B6B' }]}>
                {t('taskHistory.photo.delete', {
                  defaultValue: 'Delete photo',
                })}
              </Text>
            </Pressable>
          )}
        </FloatingTileMenu>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  body: { borderRadius: 28, overflow: 'hidden' },
  notes: { marginHorizontal: 20, paddingBottom: 16 },
});

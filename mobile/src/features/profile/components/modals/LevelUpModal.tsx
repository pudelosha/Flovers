import React from 'react';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from '../../../../shared/theme/native';
import AppModalFrame from '../../../../shared/ui/AppModalFrame';
import { accountRankForLevel } from '../../constants/account-level.constants';
import type { LevelUpCelebration } from '../../hooks/useLevelUpCelebration';

const animation = require('../../../../../assets/lottie/lottie-level-up.json');

export default function LevelUpModal({
  celebration,
  onClose,
}: {
  celebration: LevelUpCelebration | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  if (!celebration) return null;
  const rank = accountRankForLevel(celebration.level);
  return (
    <AppModalFrame
      visible
      title={t('profile.levelUp.title', { defaultValue: 'Level up!' })}
      onClose={onClose}
      centerContent
    >
      <View style={s.content}>
        <LottieView
          testID="level-up-animation"
          source={animation}
          autoPlay
          loop={false}
          style={s.animation}
        />
        <Text testID="level-up-message" style={s.level}>
          {t('profile.levelUp.reached', {
            defaultValue: 'You reached level {{level}}!',
            level: celebration.level,
          })}
        </Text>
        <Text style={s.badge} accessible={false}>
          {rank.badge}
        </Text>
        <Text style={s.rank}>
          {t(`profile.account.level.ranks.${rank.key}`, {
            defaultValue: rank.title,
          })}
        </Text>
        {!!celebration.notice && (
          <Text accessibilityRole="alert" style={s.notice}>
            {celebration.notice}
          </Text>
        )}
        <Pressable
          testID="level-up-continue"
          accessibilityRole="button"
          style={s.button}
          onPress={onClose}
        >
          <Text style={s.buttonText}>
            {t('profile.levelUp.continue', { defaultValue: 'Continue' })}
          </Text>
        </Pressable>
      </View>
    </AppModalFrame>
  );
}

const s = StyleSheet.create({
  content: { marginHorizontal: 16, alignItems: 'center', gap: 12 },
  animation: { width: '100%', maxWidth: 250, aspectRatio: 1 },
  level: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  badge: { fontSize: 30 },
  rank: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  notice: {
    color: '#FF9088',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#0B7285',
    marginTop: 8,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
});

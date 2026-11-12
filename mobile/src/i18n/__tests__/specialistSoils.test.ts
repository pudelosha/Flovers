import i18n from '..';
import { SOIL_MIXES } from '../../features/create-plant/constants/create-plant.constants';

const keys = ['air-plant', 'aquatic', 'carnivorous-bog', 'nepenthes', 'pinguicula'];
const glyphs = require('react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');
it.each(['en', 'pl', 'de', 'it', 'fr', 'es', 'pt', 'ar', 'hi', 'zh', 'ja', 'ko', 'id', 'ru', 'tr'])('%s provides compact specialist soil labels and descriptions', language => {
  for (const key of keys) {
    const option = SOIL_MIXES.find(item => item.key === key);
    expect(option?.icon).toBeTruthy();
    expect(glyphs[option!.icon!]).toBeDefined();
    for (const field of ['label', 'description']) {
      const path = `createPlant.step05.soilMixes.${key}.${field}`;
      expect(i18n.exists(path, { lng: language, fallbackLng: false })).toBe(true);
      const text = i18n.t(path, { lng: language });
      expect(text).not.toBe(path);
      expect(text).not.toMatch(/\?{2,}|\uFFFD/);
      if (field === 'label') expect(text.length).toBeLessThanOrEqual(25);
    }
  }
});

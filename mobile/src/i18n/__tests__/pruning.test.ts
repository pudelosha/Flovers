import i18n from '..';

it.each(['en', 'pl', 'de', 'it', 'fr', 'es', 'pt', 'ar', 'hi', 'zh', 'ja', 'ko', 'id', 'ru', 'tr'])('%s exposes pruning labels and distinguishes pruning from general care', language => {
  for (const key of ['home.taskTypes.pruning', 'reminders.types.pruning', 'taskHistoryModals.common.taskTypes.pruning', 'createPlant.step02.labels.pruningInterval', 'createPlant.step06.labels.generatePruningTask']) {
    expect(i18n.exists(key, { lng: language, fallbackLng: false })).toBe(true);
    const text = i18n.t(key, { lng: language });
    expect(text).not.toBe(key);
    expect(text).not.toMatch(/\?{2,}|\uFFFD/);
  }
  expect(i18n.t('reminders.types.pruning', { lng: language })).not.toBe(i18n.t('reminders.types.care', { lng: language }));
});

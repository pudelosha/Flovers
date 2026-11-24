import i18n, { LANGS } from '..';

describe.each(LANGS)('%s device setup translations', language => {
  it('has the complete configuration vocabulary without replacement characters or fallback keys', () => {
    const english = i18n.getResource('en', 'translation', 'readingsModals.configuration') as Record<string, string>;
    const local = i18n.getResource(language, 'translation', 'readingsModals.configuration') as Record<string, string>;
    expect(Object.keys(local).sort()).toEqual(Object.keys(english).sort());
    for (const [key, value] of Object.entries(local)) {
      expect(typeof value).toBe('string');
      expect(value.trim()).not.toBe('');
      expect(value).not.toMatch(/\uFFFD|\?\?/);
      expect(value).not.toBe(`readingsModals.configuration.${key}`);
    }
  });
  it('keeps the add/setup/information distinction and the complete DIY menu route', () => {
    const read = (key: string): string => i18n.getResource(language, 'translation', key);
    expect(read('readings.fab.linkDevice')).toBe(read('readingsModals.upsert.linkDeviceTitle'));
    expect(read('readings.fab.deviceSetup')).toBe(read('readingsModals.deviceSetup.title'));
    expect(read('readings.menu.deviceDetails')).toBe(read('readingsModals.configuration.title'));
    expect(read('readings.fab.deviceSetup')).not.toBe(read('readings.menu.deviceDetails'));
    const help = read('plantDetails.readingsHelp.device');
    expect(help).toContain(read('readings.menu.deviceDetails'));
    expect(help).toContain(read('readingsModals.configuration.advanced'));
    expect(help).toContain(read('readingsModals.deviceDetails.emailCode'));
  });
});

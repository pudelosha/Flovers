const fs = require('fs') as { readdirSync: (directory:string)=>string[]; readFileSync:(file:string,encoding:string)=>string };
const path = require('path') as { join:(...parts:string[])=>string };
declare const __dirname: string;
const languages = [
  'en',
  'pl',
  'de',
  'it',
  'fr',
  'es',
  'pt',
  'ar',
  'hi',
  'zh',
  'ja',
  'ko',
  'id',
  'ru',
  'tr',
];
function values(value: any): string[] {
  if (typeof value === 'string') return [value];
  return value && typeof value === 'object'
    ? Object.values(value).flatMap(values)
    : [];
}
function read(file: string) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}
it.each(languages)('%s pot and soil labels fit the 25-character limit', language => {
  const step = read(path.join(__dirname, '../locales', language, 'createPlantStep05.json')).createPlant.step05;
  for (const category of ['potMaterials', 'soilMixes']) {
    for (const [key, option] of Object.entries(step[category])) {
      const label = (option as { label: string }).label;
      if (Array.from(label).length > 25) {
        throw new Error(`${language} ${category}.${key} exceeds 25 characters: ${label}`);
      }
    }
  }
});
it.each(languages)(
  '%s translations preserve letters and valid Unicode',
  language => {
    const directory = path.join(__dirname, '../locales', language);
    for (const file of fs
      .readdirSync(directory)
      .filter(name => name.endsWith('.json'))) {
      for (const text of values(read(path.join(directory, file)))) {
        if (
          /\?{2,}|[\p{L}\p{N}]\?[\p{L}\p{N}]|[\uFFFD\u0080-\u009F]/u.test(text)
        )
          throw new Error(`Damaged ${language} text in ${file}: ${text}`);
      }
    }
  },
);
it.each(languages)(
  '%s notification and invitation statements contain no lost letters',
  language => {
    const root = path.join(__dirname, '../locales', language);
    const profile = read(path.join(root, 'profile.json')).profile.notifications;
    const sharing = read(path.join(root, 'sharing.json')).sharing;
    for (const text of values([
      profile.sharedEmailLabel,
      profile.sharedPushLabel,
      sharing.emailInvite,
      sharing.errors.alreadyRegistered,
    ]))
      expect(text).not.toContain('?');
  },
);

import i18next from 'i18next';
import { taskCompletionToast, withCompletionXP } from '../taskCompletionToast';
import en from '../../../i18n/locales/en/home.json';
import pl from '../../../i18n/locales/pl/home.json';

it.each([
  ['en', 'Task completed', 'Tasks completed'],
  ['pl', 'Zadanie wykonane', 'Zadania wykonane'],
])('formats the same completion message with or without an actual XP award in %s', async (language, single, multiple) => {
  const instance = i18next.createInstance();
  await instance.init({ lng: language, resources: { en: { translation: en }, pl: { translation: pl } } });
  expect(taskCompletionToast(instance.t, 100)).toBe(`${single} · +100 XP`);
  expect(taskCompletionToast(instance.t, 150, true)).toBe(`${multiple} · +150 XP`);
  expect(taskCompletionToast(instance.t, 0)).toBe(single);
  expect(taskCompletionToast(instance.t, Number.NaN)).toBe(single);
  expect(withCompletionXP('2/3', 50, instance.t)).toBe('2/3 · +50 XP');
});

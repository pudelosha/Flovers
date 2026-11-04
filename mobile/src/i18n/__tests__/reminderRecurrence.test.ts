import i18n from '..';
const translate=(language:string,count:number,unit='Days')=>i18n.t(`reminders.tile.repeatsEvery${unit}`,{lng:language,count});
it('uses Polish cases for days and months',()=>{
 expect(translate('pl',1)).toBe('Powtarza się co 1 dzień');
 expect(translate('pl',2)).toBe('Powtarza się co 2 dni');
 expect(translate('pl',5)).toBe('Powtarza się co 5 dni');
 expect(translate('pl',2,'Months')).toBe('Powtarza się co 2 miesiące');
 expect(translate('pl',5,'Months')).toBe('Powtarza się co 5 miesięcy');
});
it('uses Russian and Arabic plural forms',()=>{
 expect(translate('ru',1)).toBe('Повторяется каждый 1 день');
 expect(translate('ru',2)).toBe('Повторяется каждые 2 дня');
 expect(translate('ru',5)).toBe('Повторяется каждые 5 дней');
 expect(translate('ar',2)).toBe('يتكرر كل يومين');
});
it.each(['en','pl','de','it','fr','es','pt','ar','hi','zh','ja','ko','id','ru','tr'])('%s has day and month recurrence phrases for supported counts',language=>{
 for (const unit of ['Days','Months']) for (const count of [1,2,3,5,11,21,22,101]) {
  const label=translate(language,count,unit);
  expect(label).not.toContain('reminders.');expect(label).not.toContain('{{');expect(label).not.toMatch(/\?{2,}/);
 }
});

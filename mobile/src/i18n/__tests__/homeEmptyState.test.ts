import i18n from '..';
it.each(['en','pl','de','it','fr','es','pt','ar','hi','zh','ja','ko','id','ru','tr'])('%s empty Home views do not reference removed FAB shortcuts',language=>{
 for(const key of ['home.empty.overdue.body','home.empty.today.body','home.groups.noUpcomingBody']) {
  const body=String(i18n.t(key,{lng:language}));
  expect(body).not.toBe(key);expect(body).not.toMatch(/FAB/i);
  const oldAction=String(i18n.t('home.fab.showAllTasks',{lng:language}));
  expect(body).not.toContain(oldAction);
 }
});

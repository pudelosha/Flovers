import i18n from '..';
it('uses compact Polish sharing tabs',()=>{
 expect(['all','outgoing','incoming'].map(key=>i18n.t('sharing.plants.filters.'+key,{lng:'pl'}))).toEqual(['Wszystkie','Udostępniam','Udostępnione']);
});
it.each(['en','pl','de','it','fr','es','pt','ar','hi','zh','ja','ko','id','ru','tr'])('%s has short sharing tab labels',language=>{
 for(const key of ['all','outgoing','incoming']) {
  const label=i18n.getResource(language,'translation','sharing.plants.filters.'+key);
  expect(typeof label).toBe('string');expect(label.length).toBeLessThanOrEqual(20);expect(label).not.toContain('?');
 }
});

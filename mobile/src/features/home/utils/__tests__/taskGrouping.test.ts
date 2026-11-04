import {dueDayOffset,groupTasksByDay,relativeDueLabel} from '../taskGrouping';
const t=(key:string,args?:any)=>args ? `${key}:${args.count}` : key;
it('groups interleaved days once while retaining the chosen order inside each day',()=>{
 const tasks=[{id:'a',dueDate:'2026-11-05'},{id:'b',dueDate:'2026-11-03'},{id:'c',dueDate:'2026-11-05'}];
 expect(groupTasksByDay(tasks).map(x=>x.id)).toEqual(['b','a','c']);
 expect(groupTasksByDay(tasks,true).map(x=>x.id)).toEqual(['a','c','b']);
});
it('counts calendar days across daylight-saving changes',()=>{
 expect(dueDayOffset('2026-03-30',new Date(2026,2,28,12))).toBe(2);
 expect(dueDayOffset('2026-10-26',new Date(2026,9,24,12))).toBe(2);
});
it('describes exact future day counts instead of collapsing all distant dates into next week',()=>{
 const future=new Date();future.setDate(future.getDate()+17);
 expect(relativeDueLabel(future,t)).toBe('home.due.inDays:17');
});

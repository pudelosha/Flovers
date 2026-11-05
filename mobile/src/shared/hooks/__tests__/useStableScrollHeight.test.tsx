import { act, renderHook } from '@testing-library/react-native';
import useStableScrollHeight from '../useStableScrollHeight';

it('retains enough scroll space when switching from a long tab to a shorter one', () => {
 const {result}=renderHook(()=>useStableScrollHeight('plant-1'));
 act(()=>result.current.onContentSizeChange(350,1500));
 act(()=>result.current.onContentSizeChange(350,700));
 expect(result.current.minHeight).toBe(1500);
 act(()=>result.current.onContentSizeChange(350,1700));
 expect(result.current.minHeight).toBe(1700);
});
it('resets retained space when navigating to another plant',()=>{
 const {result,rerender}=renderHook(({id})=>useStableScrollHeight(id),{initialProps:{id:'one'}});
 act(()=>result.current.onContentSizeChange(350,1500));
 rerender({id:'two'});
 expect(result.current.minHeight).toBe(0);
 act(()=>result.current.onContentSizeChange(350,600));
 expect(result.current.minHeight).toBe(600);
});

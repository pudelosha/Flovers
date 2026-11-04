import {act,renderHook} from '@testing-library/react-native';
import {Animated} from 'react-native';
import {useTileEntryAnimations} from '../useTileEntryAnimations';
let frames:Array<FrameRequestCallback>;
const start=jest.fn(),stop=jest.fn();
beforeEach(()=>{
 jest.clearAllMocks();frames=[];
 jest.spyOn(globalThis,'requestAnimationFrame').mockImplementation((callback:FrameRequestCallback)=>{frames.push(callback);return frames.length;});
 jest.spyOn(globalThis,'cancelAnimationFrame').mockImplementation(()=>{});
 jest.spyOn(Animated,'timing').mockReturnValue({start,stop,reset:jest.fn()});
 jest.spyOn(Animated,'parallel').mockReturnValue({start,stop,reset:jest.fn()});
});
afterEach(()=>jest.restoreAllMocks());
const flush=()=>act(()=>{const callbacks=frames.splice(0);callbacks.forEach(callback=>callback(0));});
it('waits for ready tiles to commit before starting the stagger',()=>{
 const view=renderHook<ReturnType<typeof useTileEntryAnimations>,{ready:boolean}>(({ready})=>useTileEntryAnimations(['a','b'],ready,true),{initialProps:{ready:false}});
 expect(Animated.timing).not.toHaveBeenCalled();
 view.rerender({ready:true});expect(Animated.timing).not.toHaveBeenCalled();flush();
 expect(Animated.timing).toHaveBeenCalledTimes(2);
 expect(Animated.timing).toHaveBeenNthCalledWith(2,expect.anything(),expect.objectContaining({duration:280,delay:50,useNativeDriver:true}));
 view.unmount();expect(stop).toHaveBeenCalled();
});
it('replays every tile when returning to the screen',()=>{
 const view=renderHook<ReturnType<typeof useTileEntryAnimations>,{focused:boolean}>(({focused})=>useTileEntryAnimations(['a'],true,focused),{initialProps:{focused:true}});flush();
 view.rerender({focused:false});view.rerender({focused:true});
 expect(Animated.timing).toHaveBeenCalledTimes(1);flush();expect(Animated.timing).toHaveBeenCalledTimes(2);
});
it('animates appended tiles without replaying existing ones or ordinary rerenders',()=>{
 const view=renderHook<ReturnType<typeof useTileEntryAnimations>,{ids:string[]}>(({ids})=>useTileEntryAnimations(ids,true,true),{initialProps:{ids:['a']}});flush();
 view.rerender({ids:['a']});flush();expect(Animated.timing).toHaveBeenCalledTimes(1);
 view.rerender({ids:['a','b']});flush();expect(Animated.timing).toHaveBeenCalledTimes(2);
});

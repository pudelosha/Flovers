import React from 'react';
import {FlatList} from 'react-native';
import {act,render,waitFor} from '@testing-library/react-native';
import NotificationsScreen from '../NotificationsScreen';
import InboxModals from '../../components/InboxModals';
import FAB from '../../../../shared/ui/FAB';
import {fetchInbox,deleteInboxBatch} from '../../../../api/services/inbox.service';
let mockFocused=true;
jest.mock('@react-navigation/native',()=>({useIsFocused:()=>mockFocused,useNavigation:()=>({navigate:jest.fn()})}));
jest.mock('../../../../api/services/inbox.service',()=>({fetchInbox:jest.fn(),deleteInboxItem:jest.fn(),deleteInboxBatch:jest.fn()}));
jest.mock('../../../../shared/ui/GlassHeader',()=>()=>null);
jest.mock('../../../../shared/ui/TopSnackbar',()=>()=>null);
jest.mock('../../../../shared/ui/FAB',()=>()=>null);
jest.mock('../../components/InboxModals',()=>()=>null);
const item=(id:string)=>({id,source:'task',channel:'push',kind:'tasks_due',payload:{},createdAt:'2026-11-03T12:00:00Z'});
const page=(items=[item('1')],nextCursor:string|null=null)=>({items,nextCursor,total:items.length,snapshot:'signed-snapshot'});
beforeEach(()=>{jest.clearAllMocks();mockFocused=true;(fetchInbox as jest.Mock).mockReset().mockResolvedValue(page());(deleteInboxBatch as jest.Mock).mockReset().mockResolvedValue(1);});
it('shows the shared spinner until all entry data arrives',async()=>{
 let finish:any;(fetchInbox as jest.Mock).mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 const view=render(<NotificationsScreen/>);expect(view.getByTestId('inbox-loading')).toBeTruthy();
 await act(async()=>{finish(page());});
 expect(view.queryByTestId('inbox-loading')).toBeNull();expect(view.getByText('inbox.events.tasks_due.title')).toBeTruthy();
});
it('ignores a stale response after leaving the screen',async()=>{
 let finish:any;(fetchInbox as jest.Mock).mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 const view=render(<NotificationsScreen/>);mockFocused=false;view.rerender(<NotificationsScreen/>);
 await act(async()=>{finish(page());});expect(view.queryByText('inbox.events.tasks_due.title')).toBeNull();
});
it('paginates without duplicating entries and supports filtered deletion of the loaded snapshot',async()=>{
 (fetchInbox as jest.Mock).mockResolvedValueOnce(page([item('1')],'next')).mockResolvedValueOnce(page([item('1'),item('2')])).mockResolvedValue(page([]));
 const view=render(<NotificationsScreen/>);await act(async()=>{await Promise.resolve();});await view.findByText('inbox.events.tasks_due.title');
 await act(async()=>{await view.UNSAFE_getByType(FlatList).props.onEndReached();});
 await waitFor(()=>expect(view.getAllByText('inbox.events.tasks_due.title')).toHaveLength(2));
 act(()=>{view.UNSAFE_getByType(FAB).props.actions.find((x:any)=>x.key==='delete').onPress();});
 await act(async()=>{await view.UNSAFE_getByType(InboxModals).props.onDelete('filtered');});
 await waitFor(()=>expect(deleteInboxBatch).toHaveBeenCalledWith('signed-snapshot','filtered',expect.objectContaining({sort:'date',direction:'desc'})));
});
it('renders a retryable error instead of a false empty inbox',async()=>{
 (fetchInbox as jest.Mock).mockRejectedValue(new Error('offline'));const view=render(<NotificationsScreen/>);
 await view.findByText('inbox.error');expect(view.queryByText('inbox.emptyTitle')).toBeNull();
});

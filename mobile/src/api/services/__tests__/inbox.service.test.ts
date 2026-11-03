import {request,ApiError} from '../../client';
import {fetchInbox,deleteInboxItem,deleteInboxBatch} from '../inbox.service';
jest.mock('../../client',()=>({request:jest.fn(),ApiError:jest.requireActual('../../client').ApiError}));
const envelope=()=>({status:'success',data:{items:[{id:'1',source:'task',channel:'push',kind:'tasks_due',payload:{count:2},created_at:'2026-11-03T12:00:00Z'}],next_cursor:null,total:1,snapshot:'signed'}});
beforeEach(()=>{jest.clearAllMocks();(request as jest.Mock).mockResolvedValue(envelope());});
it('requests an authenticated filtered page and parses dates and channels',async()=>{
 const result=await fetchInbox({source:'task',timezone:'Europe/Warsaw'},'signed cursor');
 expect(request).toHaveBeenCalledWith('/profile/inbox/?source=task&timezone=Europe%2FWarsaw&cursor=signed%20cursor','GET',undefined,{auth:true});
 expect(result.items[0]).toMatchObject({id:'1',source:'task',channel:'push',createdAt:'2026-11-03T12:00:00Z'});
 expect(result.snapshot).toBe('signed');
});
it.each([null,{data:{}},{data:{items:[],total:0,next_cursor:null}}])('rejects a malformed response without inventing entries',async(value)=>{
 (request as jest.Mock).mockResolvedValue(value);await expect(fetchInbox()).rejects.toBeInstanceOf(ApiError);
});
it('rejects malformed notification dates and unknown channel names',async()=>{
 for(const bad of [{created_at:'invalid'},{channel:'sms'},{source:'other'}]){
  const raw=envelope();Object.assign(raw.data.items[0],bad);(request as jest.Mock).mockResolvedValue(raw);await expect(fetchInbox()).rejects.toBeInstanceOf(ApiError);
 }
});
it('deletes with authentication and a signed loaded snapshot',async()=>{
 await deleteInboxItem('1');expect(request).toHaveBeenLastCalledWith('/profile/inbox/1/','DELETE',undefined,{auth:true});
 (request as jest.Mock).mockResolvedValue({data:{deleted:3}});
 expect(await deleteInboxBatch('snapshot','filtered',{channel:'email'})).toBe(3);
 expect(request).toHaveBeenLastCalledWith('/profile/inbox/delete/','POST',{snapshot:'snapshot',scope:'filtered',filters:{channel:'email'}},{auth:true});
 await expect(deleteInboxItem('../2')).rejects.toThrow('Invalid notification ID');
});

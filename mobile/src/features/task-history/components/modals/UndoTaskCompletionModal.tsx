import React,{useEffect,useRef,useState} from "react";
import {View,Text,Pressable,StyleSheet} from "../../../../shared/theme/native";
import {useTranslation} from "react-i18next";
import AppModalFrame from "../../../../shared/ui/AppModalFrame";
import {undoReminderTask} from "../../../../api/services/reminders.service";
import type {TaskHistoryItem} from "../../types/task-history.types";

export default function UndoTaskCompletionModal({visible,item,onClose,onSaved,onConflict}:{
 visible:boolean;item:TaskHistoryItem|null;onClose:()=>void;onSaved:()=>void;onConflict:()=>void;
}){
 const {t}=useTranslation();const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const generation=useRef(0);const active=useRef("");active.current=visible && item ? `${item.id}:${item.undoCompletion}` : "";
 useEffect(()=>{generation.current++;setBusy(false);setError("");return()=>{generation.current++;};},[visible,item?.id,item?.undoCompletion]);
 const close=()=>{if(!busy)onClose();};
 const confirm=async()=>{
  if(busy || !item?.undoCompletion)return;
  const request=generation.current,target=active.current;setBusy(true);setError("");
  try{
   await undoReminderTask(Number(item.id),item.undoCompletion);
   if(request!==generation.current || target!==active.current)return;
   setBusy(false);onClose();onSaved();
  }catch(failure:any){
   if(request!==generation.current || target!==active.current)return;
   setBusy(false);
   if(failure?.status===409 || failure?.status===404){onClose();onConflict();}
   else setError(String(t("taskHistory.undo.failed",{defaultValue:"Could not undo completion. Please try again."})));
  }
 };
 return <AppModalFrame visible={visible && !!item} centerContent onClose={close}
   title={String(t("taskHistory.undo.title",{defaultValue:"Undo completion"}))}>
  <View style={s.content}>
   <Text style={s.plant}>{item?.plant}</Text>
   <Text style={s.text}>{t("taskHistory.undo.description",{defaultValue:"Reopen this task with its original due date and remove the unchanged next task created by its completion. The reminder stays unchanged. Any XP awarded is reversed for the person who completed it. The completion note is removed and the earlier task note is restored. Already delivered notifications cannot be recalled."})}</Text>
   {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
   <View style={s.row}>
    <Pressable accessibilityRole="button" disabled={busy} style={s.button} onPress={close}>
     <Text style={s.buttonText}>{t("taskHistoryModals.common.cancel",{defaultValue:"Cancel"})}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{disabled:busy}}
      style={[s.button,s.primary,busy && s.disabled]} onPress={confirm}>
     <Text style={s.buttonText}>{t("taskHistory.undo.confirm",{defaultValue:"Undo"})}</Text>
    </Pressable>
   </View>
  </View>
 </AppModalFrame>;
}
const s=StyleSheet.create({content:{marginHorizontal:16,gap:18},plant:{color:"#FFFFFF",fontSize:16,fontWeight:"800"},
 text:{color:"#FFFFFF",fontSize:14,lineHeight:21},error:{color:"#FFAAAA",fontSize:14},row:{flexDirection:"row",gap:10},
 button:{flex:1,minWidth:0,minHeight:44,borderRadius:20,paddingVertical:12,paddingHorizontal:14,backgroundColor:"rgba(255,255,255,0.14)",alignItems:"center",justifyContent:"center"},
 primary:{backgroundColor:"#0B7285"},disabled:{opacity:0.4},buttonText:{color:"#FFFFFF",fontSize:14,fontWeight:"800",textAlign:"center",flexShrink:1}});

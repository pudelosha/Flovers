import React, { useEffect, useRef, useState } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from "../../../../shared/theme/native";
import MaterialCommunityIcons from "../../../../shared/theme/Icon";
import { useTranslation } from "react-i18next";
import AppModalFrame from "../../../../shared/ui/AppModalFrame";
import { useSettings } from "../../../../app/providers/SettingsProvider";
import { postponeReminderTask } from "../../../../api/services/reminders.service";

let DateTimePicker: any = null;
try { DateTimePicker = require("../../../../shared/theme/DateTimePicker").default; } catch {}

export type PostponeTaskTarget = { id: string; plant: string; dueDate: string | Date };
const isoDate = (date: Date) => `${String(date.getFullYear()).padStart(4,"0")}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export function formatPostponeDate(iso: string, pattern: string) {
  const [year,month,day]=iso.split("-");
  return pattern.replace("YYYY",year).replace("MM",month).replace("DD",day);
}
export function parsePostponeDate(text: string, pattern: string): Date | null {
  if (text.length!==pattern.length) return null;
  const y=pattern.indexOf("YYYY"),m=pattern.indexOf("MM"),d=pattern.indexOf("DD");
  if (Math.min(y,m,d)<0) return null;
  const iso=`${text.slice(y,y+4)}-${text.slice(m,m+2)}-${text.slice(d,d+2)}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date=new Date(`${iso}T12:00:00`);
  return Number.isFinite(date.getTime()) && isoDate(date)===iso && formatPostponeDate(iso,pattern)===text ? date : null;
}

export default function PostponeTaskModal({ visible, task, onClose, onSaved, onConflict }: {
  visible: boolean; task: PostponeTaskTarget | null;
  onClose:()=>void; onSaved:()=>void; onConflict:()=>void;
}) {
  const {t,i18n}=useTranslation();
  const {settings}=useSettings();
  const pattern=settings.dateFormat || "DD.MM.YYYY";
  const dueISO=task?.dueDate instanceof Date ? isoDate(task.dueDate) : String(task?.dueDate ?? "").slice(0,10);
  const today=new Date(); today.setHours(0,0,0,0);
  const tomorrow=new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  const afterDue=new Date(`${dueISO}T12:00:00`);afterDue.setDate(afterDue.getDate()+1);afterDue.setHours(0,0,0,0);
  const minimum=Number.isFinite(afterDue.getTime()) && afterDue>today ? afterDue : today;
  const initial=minimum>tomorrow ? minimum : tomorrow;
  const [dateText,setDateText]=useState(()=>formatPostponeDate(isoDate(initial),pattern));
  const [picker,setPicker]=useState(false);
  const [working,setWorking]=useState(false);
  const [error,setError]=useState("");
  const generation=useRef(0);
  const activeTarget=useRef("");
  activeTarget.current=visible && task ? `${task.id}:${dueISO}` : "";
  useEffect(()=>{
    generation.current+=1;
    if(visible){setDateText(formatPostponeDate(isoDate(initial),pattern));setWorking(false);setPicker(false);setError("");}
    return ()=>{generation.current+=1;};
  },[visible,task?.id,dueISO,pattern]);
  const selected=parsePostponeDate(dateText,pattern);
  const selectedISO=selected ? isoDate(selected) : "";
  const valid=!!task && /^\d{4}-\d{2}-\d{2}$/.test(dueISO) && !!selected && selectedISO>dueISO && selectedISO>=isoDate(today);
  const close=()=>{if(!working){Keyboard.dismiss();setPicker(false);onClose();}};
  const submit=async()=>{
    if(!valid || working || !task) return;
    Keyboard.dismiss();setWorking(true);setError("");
    const request=generation.current;
    const target=activeTarget.current;
    try {
      await postponeReminderTask(Number(task.id),selectedISO,dueISO);
      if(request!==generation.current || target!==activeTarget.current) return;
      setWorking(false);onClose();onSaved();
    } catch(failure:any) {
      if(request!==generation.current || target!==activeTarget.current) return;
      setWorking(false);
      if(failure?.status===409 || failure?.status===404){onClose();onConflict();}
      else setError(failure?.body?.code === "invalid_due_date"
        ? String(t("homeModals.postpone.invalidDate",{defaultValue:"Choose a valid date after the current due date, not in the past."}))
        : String(t("homeModals.postpone.failed",{defaultValue:"Could not postpone the task. Please try again."})));
    }
  };
  return <AppModalFrame visible={visible && !!task} title={String(t("homeModals.postpone.title",{defaultValue:"Postpone task"}))}
    onClose={close} centerContent>
    <View style={s.content}>
      <Text style={s.plant}>{task?.plant}</Text>
      <Text style={s.description}>{t("homeModals.postpone.description",{defaultValue:"Change only this task's due date. The reminder's start date and recurring interval stay unchanged."})}</Text>
      <Text style={s.description}>{t("homeModals.postpone.currentDue",{defaultValue:"Current due date: {{date}}",date:dueISO ? formatPostponeDate(dueISO,pattern) : ""})}</Text>
      <View style={s.row}>
        {[1,2,3].map(days=>{
          const date=new Date(today);date.setDate(date.getDate()+days);
          const iso=isoDate(date);const disabled=working || iso<=dueISO;
          const key=days===1 ? "tomorrow" : days===2 ? "inTwoDays" : "inThreeDays";
          return <Pressable key={days} accessibilityRole="button" disabled={disabled}
            accessibilityState={{disabled}} style={[s.button,s.shortcut,iso===selectedISO && s.primary,disabled && s.disabled]}
            onPress={()=>{setDateText(formatPostponeDate(iso,pattern));setError("");}}>
            <Text style={s.buttonText}>{t(`homeModals.postpone.${key}`,{defaultValue:days===1 ? "Tomorrow" : `In ${days} days`})}</Text>
          </Pressable>;
        })}
      </View>
      <Text style={s.label}>{t("homeModals.postpone.dueDate",{defaultValue:"New due date"})}</Text>
      <View style={s.dateField}>
        <TextInput value={dateText} onChangeText={value=>{setDateText(value);setError("");}} editable={!working}
          accessibilityLabel={String(t("homeModals.postpone.dueDate",{defaultValue:"New due date"}))}
          placeholder={pattern} placeholderTextColor="rgba(255,255,255,0.5)" autoCorrect={false}
          keyboardType={Platform.OS==="ios" ? "numbers-and-punctuation" : "default"} style={s.input}/>
        {!!DateTimePicker && <Pressable accessibilityRole="button" disabled={working} style={s.calendar}
          accessibilityLabel={String(t("homeModals.postpone.chooseDate",{defaultValue:"Choose date"}))}
          onPress={()=>{Keyboard.dismiss();setPicker(value=>!value);}}>
          <MaterialCommunityIcons name="calendar" size={24} color="#FFFFFF"/>
        </Pressable>}
      </View>
      {!valid && <Text accessibilityRole="alert" style={s.error}>{t("homeModals.postpone.invalidDate",{defaultValue:"Choose a valid date after the current due date, not in the past."})}</Text>}
      {picker && !!DateTimePicker && <View>
        <DateTimePicker value={selected && selected>=minimum ? selected : initial} minimumDate={minimum}
          mode="date" display={Platform.OS==="ios" ? "inline" : "default"} themeVariant="dark" locale={i18n?.language}
          onChange={(event:any,date?:Date)=>{
            if(Platform.OS!=="ios")setPicker(false);
            if(event?.type!=="dismissed" && date){setDateText(formatPostponeDate(isoDate(date),pattern));setError("");}
          }}/>
        {Platform.OS==="ios" && <Pressable accessibilityRole="button" style={s.button} onPress={()=>setPicker(false)}>
          <Text style={s.buttonText}>{t("sharing.common.close",{defaultValue:"Close"})}</Text>
        </Pressable>}
      </View>}
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <View style={s.row}>
        <Pressable accessibilityRole="button" disabled={working} style={[s.button,s.half]} onPress={close}>
          <Text style={s.buttonText}>{t("homeModals.common.cancel",{defaultValue:"Cancel"})}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={!valid || working} accessibilityState={{disabled:!valid || working}}
          style={[s.button,s.half,s.primary,(!valid || working) && s.disabled]} onPress={submit}>
          <Text style={s.buttonText}>{t("homeModals.postpone.save",{defaultValue:"Postpone"})}</Text>
        </Pressable>
      </View>
    </View>
  </AppModalFrame>;
}
const s=StyleSheet.create({
 content:{marginHorizontal:16,gap:14},plant:{color:"#FFFFFF",fontSize:16,fontWeight:"800"},
 description:{color:"rgba(255,255,255,0.9)",fontSize:14,lineHeight:21},label:{color:"#FFFFFF",fontSize:14,fontWeight:"700"},
 row:{flexDirection:"row",gap:10},button:{borderRadius:16,paddingVertical:12,paddingHorizontal:14,
 backgroundColor:"rgba(255,255,255,0.14)",alignItems:"center",justifyContent:"center"},
 buttonText:{color:"#FFFFFF",fontWeight:"800",fontSize:14,textAlign:"center",flexShrink:1},
 half:{flex:1,minWidth:0},shortcut:{flex:1,minWidth:0,paddingHorizontal:6},primary:{backgroundColor:"#0B7285"},disabled:{opacity:0.4},
 dateField:{flexDirection:"row",alignItems:"center",borderRadius:16,backgroundColor:"rgba(255,255,255,0.12)",paddingHorizontal:12},
 input:{flex:1,minWidth:0,color:"#FFFFFF",fontSize:15,paddingVertical:12},calendar:{width:40,height:44,alignItems:"center",justifyContent:"center"},
 error:{color:"#FFAAAA",fontSize:14,lineHeight:20},
});

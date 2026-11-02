import React from "react";
import {View,Text,StyleSheet} from "../../../shared/theme/native";
import MaterialCommunityIcons from "../../../shared/theme/Icon";
import {useTranslation} from "react-i18next";
import {useSettings} from "../../../app/providers/SettingsProvider";
import {ACCENT_BY_TYPE,ICON_BY_TYPE} from "../../home/constants/home.constants";
import type {PlantActivity} from "../types/plant-details.types";

export function activityDateLabel(value:string,pattern:string):string{
 const date=new Date(value);if(!Number.isFinite(+date))return "";
 const day=String(date.getDate()).padStart(2,"0"),month=String(date.getMonth()+1).padStart(2,"0"),year=String(date.getFullYear());
 return `${pattern.replace("YYYY",year).replace("MM",month).replace("DD",day)} ${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;
}
export default function PlantActivityTile({items}:{items:PlantActivity[]}){
 const {t}=useTranslation();const {settings}=useSettings();
 return <View testID="plant-recent-activity">
  <Text style={s.title}>{t("plantDetails.activity.title",{defaultValue:"Activity"})}</Text>
  {items.length===0 ? <Text style={s.empty}>{t("plantDetails.activity.empty",{defaultValue:"No completed tasks yet."})}</Text>
   : <View style={s.list}>{items.slice(0,5).map((item,index)=>{
    const actor=item.actor || String(t("taskHistory.tile.unknownUser",{defaultValue:"Unknown user"}));
    const task=String(t(`plantDetails.reminders.type.${item.type}`,{defaultValue:item.type}));
    return <View key={item.id} style={[s.row,index>0 && s.separator]}>
     <View style={s.iconBubble}>
      <MaterialCommunityIcons name={ICON_BY_TYPE[item.type] || "check-circle-outline"} size={20} color={ACCENT_BY_TYPE[item.type] || "#FFFFFF"}/>
     </View>
     <View style={s.text}>
      <Text style={[s.action,{color:ACCENT_BY_TYPE[item.type] || "#FFFFFF"}]}>{task.toUpperCase()}</Text>
      <Text style={s.date}>{activityDateLabel(item.completedAt,settings.dateFormat || "DD.MM.YYYY")} · {actor}</Text>
     </View>
    </View>;
   })}</View>}
 </View>;
}
const s=StyleSheet.create({
 title:{color:"#FFFFFF",fontSize:16,fontWeight:"800",marginBottom:8},
 list:{gap:0},row:{flexDirection:"row",alignItems:"center",gap:10,paddingVertical:10},
 separator:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:"rgba(255,255,255,0.15)"},
 iconBubble:{width:32,height:32,borderRadius:16,alignItems:"center",justifyContent:"center",backgroundColor:"rgba(0,0,0,0.15)"},
 text:{flex:1,minWidth:0},action:{fontSize:13,fontWeight:"800"},
 date:{color:"rgba(255,255,255,0.9)",fontSize:12,fontWeight:"600",lineHeight:18,marginTop:2},
 empty:{color:"rgba(255,255,255,0.9)",fontSize:14,lineHeight:20}
});

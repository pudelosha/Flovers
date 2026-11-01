import React from "react";
import {View,Text,StyleSheet} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
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
   : <View style={s.list}>{items.slice(0,5).map(item=>{
    const actor=item.actor || String(t("taskHistory.tile.unknownUser",{defaultValue:"Unknown user"}));
    const task=String(t(`plantDetails.reminders.type.${item.type}`,{defaultValue:item.type}));
    return <View key={item.id} style={s.row}>
     <MaterialCommunityIcons name={ICON_BY_TYPE[item.type] || "check-circle-outline"} size={22} color={ACCENT_BY_TYPE[item.type] || "#FFFFFF"} style={s.icon}/>
     <View style={s.text}>
      <Text style={s.action}>{t("plantDetails.activity.line",{defaultValue:"{{actor}} \u00b7 {{task}}",actor,task})}</Text>
      <Text style={s.date}>{activityDateLabel(item.completedAt,settings.dateFormat || "DD.MM.YYYY")}</Text>
     </View>
    </View>;
   })}</View>}
 </View>;
}
const s=StyleSheet.create({title:{color:"#FFFFFF",fontSize:18,fontWeight:"800",marginBottom:14},
 list:{gap:14},row:{flexDirection:"row",alignItems:"flex-start",gap:12},icon:{marginTop:1},text:{flex:1,minWidth:0},
 action:{color:"#FFFFFF",fontSize:14,lineHeight:20,fontWeight:"700"},date:{color:"rgba(255,255,255,0.8)",fontSize:13,lineHeight:18,marginTop:3},
 empty:{color:"rgba(255,255,255,0.9)",fontSize:14,lineHeight:20}});

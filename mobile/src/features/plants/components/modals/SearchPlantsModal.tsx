import React,{useEffect,useState} from "react";
import {Keyboard,Pressable,StyleSheet,Text,TextInput,View} from "../../../../shared/theme/native";
import {useTranslation} from "react-i18next";
import AppModalFrame from "../../../../shared/ui/AppModalFrame";

export default function SearchPlantsModal({visible,query,onCancel,onApply}:{
 visible:boolean;query:string;onCancel:()=>void;onApply:(query:string)=>void;
}){
 const {t}=useTranslation();const [draft,setDraft]=useState(query);
 useEffect(()=>{if(visible)setDraft(query);},[visible,query]);
 const close=()=>{Keyboard.dismiss();onCancel();};
 const apply=(value:string)=>{Keyboard.dismiss();onApply(value.trim());};
 if(!visible)return null;
 return <AppModalFrame visible centerContent onClose={close}
   title={String(t("plants.search.title",{defaultValue:"Search plants"}))}>
  <View style={s.content}>
   <Text style={s.description}>{t("plants.search.description",{defaultValue:"Find a plant by its nickname, species name (including Latin name), or location. Search works with your current filters."})}</Text>
   <TextInput value={draft} onChangeText={setDraft} autoFocus maxLength={200} autoCorrect={false}
     autoCapitalize="none" returnKeyType="search" onSubmitEditing={()=>apply(draft)}
     accessibilityLabel={String(t("plants.search.input",{defaultValue:"Name, species or location"}))}
     placeholder={String(t("plants.search.input",{defaultValue:"Name, species or location"}))}
     placeholderTextColor="rgba(255,255,255,0.5)" style={s.input}/>
   {!!(draft || query) && <Pressable accessibilityRole="button" style={s.button} onPress={()=>apply("")}>
    <Text style={s.buttonText}>{t("plants.search.clear",{defaultValue:"Clear search"})}</Text>
   </Pressable>}
   <View style={s.row}>
    <Pressable accessibilityRole="button" style={[s.button,s.half]} onPress={close}>
     <Text style={s.buttonText}>{t("plantsModals.common.cancel",{defaultValue:"Cancel"})}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" style={[s.button,s.half,s.primary]} onPress={()=>apply(draft)}>
     <Text style={s.buttonText}>{t("plants.search.apply",{defaultValue:"Search"})}</Text>
    </Pressable>
   </View>
  </View>
 </AppModalFrame>;
}
const s=StyleSheet.create({content:{marginHorizontal:16,gap:16},description:{color:"rgba(255,255,255,0.9)",fontSize:14,lineHeight:21},
 input:{minWidth:0,minHeight:46,borderRadius:16,backgroundColor:"rgba(255,255,255,0.12)",color:"#FFFFFF",fontSize:15,paddingHorizontal:14,paddingVertical:12},
 row:{flexDirection:"row",gap:10},button:{minHeight:44,borderRadius:20,paddingHorizontal:14,paddingVertical:12,backgroundColor:"rgba(255,255,255,0.14)",alignItems:"center",justifyContent:"center"},
 half:{flex:1,minWidth:0},primary:{backgroundColor:"#0B7285"},buttonText:{color:"#FFFFFF",fontSize:14,fontWeight:"800",textAlign:"center",flexShrink:1}});

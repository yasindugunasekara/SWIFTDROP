import React,{useCallback,useEffect,useState} from 'react';
import {ScrollView,View,Text,Switch,TouchableOpacity,StyleSheet} from 'react-native';
import {mobileApiFetch} from '../services/api';
type Notice={id:string;title:string;message:string;isRead:boolean};
type Preferences={smsEnabled:boolean;emailEnabled:boolean;pushEnabled:boolean};
export default function NotificationsScreen({onBack}:{onBack:()=>void}){
 const [items,setItems]=useState<Notice[]>([]),[preferences,setPreferences]=useState<Preferences|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{try{const [inbox,prefs]=await Promise.all([mobileApiFetch('/notifications?limit=50'),mobileApiFetch('/notifications/preferences')]);setItems(inbox.notifications);setPreferences(prefs.preferences);setError('');}catch{setError('Unable to load notifications.');}},[]);
 useEffect(()=>{void load();},[load]);
 async function read(item:Notice){try{await mobileApiFetch(`/notifications/${item.id}/read`,{method:'PATCH'});await load();}catch{setError('Unable to mark notification as read.');}}
 async function change(key:keyof Preferences,value:boolean){setBusy(true);try{const result=await mobileApiFetch('/notifications/preferences',{method:'PUT',body:JSON.stringify({[key]:value})});setPreferences(result.preferences);setError('');}catch{setError('Preferences were not saved.');}finally{setBusy(false);}}
 return <ScrollView contentContainerStyle={s.page}><TouchableOpacity onPress={onBack}><Text>Back</Text></TouchableOpacity><Text style={s.title}>Notifications</Text><TouchableOpacity onPress={()=>void load()}><Text>Refresh</Text></TouchableOpacity>{error?<Text accessibilityRole="alert">{error}</Text>:null}
 {preferences?<View style={s.card}><Text style={s.bold}>Channel preferences</Text><Text>SMS uses a mock mailbox. Email and push preferences are saved; external delivery is not configured.</Text>{(['smsEnabled','emailEnabled','pushEnabled'] as const).map(key=><View key={key} style={s.row}><Text>{key.replace('Enabled','')}</Text><Switch accessibilityLabel={key} value={preferences[key]} disabled={busy} onValueChange={value=>void change(key,value)}/></View>)}</View>:null}
 {!items.length?<Text>No notifications yet.</Text>:items.map(item=><TouchableOpacity key={item.id} style={s.card} onPress={()=>void read(item)}><Text style={s.bold}>{item.isRead?'':'Unread: '}{item.title}</Text><Text>{item.message}</Text></TouchableOpacity>)}</ScrollView>;
}
const s=StyleSheet.create({page:{padding:24,gap:16},title:{fontSize:25,fontWeight:'700'},bold:{fontWeight:'700'},card:{padding:18,borderWidth:1,borderColor:'#e2e8f0',borderRadius:12,gap:10},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}});

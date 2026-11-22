import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,TouchableOpacity,ScrollView,StyleSheet} from 'react-native';
import {mobileApiFetch} from '../services/api';
type Snapshot={trackingNumber:string;statusLabel:string;lastUpdatedAt:string|null;events:{status:string;label:string;location:string|null;timestamp:string|null}[]};
export default function TrackScreen({initialTrackingId=''}:{initialTrackingId?:string}){
  const [draft,setDraft]=useState(initialTrackingId),[tracking,setTracking]=useState(initialTrackingId),[data,setData]=useState<Snapshot|null>(null),[error,setError]=useState('');
  useEffect(()=>{setDraft(initialTrackingId);setTracking(initialTrackingId);},[initialTrackingId]);
  useEffect(()=>{let active=true;const controller=new AbortController();setData(null);setError('');
    const load=async()=>{if(!tracking)return;try{const result=await mobileApiFetch(`/tracking/public/${encodeURIComponent(tracking.trim().toUpperCase())}`,{signal:controller.signal});if(active){setData(result);setError('');}}catch{if(active)setError('Unable to load tracking. Check the number and retry.');}};
    void load();const timer=setInterval(()=>void load(),15000);return()=>{active=false;controller.abort();clearInterval(timer);};
  },[tracking]);
  return <ScrollView contentContainerStyle={s.page}><Text style={s.title}>Track your parcel</Text><TextInput accessibilityLabel="Tracking number" value={draft} onChangeText={setDraft} autoCapitalize="characters" placeholder="SWIFT tracking number" style={s.input}/><TouchableOpacity onPress={()=>setTracking(draft.trim().toUpperCase())} style={s.button}><Text>Track parcel</Text></TouchableOpacity>{error?<Text accessibilityRole="alert">{error}</Text>:null}{data?<><Text style={s.title}>{data.statusLabel}</Text><Text>{data.trackingNumber}</Text>{data.events.map((event,i)=><View style={s.card} key={`${event.status}-${i}`}><Text style={s.bold}>{event.label}</Text><Text>{event.location}</Text><Text>{event.timestamp?new Date(event.timestamp).toLocaleString():''}</Text></View>)}</>:tracking&&!error?<Text>Loading live tracking…</Text>:null}</ScrollView>;
}
const s=StyleSheet.create({page:{padding:24,gap:16},title:{fontSize:25,fontWeight:'700'},bold:{fontWeight:'700'},input:{borderWidth:1,borderColor:'#cbd5e1',borderRadius:10,padding:14},button:{padding:15,backgroundColor:'#ff9900',borderRadius:10},card:{padding:16,borderWidth:1,borderColor:'#e2e8f0',borderRadius:12,gap:6}});

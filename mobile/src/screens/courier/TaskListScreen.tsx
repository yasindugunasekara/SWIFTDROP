import React,{useCallback,useEffect,useState} from 'react';
import {ScrollView,View,Text,TouchableOpacity,StyleSheet,TextInput} from 'react-native';
import {mobileApiFetch} from '../../services/api';
import ProofPhotoScreen from './ProofPhotoScreen';
type Job={id:string;trackingNumber:string;recipientName:string;deliveryAddress:string;status:string;latestProof?:{photoUrl:string}};
const next:Record<string,string>={ASSIGNED:'PICKED_UP',PICKED_UP:'IN_TRANSIT',IN_TRANSIT:'OUT_FOR_DELIVERY',OUT_FOR_DELIVERY:'DELIVERED',FAILED:'OUT_FOR_DELIVERY'};
export default function TaskListScreen(_props:{navigation?:unknown}){
  const [jobs,setJobs]=useState<Job[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[proof,setProof]=useState<{job:Job;failure:boolean}|null>(null),[notes,setNotes]=useState<Record<string,string>>({});
  const load=useCallback(async()=>{setLoading(true);try{const result=await mobileApiFetch('/courier/jobs');setJobs(result.assignedJobs);setError('');}catch{setError('Unable to load assigned deliveries.');}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  async function update(job:Job){
    if(next[job.status]==='DELIVERED'){setProof({job,failure:false});return;}
    setBusy(true);try{await mobileApiFetch(`/courier/jobs/${job.id}/status`,{method:'PATCH',body:JSON.stringify({status:next[job.status],note:notes[job.id]})});await load();}catch{setError('Delivery was not updated. Please retry.');}finally{setBusy(false);}
  }
  if(proof)return <ProofPhotoScreen parcelId={proof.job.id} isFailure={proof.failure} onCancel={()=>setProof(null)} onComplete={()=>{setProof(null);void load();}}/>;
  return <ScrollView contentContainerStyle={s.page}><Text style={s.title}>Today’s deliveries</Text><TouchableOpacity onPress={()=>void load()}><Text>Refresh</Text></TouchableOpacity>{error?<Text accessibilityRole="alert">{error}</Text>:null}{loading?<Text>Loading…</Text>:!jobs.length?<Text>No assigned deliveries today.</Text>:jobs.map(job=><View style={s.card} key={job.id}><Text style={s.bold}>{job.trackingNumber}</Text><Text>{job.recipientName}</Text><Text>{job.deliveryAddress}</Text><Text>{job.status.replace(/_/g,' ')}</Text>{next[job.status]?<><TextInput accessibilityLabel="Delivery note" placeholder="Delivery note" value={notes[job.id]||''} maxLength={2000} onChangeText={value=>setNotes({...notes,[job.id]:value})} style={s.input}/><TouchableOpacity disabled={busy} style={s.button} onPress={()=>void update(job)}><Text>{next[job.status].replace(/_/g,' ')}</Text></TouchableOpacity>{['PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY'].includes(job.status)?<TouchableOpacity disabled={busy} onPress={()=>setProof({job,failure:true})}><Text>Report failed delivery</Text></TouchableOpacity>:null}</>:null}</View>)}</ScrollView>;
}
const s=StyleSheet.create({page:{padding:24,gap:16},title:{fontSize:25,fontWeight:'700'},bold:{fontWeight:'700'},input:{padding:12,borderWidth:1,borderColor:'#cbd5e1',borderRadius:8},button:{padding:14,borderRadius:8,backgroundColor:'#ff9900'},card:{padding:18,borderWidth:1,borderColor:'#e2e8f0',borderRadius:12,gap:12}});

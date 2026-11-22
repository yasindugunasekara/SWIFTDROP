import React,{useRef,useState} from 'react';
import {View,Text,TouchableOpacity,TextInput,ScrollView,Image,Platform,StyleSheet} from 'react-native';
import {CameraView,useCameraPermissions} from 'expo-camera';
import {mobileApiFetch} from '../../services/api';
export default function ProofPhotoScreen({parcelId,isFailure=false,onComplete,onCancel}:{parcelId:string;isFailure?:boolean;onComplete:()=>void;onCancel:()=>void}){
  const [permission,requestPermission]=useCameraPermissions(),camera=useRef<CameraView>(null);
  const [uri,setUri]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function capture(){try{const photo=await camera.current?.takePictureAsync({quality:.65});if(photo)setUri(photo.uri);}catch{setError('Unable to capture photo.');}}
  async function confirm(){
    if(isFailure&&!reason.trim()){setError('Enter the reason for this failed delivery.');return;}
    if(!isFailure&&!uri){setError('Capture a proof photo first.');return;}
    setBusy(true);setError('');
    try {
      if(uri){const body=new FormData();if(Platform.OS==='web'){body.append('photo',await(await fetch(uri)).blob(),'proof.jpg');}else{body.append('photo',{uri,name:'proof.jpg',type:'image/jpeg'} as unknown as Blob);}
        await mobileApiFetch(`/courier/jobs/${parcelId}/proof`,{method:'POST',body});}
      await mobileApiFetch(`/courier/jobs/${parcelId}/${isFailure?'fail':'status'}`,{method:isFailure?'POST':'PATCH',body:JSON.stringify(isFailure?{failureReason:reason}:{status:'DELIVERED',note:reason})});
      onComplete();
    }catch{setError('Delivery was not saved. Check your connection and retry.');}finally{setBusy(false);}
  }
  return <ScrollView contentContainerStyle={s.page}><TouchableOpacity disabled={busy} onPress={onCancel}><Text>Back to deliveries</Text></TouchableOpacity><Text style={s.title}>{isFailure?'Report failed delivery':'Delivery proof'}</Text>
    {error?<Text accessibilityRole="alert">{error}</Text>:null}
    {uri?<><Image source={{uri}} style={s.camera}/><TouchableOpacity onPress={()=>setUri('')}><Text>Retake photo</Text></TouchableOpacity></>:permission?.granted?<><CameraView ref={camera} facing="back" style={s.camera}/><TouchableOpacity style={s.button} onPress={()=>void capture()}><Text>Capture doorstep photo</Text></TouchableOpacity></>:<TouchableOpacity style={s.button} onPress={()=>void requestPermission()}><Text>Allow camera access</Text></TouchableOpacity>}
    <TextInput accessibilityLabel={isFailure?'Failure reason':'Delivery note'} placeholder={isFailure?'Required failure reason':'Delivery note'} value={reason} maxLength={2000} onChangeText={setReason} style={s.input}/>
    <TouchableOpacity disabled={busy} style={s.button} onPress={()=>void confirm()}><Text>{busy?'Saving…':'Confirm delivery record'}</Text></TouchableOpacity></ScrollView>;
}
const s=StyleSheet.create({page:{padding:24,gap:18},title:{fontSize:25,fontWeight:'700'},camera:{height:320,width:'100%',borderRadius:12},button:{backgroundColor:'#ff9900',padding:16,borderRadius:10},input:{borderWidth:1,borderColor:'#cbd5e1',padding:14,borderRadius:10}});

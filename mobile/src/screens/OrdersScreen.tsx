import React,{useCallback,useEffect,useState} from 'react';
import {ScrollView,Text,TouchableOpacity,StyleSheet} from 'react-native';
import {mobileApiFetch} from '../services/api';
type Order={id:string;trackingNumber:string;recipientName:string;dropoffAddress:string;status:string;totalFee:number};
export default function OrdersScreen({onTrackOrder}:{onTrackOrder:(id:string)=>void}){
  const [orders,setOrders]=useState<Order[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const load=useCallback(async()=>{setLoading(true);try{const result=await mobileApiFetch('/booking/list');setOrders(result.parcels);setError('');}catch{setError('Unable to load your orders.');}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  return <ScrollView contentContainerStyle={s.page}><Text style={s.title}>My orders</Text><TouchableOpacity onPress={()=>void load()}><Text>Refresh</Text></TouchableOpacity>{error?<Text accessibilityRole="alert">{error}</Text>:null}{loading?<Text>Loading orders…</Text>:!orders.length?<Text>No orders yet.</Text>:orders.map(order=><TouchableOpacity key={order.id} style={s.card} onPress={()=>onTrackOrder(order.trackingNumber)}><Text style={s.bold}>{order.trackingNumber}</Text><Text>{order.recipientName}</Text><Text>{order.dropoffAddress}</Text><Text>{order.status.replace(/_/g,' ')}</Text><Text>LKR {Number(order.totalFee).toFixed(2)}</Text><Text>View tracking</Text></TouchableOpacity>)}</ScrollView>;
}
const s=StyleSheet.create({page:{padding:24,gap:16},title:{fontSize:25,fontWeight:'700'},bold:{fontWeight:'700'},card:{padding:18,borderWidth:1,borderColor:'#e2e8f0',borderRadius:12,gap:6}});

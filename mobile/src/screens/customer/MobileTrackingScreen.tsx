import React from 'react';
import TrackScreen from '../TrackScreen';
export default function MobileTrackingScreen({route}:{route?:{params?:{trackingId?:string}}}){return <TrackScreen initialTrackingId={route?.params?.trackingId||''}/>;}

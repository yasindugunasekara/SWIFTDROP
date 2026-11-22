import styles from './auth.module.css';

export default function AuthVisual({ register = false }: { register?: boolean }) {
  return <aside className={styles.visual} aria-label="SwiftDrop delivery workspace">
    <div className={styles.visualTop}><span className={styles.visualMark}>S<span>↗</span></span><span>MADE FOR EVERY MILE</span></div>
    <div className={styles.visualCopy}><p>YOUR DELIVERY. OUR PRIORITY.</p><h2>{register ? <>A little parcel.<br />A world of<br /><em>possibilities.</em></> : <>Every delivery.<br />One connected<br /><em>workspace.</em></>}</h2><p>{register ? 'Send with confidence, deliver with purpose, or grow your business. Your journey starts here.' : 'Book a pickup, follow your parcels and keep your deliveries moving. All in one place.'}</p></div>
    <div className={styles.journey} aria-hidden="true"><div className={styles.journeyLine}/><span className={styles.journeyDot}/><div className={styles.parcel}><span className={styles.parcelTape}/><span className={styles.parcelLabel}>swiftdrop<span>.</span><small>HANDLE WITH CARE ↗</small></span></div><span className={styles.journeyEnd}>↗</span><div className={styles.journeyTag}><i/>Connected from pickup to doorstep</div></div>
    <div className={styles.visualFooter}><span>Send. Track. Deliver.</span><span>Built for Sri Lanka ↗</span></div>
  </aside>;
}

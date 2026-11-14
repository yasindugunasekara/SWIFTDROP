import styles from './loading-state.module.css';

export default function LoadingState({ label = 'Loading...', fullScreen = false }: { label?: string; fullScreen?: boolean }) {
  return <div className={fullScreen ? styles.screen : styles.inline} role="status" aria-live="polite" aria-label={label}>
    <div className={styles.content}>
      <div className={styles.mark} aria-hidden="true">
        <span className={styles.orbit} />
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.25l8 4.5" />
        </svg>
      </div>
      {fullScreen && <span className={styles.brand}>swiftdrop<span>.</span></span>}
      <span className={styles.label}>{label}</span>
      <span className={styles.dots} aria-hidden="true"><i /><i /><i /></span>
    </div>
  </div>;
}

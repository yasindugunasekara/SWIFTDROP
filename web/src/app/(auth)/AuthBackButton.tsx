'use client';

import { useRouter } from 'next/navigation';
import styles from './auth.module.css';

export default function AuthBackButton() {
  const router = useRouter();

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  return (
    <button type="button" onClick={goBack} className={styles.back} aria-label="Go back">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m12 19-7-7 7-7M5 12h14" />
      </svg>
      Back
    </button>
  );
}

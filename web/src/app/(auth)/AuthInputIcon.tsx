const paths = {
  email: 'M4 5h16v14H4z M4 6l8 6 8-6',
  password: 'M5 10h14v10H5z M8 10V7a4 4 0 0 1 8 0v3 M12 14v2',
  name: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M5 21v-2a7 7 0 0 1 14 0v2',
  company: 'M4 21V5l8-3v19 M12 8h8v13 M2 21h20 M8 7v1 M8 12v1 M8 17v1 M16 12h1 M16 16h1',
};

export default function AuthInputIcon({ kind }: { kind: keyof typeof paths }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[kind]} />
    </svg>
  );
}

// This workspace renders only after the browser verifies its private session.
// It cannot participate in validation of an unauthenticated prefetched shell.
import AdminNav from './_components/AdminNav';
export const instant = false;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminNav>{children}</AdminNav>;
}

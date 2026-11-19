import LoadingState from '../components/ui/LoadingState';
import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "../components/layout/Navbar";
import AuthBoundary from "../components/layout/AuthBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "swiftdrop. | Send Anything. Anywhere.",
  description: "Fast, reliable, and affordable parcel delivery for individuals and businesses.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
        <main>
          <Suspense fallback={<LoadingState fullScreen />}>
            <AuthBoundary>{children}</AuthBoundary>
          </Suspense>
        </main>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Navbar from "../components/layout/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "SwiftDrop | Courier & Parcel Delivery System",
  description: "Enterprise courier parcel-delivery and tracking platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#090d16', color: '#f1f5f9', minHeight: '100vh' }}>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Navbar from "../components/layout/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "swiftdrop. | Send Anything. Anywhere.",
  description: "Fast, reliable, and affordable parcel delivery for individuals and businesses.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}

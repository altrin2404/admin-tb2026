import type { Metadata, Viewport } from "next";
import "./globals.css";
import TopNav from "@/components/TopNav";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "TechBETA 2026 Admin",
  description: "Official administrative management system, live attendance check-in station, master directory, and event coordinator portal for TechBETA 2026 2.0.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased selection:bg-blue-100 selection:text-blue-900">
        <TopNav />
        <main className="flex-1 w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-8 pb-16 sm:pb-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 px-4">
          <p>TechBETA 2026 2.0 &copy; St. Xavier&apos;s Catholic College of Engineering — Department of Information Technology</p>
        </footer>
      </body>
    </html>
  );
}

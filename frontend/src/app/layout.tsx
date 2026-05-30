import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Quotation Estimator",
  description: "Get Instant Project Cost Estimates with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <nav className="glass sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
          <div className="text-xl font-bold text-gradient">AI Quotation</div>
          <div className="flex gap-4">
            <a href="/" className="hover:text-purple-500 transition-colors">Home</a>
            <a href="/estimator" className="hover:text-purple-500 transition-colors">Get Quote</a>
            <a href="/login" className="hover:text-purple-500 transition-colors">Admin</a>
          </div>
        </nav>
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="py-6 text-center text-sm text-slate-500 border-t border-slate-200 dark:border-slate-800 mt-auto">
          &copy; {new Date().getFullYear()} AI Quotation Estimator. All rights reserved.
        </footer>
      </body>
    </html>
  );
}

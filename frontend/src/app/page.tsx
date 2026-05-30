import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      <header className="p-6 flex justify-between items-center border-b border-slate-800">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          FirmwareOS
        </h1>
        <nav className="space-x-4">
          <Link href="/login" className="text-slate-300 hover:text-white transition-colors">Login</Link>
          <Link href="/dashboard" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
            Get Started
          </Link>
        </nav>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <h2 className="text-5xl font-extrabold mb-6">
          Analyze Firmware Logs Instantly
        </h2>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl">
          Paste or upload your embedded logs and let our AI engine identify root causes, explain errors, and suggest fixes in seconds.
        </p>
        <Link href="/dashboard" className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-8 py-4 rounded-lg text-lg font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all hover:-translate-y-1">
          Launch AI Analyzer
        </Link>
      </main>
    </div>
  );
}

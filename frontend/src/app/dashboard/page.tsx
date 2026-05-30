"use client";

import { useState } from 'react';
import { Upload, Play, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function Dashboard() {
  const [log, setLog] = useState('');
  const [platform, setPlatform] = useState('Arduino');
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleAnalyze = () => {
    setAnalyzing(true);
    // Simulate API call
    setTimeout(() => {
      setResults({
        summary: "Syntax error: missing semicolon before '}' token.",
        rootCause: "A line of code inside the loop() function is missing a semicolon at the end.",
        severity: "High",
        fix: "Add a semicolon ';' to line 42.",
        prevention: "Always check for semicolons at the end of statements in C/C++."
      });
      setAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col">
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-8">
          FirmwareOS
        </h2>
        <nav className="flex-1 space-y-4">
          <a href="#" className="flex items-center space-x-2 text-blue-400 font-medium">
            <Play size={20} />
            <span>Analyzer</span>
          </a>
          <a href="#" className="flex items-center space-x-2 text-slate-400 hover:text-slate-200 transition-colors">
            <AlertTriangle size={20} />
            <span>History</span>
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 flex flex-col overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold">AI Log Analyzer</h1>
          <div className="flex space-x-4 items-center">
            <select 
              value={platform} 
              onChange={(e) => setPlatform(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Arduino</option>
              <option>ESP32</option>
              <option>STM32</option>
              <option>Raspberry Pi Pico</option>
            </select>
            <button 
              onClick={handleAnalyze}
              disabled={!log || analyzing}
              className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white px-6 py-2 rounded-md font-medium shadow-lg transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {analyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Analyze</span>
                </>
              )}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
          {/* Editor Area */}
          <div className="flex flex-col space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4 text-slate-400 text-sm">
                <span>Paste your logs below</span>
                <button className="flex items-center space-x-1 hover:text-white transition-colors">
                  <Upload size={14} />
                  <span>Upload .log</span>
                </button>
              </div>
              <textarea 
                value={log}
                onChange={(e) => setLog(e.target.value)}
                placeholder="Paste firmware error logs here..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-sm text-slate-300 focus:outline-none focus:border-blue-500 resize-none"
              ></textarea>
            </div>
          </div>

          {/* Results Area */}
          <div className="flex flex-col">
            {!results && !analyzing && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-700 rounded-xl bg-slate-900/50 backdrop-blur-sm">
                <Info size={48} className="mb-4 opacity-50" />
                <p>Submit a log to see AI analysis results.</p>
              </div>
            )}

            {analyzing && (
              <div className="flex-1 flex flex-col items-center justify-center text-blue-400 border border-slate-800 rounded-xl bg-slate-900/50 backdrop-blur-sm">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="animate-pulse">Analyzing firmware context...</p>
              </div>
            )}

            {results && !analyzing && (
              <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                {/* Premium Cards */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-red-500/30 rounded-xl p-6 shadow-lg shadow-red-500/10">
                  <h3 className="text-red-400 font-semibold mb-2 flex items-center"><AlertTriangle size={18} className="mr-2"/> Error Summary</h3>
                  <p className="text-slate-300">{results.summary}</p>
                </div>
                
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl p-6">
                  <h3 className="text-blue-400 font-semibold mb-2">Root Cause</h3>
                  <p className="text-slate-300">{results.rootCause}</p>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 rounded-xl p-6 shadow-lg shadow-emerald-500/10">
                  <h3 className="text-emerald-400 font-semibold mb-2 flex items-center"><CheckCircle size={18} className="mr-2"/> Suggested Fix</h3>
                  <p className="text-slate-300">{results.fix}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

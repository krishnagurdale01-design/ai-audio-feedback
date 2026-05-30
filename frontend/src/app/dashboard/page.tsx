"use client";

import { useState } from 'react';
import { Upload, Play, AlertTriangle, CheckCircle, Info, Search, Calendar, FileText } from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('analyzer');
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
          <button 
            onClick={() => setActiveTab('analyzer')}
            className={`w-full flex items-center space-x-2 font-medium ${activeTab === 'analyzer' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'} transition-colors`}
          >
            <Play size={20} />
            <span>Analyzer</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center space-x-2 font-medium ${activeTab === 'history' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'} transition-colors`}
          >
            <AlertTriangle size={20} />
            <span>History</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 flex flex-col overflow-y-auto">
        {activeTab === 'analyzer' ? (
          <>
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
                    <label className="flex items-center space-x-1 hover:text-white transition-colors cursor-pointer">
                      <Upload size={14} />
                      <span>Upload .log</span>
                      <input 
                        type="file" 
                        accept=".log,.txt" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => setLog(event.target?.result as string);
                            reader.readAsText(file);
                          }
                        }} 
                      />
                    </label>
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
          </>
        ) : (
          <div className="flex flex-col h-full">
            <header className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-semibold">Analysis History</h1>
              <div className="flex space-x-4 items-center bg-slate-900 border border-slate-800 rounded-md px-4 py-2">
                <Search size={16} className="text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search logs..." 
                  className="bg-transparent border-none text-sm focus:outline-none text-slate-300 w-48"
                />
              </div>
            </header>
            
            <div className="flex-1 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6 overflow-y-auto">
              <div className="space-y-4">
                {/* Mock History Item 1 */}
                <div className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg p-4 flex justify-between items-center transition-colors cursor-pointer">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="bg-blue-900/50 text-blue-400 px-2 py-1 rounded text-xs font-medium">Arduino</span>
                      <h3 className="font-semibold text-slate-200">Syntax Error: Missing Semicolon</h3>
                    </div>
                    <p className="text-sm text-slate-400 flex items-center"><Calendar size={14} className="mr-1" /> May 30, 2026</p>
                  </div>
                  <button className="text-slate-400 hover:text-white transition-colors flex flex-col items-center">
                    <FileText size={20} />
                    <span className="text-xs mt-1">View</span>
                  </button>
                </div>

                {/* Mock History Item 2 */}
                <div className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg p-4 flex justify-between items-center transition-colors cursor-pointer">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="bg-emerald-900/50 text-emerald-400 px-2 py-1 rounded text-xs font-medium">ESP32</span>
                      <h3 className="font-semibold text-slate-200">Guru Meditation Error: Core 1 panic</h3>
                    </div>
                    <p className="text-sm text-slate-400 flex items-center"><Calendar size={14} className="mr-1" /> May 28, 2026</p>
                  </div>
                  <button className="text-slate-400 hover:text-white transition-colors flex flex-col items-center">
                    <FileText size={20} />
                    <span className="text-xs mt-1">View</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

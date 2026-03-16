import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("Idle");
  const [hwMode, setHwMode] = useState("auto");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => setHwMode(data.mode));
  }, []);

  const saveSettings = async (mode: string) => {
    setHwMode(mode);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <Head>
        <title>Claw-Omni-OS Mission Control</title>
      </Head>

      <header className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          MISSION CONTROL
        </h1>
        <div className="flex gap-4 items-center">
          <span className={`px-3 py-1 rounded-full text-xs ${status === 'Active' ? 'bg-green-500' : 'bg-slate-600'}`}>
            {status}
          </span>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-slate-700 rounded-full transition"
          >
            ⚙️
          </button>
          <button className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-medium transition">
            ABORT MISSION
          </button>
        </div>
      </header>

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl w-96">
            <h2 className="text-2xl font-bold mb-6">System Settings</h2>
            
            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">Hardware Mode</label>
              <div className="flex bg-slate-900 p-1 rounded-lg">
                {['auto', 'cpu', 'gpu'].map((m) => (
                  <button
                    key={m}
                    onClick={() => saveSettings(m)}
                    className={`flex-1 py-1 rounded-md text-xs uppercase font-bold transition ${hwMode === m ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-slate-500 italic">
                * GPU mode requires NVIDIA drivers and toolkit installed.
              </p>
            </div>

            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Terminal/Logs Section */}
        <section className="lg:col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-2xl">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>📟</span> System Logs
          </h2>
          <div className="bg-black rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto border border-slate-700">
            {logs.map((log, i) => (
              <div key={i} className="mb-1 text-green-400">
                <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span> {log}
              </div>
            ))}
            <div className="animate-pulse">_</div>
          </div>
        </section>

        {/* Media Preview Section */}
        <section className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-2xl">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>🎞️</span> Gallery & Preview
          </h2>
          <div className="aspect-video bg-slate-900 rounded-lg mb-4 flex items-center justify-center border border-slate-700">
             <p className="text-slate-500 italic">No media generated yet</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
             <div className="h-24 bg-slate-700 rounded-md animate-pulse"></div>
             <div className="h-24 bg-slate-700 rounded-md animate-pulse"></div>
          </div>
        </section>
      </main>
    </div>
  );
}

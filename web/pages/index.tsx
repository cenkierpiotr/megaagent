import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Dashboard() {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [inputText, setInputText] = useState("");
  const [status, setStatus] = useState("Idle");
  const [agentStatus, setAgentStatus] = useState<any>({});
  const [activeTab, setActiveTab] = useState("chat");

  useEffect(() => {
    refreshModels();
    const statusInterval = setInterval(fetchAgentStatus, 3000);
    fetch('/api/settings').then(res => res.json()).then(data => {
      setHwMode(data.mode);
      if (data.model_manager) setModelManager(data.model_manager);
      if (data.model_coder) setModelCoder(data.model_coder);
    });
    return () => clearInterval(statusInterval);
  }, []);

  const fetchAgentStatus = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgentStatus(data);
    } catch (e) {}
  };

  const triggerAction = async (action: string, label: string) => {
    setMessages(prev => [...prev, { role: 'user', content: `[System Command] ${label}` }]);
    setIsLoading(true);
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        direct_action: action,
        prompt: label,
        model_manager: modelManager,
        model_coder: modelCoder
      })
    });
    setTimeout(() => {
       setIsLoading(false);
       setMessages(prev => [...prev, { role: 'assistant', content: `🤖 Wywołano funkcję: **${label}**. Agent Menedżer analizuje system...` }]);
    }, 1000);
  };

  const refreshModels = async () => {
    setOllamaStatus("checking");
    const res = await fetch('/api/models');
    const data = await res.json();
    setModels(data.models || []);
    setOllamaStatus(data.status || "disconnected");
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const userMsg = { role: 'user', content: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: inputText, 
        model_manager: modelManager,
        model_coder: modelCoder,
        capability: selectedCapability,
        history: messages 
      })
    });
    
    // Simulating result polling
    setTimeout(() => {
       setIsLoading(false);
       setMessages(prev => [...prev, { role: 'assistant', content: `🤖 Zadanie [${selectedCapability.toUpperCase()}] zostało wysłane. Oczekuję na wynik z modelu ${modelManager}...` }]);
    }, 1500);
  };

  const saveSettings = async () => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        mode: hwMode,
        model_manager: modelManager,
        model_coder: modelCoder
      })
    });
    setIsSettingsOpen(false);
  };

  const capabilities = [
    { id: 'text', label: 'Tekst', icon: '📝' },
    { id: 'graphics', label: 'Grafika', icon: '🎨' },
    { id: 'video', label: 'Wideo', icon: '🎬' },
    { id: 'audio', label: 'Audio', icon: '🎵' },
  ];

  return (
    <div className="flex h-screen bg-[#09090b] text-[#fafafa] font-sans overflow-hidden">
      <Head>
        <title>Claw-Omni-OS | NextGen AI</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      {/* Sidebar - Polished Glassmorphism */}
      <aside className="w-80 bg-[#121215] flex flex-col border-r border-white/5 p-6 hidden lg:flex">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-xl">🦾</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Mega Agent</h1>
        </div>

        <button className="flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 py-3 rounded-xl font-semibold transition-all mb-8 shadow-xl shadow-white/5 active:scale-95">
          <span className="text-xl">+</span> New Conversation
        </button>
        
        <nav className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-2">System Agents</p>
            {['manager', 'coder', 'artist'].map(agent => (
               <div key={agent} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                 <div className={`w-2.5 h-2.5 rounded-full ${agentStatus[agent]?.status === 'Idle' ? 'bg-zinc-700' : 'bg-blue-500 animate-pulse'}`}></div>
                 <div className="flex-1">
                   <p className="text-xs font-bold uppercase tracking-tight">{agent}</p>
                   <p className="text-[10px] text-zinc-500 truncate">{agentStatus[agent]?.status || 'Idle'}</p>
                 </div>
               </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-2">Exposed Functions</p>
            <button onClick={() => triggerAction('sys_check', 'System Diagnostic')} className="w-full flex items-center gap-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 p-3 rounded-xl transition text-xs font-bold border border-blue-500/20">
              ⚡ Health Check
            </button>
            <button onClick={() => triggerAction('code_audit', 'Code Audit')} className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 p-3 rounded-xl transition text-xs font-bold border border-white/5">
              🔍 Audit Core
            </button>
          </div>
        </nav>

        <div className="mt-auto space-y-3 pt-6 border-t border-white/5">
          <div className="flex items-center justify-between px-2 text-xs">
            <span className="text-zinc-500">Ollama Link</span>
            <span className={`flex items-center gap-1.5 ${ollamaStatus === 'connected' ? 'text-emerald-500' : 'text-rose-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${ollamaStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></span>
              {ollamaStatus}
            </span>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-3 w-full hover:bg-white/5 p-3 rounded-xl transition text-zinc-400 hover:text-white">
            <span className="text-lg">⚙️</span>
            <span className="text-sm font-medium">System Configuration</span>
          </button>
        </div>
      </aside>

      {/* Main Experience */}
      <main className="flex-1 flex flex-col relative bg-zinc-950/50">
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 backdrop-blur-xl z-20 sticky top-0">
          <div className="flex items-center gap-4">
            <div className="lg:hidden w-8 h-8 bg-blue-600 rounded flex items-center justify-center">🦾</div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Manager Hub</span>
              <span className="text-[10px] text-zinc-500 font-medium">Ollama v0.1.x</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[10px] font-bold uppercase tracking-tighter text-zinc-400">
               <span className={`w-2 h-2 rounded-full ${status === 'Idle' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
               System {status}
             </div>
             <div className="w-10 h-10 rounded-full border-2 border-white/5 p-0.5">
               <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"></div>
             </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 space-y-10">
          {messages.length === 0 ? (
            <div className="max-w-4xl mx-auto py-20">
               <h2 className="text-5xl font-bold bg-gradient-to-r from-white via-zinc-400 to-zinc-600 bg-clip-text text-transparent mb-12">
                 Hello, Piotrze.<br />How can I assist you?
               </h2>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                   { title: 'Create Artwork', desc: 'Generate high-res graphics', op: 'graphics' },
                   { title: 'Coding Task', desc: 'Fix bugs in Python core', op: 'text' },
                   { title: 'System Info', desc: 'Check Ollama & GPU usage', op: 'text' }
                 ].map((item, idx) => (
                   <div key={idx} onClick={() => { setSelectedCapability(item.op); setInputText(item.title) }} className="bg-white/5 hover:bg-white/10 p-6 rounded-[2rem] border border-white/5 cursor-pointer transition-all hover:scale-105 active:scale-95 group">
                      <div className="w-12 h-12 bg-zinc-900 rounded-2xl mb-4 flex items-center justify-center transition-colors group-hover:bg-blue-600/20">
                         <span className="text-2xl">✨</span>
                      </div>
                      <p className="text-lg font-bold mb-1">{item.title}</p>
                      <p className="text-sm text-zinc-500">{item.desc}</p>
                   </div>
                 ))}
               </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-12">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                  <div className={`max-w-[90%] lg:max-w-[75%] p-6 rounded-[2.5rem] shadow-2xl ${msg.role === 'user' ? 'bg-white text-black font-medium' : 'bg-transparent text-zinc-200 text-xl leading-relaxed whitespace-pre-wrap'}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-[10px]">🦾</div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Core Agent</span>
                      </div>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start gap-2 p-6">
                  {[0, 150, 300].map(delay => (
                    <div key={delay} className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }}></div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Action Zone */}
        <div className="p-6 lg:p-12">
          <div className="max-w-4xl mx-auto">
            {/* Capability Bar */}
            <div className="flex flex-wrap gap-2 mb-6 justify-center">
              {capabilities.map(cap => (
                <button
                  key={cap.id}
                  onClick={() => setSelectedCapability(cap.id)}
                  className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 border-2 ${selectedCapability === cap.id ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-600/20' : 'bg-white/5 border-transparent text-zinc-500 hover:border-white/10 hover:text-zinc-300'}`}
                >
                  <span className="text-sm">{cap.icon}</span>
                  {cap.label}
                </button>
              ))}
            </div>

            <div className="relative group bg-white/5 p-2 rounded-[3rem] border border-white/5 focus-within:border-blue-500/50 transition-all shadow-2xl backdrop-blur-3xl">
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={selectedCapability === 'text' ? "Zadaj pytanie..." : `Opisz co chcesz wygenerować (${selectedCapability})...`}
                className="w-full bg-transparent py-4 px-8 text-lg focus:outline-none placeholder:text-zinc-600"
              />
              <button 
                onClick={sendMessage} 
                className="absolute right-3 top-3 bottom-3 px-8 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-xl font-bold"
              >
                ↑
              </button>
            </div>
            <p className="text-center text-[10px] text-zinc-600 mt-6 font-medium">Developed for Advanced AI Orchestration. v2.0-Alpha</p>
          </div>
        </div>
      </main>

      {/* New Professional Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
          <div className="bg-[#121215] p-10 rounded-[3rem] border border-white/5 shadow-2xl w-full max-w-2xl transform animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h2 className="text-3xl font-bold mb-2">System Config</h2>
                <p className="text-zinc-500 text-sm">Fine-tune Claw-Omni-OS performance and roles.</p>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition">✕</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-3 tracking-widest">Hardware Target</label>
                  <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                    {['auto', 'cpu', 'gpu'].map((m) => (
                      <button key={m} onClick={() => setHwMode(m)} className={`flex-1 py-2.5 rounded-xl text-[10px] uppercase font-black transition-all ${hwMode === m ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{m}</button>
                    ))}
                  </div>
                </div>

                <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                  <p className="text-[11px] text-emerald-400 font-medium">
                    Tryb <b>GPU</b> zostanie aktywowany automatycznie po wykryciu sterowników NVIDIA.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-3 tracking-widest">Manager Model</label>
                  <select value={modelManager} onChange={(e) => setModelManager(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm focus:border-blue-500 outline-none">
                    {models.map(m => <option key={m} value={m} className="bg-zinc-900">{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-3 tracking-widest">Coder Model</label>
                  <select value={modelCoder} onChange={(e) => setModelCoder(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm focus:border-blue-500 outline-none">
                    {models.map(m => <option key={m} value={m} className="bg-zinc-900">{m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={refreshModels} className="flex-1 bg-white/5 hover:bg-white/10 py-5 rounded-2xl font-bold transition-all">Refresh Models</button>
              <button onClick={saveSettings} className="flex-[2] bg-white text-black hover:bg-zinc-200 py-5 rounded-2xl font-bold transition-all shadow-xl shadow-white/5">Apply Settings</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        body { font-family: 'Inter', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
      `}</style>
    </div>
  );
}

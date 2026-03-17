"use client";

import React, { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
  image?: string;
  timestamp?: string;
}

interface AgentStatus {
  status: string;
  task: string;
  timestamp: number;
  lastAction?: string;
}

interface Telemetry {
  cpu: number;
  ram: number;
  vram: string;
  temp: string;
  gpu_util: number;
}

export default function Dashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [ollamaStatus, setOllamaStatus] = useState("checking");
  const [hwMode, setHwMode] = useState("auto");
  
  // Model Settings
  const [models, setModels] = useState<string[]>([]);
  const [modelManager, setModelManager] = useState("llama3");
  const [modelCoder, setModelCoder] = useState("codellama");
  const [modelResearcher, setModelResearcher] = useState("mistral");
  const [modelArtist, setModelArtist] = useState("llava");
  const [ollamaUrl, setOllamaUrl] = useState("http://host.docker.internal:11434");
  
  const [selectedCapability, setSelectedCapability] = useState("text");
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [mediaGallery, setMediaGallery] = useState<string[]>([]);
  const [agentStatus, setAgentStatus] = useState<Record<string, AgentStatus>>({});
  const [telemetry, setTelemetry] = useState<Telemetry>({ cpu: 0, ram: 0, vram: "N/A", temp: "N/A", gpu_util: 0 });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshModels();
    loadSettings();
    
    // Telemetry polling (to be replaced by WebSocket in full backend integration)
    const statusInterval = setInterval(fetchTelemetryAndStatus, 3000);
    return () => clearInterval(statusInterval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.mode) setHwMode(data.mode);
      if (data.model_manager) setModelManager(data.model_manager);
      if (data.model_coder) setModelCoder(data.model_coder);
      if (data.model_researcher) setModelResearcher(data.model_researcher);
      if (data.model_artist) setModelArtist(data.model_artist);
      if (data.ollama_url) setOllamaUrl(data.ollama_url);
    } catch (e) {
      console.error("Failed to load settings");
    }
  };

  const fetchTelemetryAndStatus = async () => {
    try {
      const [agentRes, telRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/telemetry')
      ]);
      const agents = await agentRes.json();
      const tel = await telRes.json();
      setAgentStatus(agents);
      setTelemetry(tel);
    } catch (e) {
      // Mock for UI preview if API not ready
      setTelemetry(prev => ({
        ...prev,
        cpu: Math.floor(Math.random() * 30 + 10),
        ram: Math.floor(Math.random() * 20 + 40),
        gpu_util: Math.floor(Math.random() * 15)
      }));
    }
  };

  const refreshModels = async () => {
    setOllamaStatus("checking");
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      setModels(data.models || []);
      setOllamaStatus(data.status || "disconnected");
    } catch (e) {
      setOllamaStatus("error");
    }
  };

  const sendMessage = async (overrideText?: string) => {
    const text = overrideText || inputText;
    if (!text.trim()) return;

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
    setMessages(prev => [...prev, userMsg]);
    if (!overrideText) setInputText("");
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text, 
          model_manager: modelManager,
          model_coder: modelCoder,
          model_researcher: modelResearcher,
          model_artist: modelArtist,
          capability: selectedCapability,
          history: messages 
        })
      });
      
      const data = await res.json();
      
      // Simulate response - in production, this comes from Redis/WebSocket
      setTimeout(() => {
        setIsLoading(false);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Task acknowledged. Initiating ${selectedCapability} execution. Results will be synchronized shortly.`,
          agent: 'Manager',
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        }]);
      }, 1000);
    } catch (e) {
      setIsLoading(false);
    }
  };

  const triggerAction = async (action: string, label: string) => {
    const userMsg: Message = { role: 'user', content: `[System Command] ${label}`, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          direct_action: action,
          prompt: label,
          model_manager: modelManager
        })
      });
      setTimeout(() => {
        setIsLoading(false);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Action [${label}] initiated successfully.`, 
          agent: 'Manager',
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        }]);
      }, 800);
    } catch (e) {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        mode: hwMode,
        model_manager: modelManager,
        model_coder: modelCoder,
        model_researcher: modelResearcher,
        model_artist: modelArtist,
        ollama_url: ollamaUrl
      })
    });
    setIsSettingsOpen(false);
    refreshModels();
  };

  const capabilities = [
    { id: 'text', label: 'Text', icon: 'subject' },
    { id: 'graphics', label: 'Graphics', icon: 'image' },
    { id: 'video', label: 'Video', icon: 'movie' },
    { id: 'audio', label: 'Audio', icon: 'graphic_eq' },
  ];

  return (
    <div className="flex h-screen w-full p-6 gap-6">
      {/* Sidebar */}
      <aside className="w-80 flex flex-col gap-6 glass-morphism rounded-[2.5rem] p-6 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-[#3c83f6] rounded-2xl shadow-lg shadow-blue-500/20">
            <span className="material-symbols-outlined text-white text-xl">smart_toy</span>
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tighter uppercase italic">Claw-Omni-OS</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Autonomous Core v2</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Active Fleet</p>
          
          {[
            { id: 'manager', label: 'Claw-Manager', sub: 'Coordinator', icon: 'shield_person', color: 'blue' },
            { id: 'coder', label: 'Claw-Coder', sub: 'Engineer', icon: 'terminal', color: 'emerald' },
            { id: 'researcher', label: 'Claw-Researcher', sub: 'Analyst', icon: 'search', color: 'amber' },
            { id: 'artist', label: 'Claw-Artist', sub: 'Artisan', icon: 'palette', color: 'rose' }
          ].map(agent => (
            <div key={agent.id} className={`group p-5 rounded-[2rem] border border-white/[0.05] hover:bg-white/[0.04] transition-all cursor-pointer relative overflow-hidden bg-white/[0.02] ${agentStatus[agent.id]?.status !== 'Idle' && agentStatus[agent.id] ? 'agent-active-pulse border-blue-500/20' : ''}`}>
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${agentStatus[agent.id]?.status === 'Idle' || !agentStatus[agent.id] ? 'bg-slate-800/50 text-slate-500' : `bg-${agent.color}-500/20 text-${agent.color}-400 shadow-lg shadow-${agent.color}-500/10`}`}>
                    <span className="material-symbols-outlined text-xl">{agent.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight">{agent.label}</h3>
                    <p className={`text-[9px] font-bold uppercase tracking-widest ${agentStatus[agent.id]?.status === 'Idle' || !agentStatus[agent.id] ? 'text-slate-600' : 'text-emerald-500'}`}>{agentStatus[agent.id]?.status || agent.sub}</p>
                  </div>
                </div>
              </div>
              {agentStatus[agent.id]?.task && (
                 <div className="mt-4 px-3 py-2 rounded-xl bg-black/40 border border-white/5 relative z-10 transition-all">
                    <p className="text-[9px] text-slate-400 font-medium leading-tight">
                       {agentStatus[agent.id].task}
                    </p>
                 </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-4">
          <div className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/[0.08] space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase px-1 tracking-widest">Hardware Load</p>
            
            <div className="space-y-3">
              <div className="space-y-1.5">
                 <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                   <span className="text-slate-500">CPU Core</span>
                   <span className="text-blue-400">{telemetry.cpu}%</span>
                 </div>
                 <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-700" style={{ width: `${telemetry.cpu}%` }}></div>
                 </div>
              </div>

              <div className="space-y-1.5">
                 <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                   <span className="text-slate-500">GPU Compute</span>
                   <span className="text-emerald-400">{telemetry.gpu_util}%</span>
                 </div>
                 <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-700" style={{ width: `${telemetry.gpu_util}%` }}></div>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
               <div className="bg-white/5 p-2.5 rounded-2xl border border-white/5 text-center">
                  <p className="text-[8px] text-slate-600 font-black uppercase">VRAM</p>
                  <p className="text-[10px] font-black text-slate-200">{telemetry.vram}</p>
               </div>
               <div className="bg-white/5 p-2.5 rounded-2xl border border-white/5 text-center">
                  <p className="text-[8px] text-slate-600 font-black uppercase">Temp</p>
                  <p className="text-[10px] font-black text-orange-400">{telemetry.temp}</p>
               </div>
            </div>

            <div className="flex items-center justify-between text-[10px] pt-3 border-t border-white/5">
              <span className="text-slate-500 font-bold uppercase tracking-tighter">Ollama Link</span>
              <span className={`flex items-center gap-1.5 ${ollamaStatus === 'connected' ? 'text-emerald-500' : 'text-rose-500'} font-black uppercase`}>
                <span className={`w-1.5 h-1.5 rounded-full ${ollamaStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`}></span>
                {ollamaStatus}
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-full py-4 rounded-[2rem] border border-white/[0.08] bg-white/[0.02] hover:bg-blue-500/10 hover:border-blue-500/20 hover:text-blue-400 text-[11px] font-black uppercase tracking-widest transition-all group flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm group-hover:rotate-45 transition-transform">settings</span>
            System Config
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col relative max-w-6xl mx-auto w-full">
        {/* Header */}
        <header className="flex items-center justify-between py-4 px-8 glass-morphism rounded-[2.5rem] mb-6 shadow-2xl">
          <nav className="flex gap-8">
            <button className="text-xs font-black uppercase tracking-widest text-[#3c83f6]" onClick={() => {setMessages([]); setIsGalleryOpen(false)}}>Workspace</button>
            <button className={`text-xs font-black uppercase tracking-widest transition-colors ${isGalleryOpen ? 'text-[#3c83f6]' : 'text-slate-500 hover:text-slate-200'}`} onClick={() => setIsGalleryOpen(!isGalleryOpen)}>Media Hub</button>
            <button className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-200 transition-colors" onClick={() => triggerAction('sys_check', 'Diagnostic')}>Audit Logs</button>
          </nav>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">
              <span className="w-2 h-2 bg-emerald-500 rounded-full agent-active-pulse"></span>
              Secure Node
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-white/10">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-lg">P</div>
              <span className="text-xs font-black uppercase tracking-tighter">Piotr</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-8 mb-36 custom-scrollbar">
          {isGalleryOpen ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
               <div className="flex items-center justify-between mb-10">
                  <h2 className="text-3xl font-black uppercase tracking-tighter italic">Generated Assets</h2>
                  <div className="px-4 py-1 bg-white/5 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inventory Index: {mediaGallery.length}</div>
               </div>
               {mediaGallery.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-32 text-slate-700 border-2 border-dashed border-white/[0.03] rounded-[3rem] bg-white/[0.01]">
                   <span className="material-symbols-outlined text-5xl mb-4 opacity-20">inventory_2</span>
                   <p className="text-xs font-black uppercase tracking-widest">No assets found in neural cache</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
                   {mediaGallery.map((url, i) => (
                      <div key={i} className="group relative aspect-square rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl transition-all hover:scale-[1.03] hover:-translate-y-2">
                         <img src={url} className="w-full h-full object-cover" alt="Asset" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all p-8 flex flex-col justify-end">
                            <p className="text-[11px] font-black uppercase tracking-widest text-[#3c83f6] mb-1">Claw-Artist Production</p>
                            <p className="text-[9px] text-white/40 font-bold">SHA-256 Verified Asset</p>
                         </div>
                      </div>
                   ))}
                 </div>
               )}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-1000">
               <div className="relative">
                  <div className="w-24 h-24 bg-blue-500/10 rounded-[2.5rem] flex items-center justify-center border border-blue-500/20 shadow-2xl agent-active-pulse">
                     <span className="material-symbols-outlined text-5xl text-[#3c83f6]">bolt</span>
                  </div>
                  <div className="absolute -inset-4 bg-blue-500/5 blur-3xl rounded-full -z-10"></div>
               </div>
               <div className="space-y-2">
                  <h1 className="text-5xl font-black tracking-tighter italic uppercase text-white shadow-sm">Autonomous Node Live.</h1>
                  <p className="text-slate-500 text-lg max-w-md font-medium">Standing by for architectural commands. Resource governor is active.</p>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mt-10 w-full max-w-3xl">
                 {[
                   { l: 'Health Check', a: 'sys_check', i: 'analytics', d: 'Full Diagnostic' },
                   { l: 'Code Audit', a: 'code_audit', i: 'terminal', d: 'Logic Scan' },
                   { l: 'Deep Search', a: 'web_search', i: 'manage_search', d: 'Data Harvester' },
                   { l: 'Neural Design', a: 'artist_gen', i: 'brush', d: 'Visual Engine' },
                   { l: 'VRAM Purge', a: 'clear_vram', i: 'memory', d: 'GPU Flush' },
                   { l: 'Sync Gateway', a: 'sync_redis', i: 'router', d: 'Network Sync' }
                 ].map(btn => (
                   <button key={btn.a} onClick={() => triggerAction(btn.a, btn.l)} className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] hover:border-[#3c83f6]/40 hover:bg-white/[0.04] transition-all flex flex-col items-start gap-5 group shadow-xl">
                     <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-[#3c83f6]/20 transition-all group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                       <span className="material-symbols-outlined text-[#3c83f6] text-2xl group-hover:scale-110 transition-transform">{btn.i}</span>
                     </div>
                     <div className="text-left">
                       <p className="text-sm font-black tracking-tight uppercase">{btn.l}</p>
                       <p className="text-[10px] text-slate-600 uppercase tracking-widest font-black mt-1">{btn.d}</p>
                     </div>
                   </button>
                 ))}
               </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-5 max-w-4xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center shrink-0 border border-white/[0.08] shadow-2xl ${msg.role === 'user' ? 'bg-[#3c83f6] text-white' : 'bg-white/[0.05] text-[#3c83f6]'}`}>
                  <span className="material-symbols-outlined text-xl">{msg.role === 'user' ? 'person' : (msg.agent === 'Coder' ? 'terminal' : (msg.agent === 'Artist' ? 'palette' : (msg.agent === 'Researcher' ? 'search' : 'shield_person')))}</span>
                </div>
                <div className={`space-y-2 ${msg.role === 'user' ? 'flex flex-col items-end text-right' : ''}`}>
                  <div className="flex items-center gap-3 px-1">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{msg.role === 'user' ? 'Commander' : `Agent Claw-${msg.agent || 'Core'}`}</p>
                     <span className="text-[9px] text-zinc-700 font-bold uppercase">{msg.timestamp}</span>
                  </div>
                  <div className={`p-6 rounded-[2rem] leading-relaxed text-[15px] font-medium ${msg.role === 'user' ? 'bg-white/5 text-slate-100 border border-white/10 rounded-tr-none' : 'bg-white/[0.03] backdrop-blur-2xl border border-white/10 text-slate-200 rounded-tl-none shadow-2xl shadow-black/40'}`}>
                    {msg.content}
                    {msg.image && (
                      <div className="mt-5 rounded-3xl overflow-hidden border border-white/10 shadow-inner group">
                        <img src={msg.image} alt="Ref" className="w-full h-auto max-h-[500px] object-cover transition-all duration-1000 group-hover:scale-110" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
             <div className="flex gap-5 max-w-3xl">
               <div className="w-10 h-10 rounded-2xl bg-[#3c83f6]/10 flex items-center justify-center shrink-0 animate-spin transition-all duration-2000">
                 <span className="material-symbols-outlined text-[#3c83f6] text-lg">sync</span>
               </div>
               <div className="space-y-2">
                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Neural Computation In-Progress</p>
                 <div className="bg-white/5 p-5 rounded-[2rem] rounded-tl-none border border-white/5 flex gap-2 items-center">
                    <span className="w-2 h-2 bg-[#3c83f6] rounded-full animate-bounce shadow-[0_0_10px_#3c83f6]" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-[#3c83f6] rounded-full animate-bounce shadow-[0_0_10px_#3c83f6]" style={{ animationDelay: '200ms' }}></span>
                    <span className="w-2 h-2 bg-[#3c83f6] rounded-full animate-bounce shadow-[0_0_10px_#3c83f6]" style={{ animationDelay: '400ms' }}></span>
                 </div>
               </div>
             </div>
          )}
        </div>

        {/* Interaction Bar */}
        <div className="absolute bottom-10 left-0 right-0 px-6 space-y-6">
          <div className="flex justify-center">
            <div className="bg-black/40 backdrop-blur-3xl border border-white/[0.08] rounded-full p-1.5 flex gap-1 shadow-2xl ring-1 ring-white/5">
              {capabilities.map(cap => (
                <button 
                  key={cap.id}
                  onClick={() => setSelectedCapability(cap.id)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-all ${selectedCapability === cap.id ? 'bg-[#3c83f6] text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20' : 'hover:bg-white/5 text-slate-500 text-[10px] font-bold uppercase tracking-widest'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">{cap.icon}</span>
                  {cap.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-3 pl-8 flex items-center gap-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] ring-1 ring-white/5 max-w-4xl mx-auto focus-within:ring-[#3c83f6]/30 transition-all group">
            <span className="material-symbols-outlined text-slate-600 group-focus-within:text-blue-500 transition-colors">terminal</span>
            <input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-medium text-slate-100 placeholder-slate-700 outline-none" 
              placeholder="Issue architectural command..." 
              type="text"
            />
            <div className="flex items-center gap-3 pr-2">
              <button className="w-12 h-12 rounded-full border border-white/5 text-slate-500 hover:text-slate-100 hover:bg-white/5 transition-all flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">mic</span>
              </button>
              <button 
                onClick={() => sendMessage()}
                className="bg-[#3c83f6] hover:bg-blue-500 text-white w-14 h-14 rounded-[1.75rem] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-500/30"
              >
                <span className="material-symbols-outlined text-3xl">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-3xl flex items-center justify-center z-50 p-6 animate-in fade-in duration-500">
           <div className="bg-[#0e0e10] p-12 rounded-[3.5rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] w-full max-w-2xl transform animate-in zoom-in-95 duration-500 overflow-y-auto max-h-[90vh] custom-scrollbar">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h2 className="text-4xl font-black mb-3 tracking-tighter uppercase italic">Node Control</h2>
                  <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Global Resource Orchestration</p>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-500 transition-all font-black">✕</button>
              </div>

              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-600 uppercase mb-4 tracking-[0.2em]">Ollama Endlink</label>
                      <input 
                        type="text" 
                        value={ollamaUrl} 
                        onChange={(e) => setOllamaUrl(e.target.value)} 
                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-[13px] focus:border-blue-500 outline-none font-mono text-blue-400 group-focus-within:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-600 uppercase mb-4 tracking-[0.2em]">Compute Preference</label>
                      <div className="flex bg-black/60 p-2 rounded-[1.75rem] border border-white/5">
                        {['auto', 'cpu', 'gpu'].map((m) => (
                          <button key={m} onClick={() => setHwMode(m)} className={`flex-1 py-3 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all ${hwMode === m ? 'bg-blue-500 text-white shadow-xl shadow-blue-500/30' : 'text-zinc-600 hover:text-zinc-400'}`}>{m}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-center items-center text-center">
                    <p className="text-[10px] text-slate-500 mb-2 font-black uppercase tracking-widest">Node Stability</p>
                    <p className="text-6xl font-black text-blue-500 italic tracking-tighter">99.8<span className="text-2xl not-italic">%</span></p>
                    <div className="mt-6 px-4 py-1.5 bg-emerald-500/10 rounded-full text-[9px] text-emerald-500 font-black uppercase tracking-widest border border-emerald-500/20">Optimal Sync</div>
                  </div>
                </div>

                <div className="space-y-8 pt-10 border-t border-white/5">
                  <p className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Agent Neural Mapping</p>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-600 uppercase px-2">Manager Core</label>
                      <select value={modelManager} onChange={(e) => setModelManager(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-bold focus:border-blue-500 outline-none appearance-none">
                        {models.length > 0 ? models.map(m => <option key={m} value={m} className="bg-[#0e0e10]">{m}</option>) : <option>llama3 (default)</option>}
                      </select>
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-zinc-600 uppercase px-2">Coder Engine</label>
                       <select value={modelCoder} onChange={(e) => setModelCoder(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-bold focus:border-blue-500 outline-none appearance-none">
                        {models.length > 0 ? models.map(m => <option key={m} value={m} className="bg-[#0e0e10]">{m}</option>) : <option>codellama (default)</option>}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-10">
                  <button onClick={refreshModels} className="flex-1 bg-white/5 hover:bg-white/10 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all border border-white/1)0">Neural Flush</button>
                  <button onClick={saveSettings} className="flex-[2] bg-blue-500 text-white hover:bg-blue-600 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all shadow-2xl shadow-blue-500/30">Commit Changes</button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

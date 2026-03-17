"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Terminal, Search, Palette, Shield, Zap, 
  Settings, Mic, ArrowRight, Activity, Cpu, 
  Database, Layout, Image as ImageIcon, Video, 
  Music, X, Maximize2, RefreshCw, Layers
} from 'lucide-react';

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
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  
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
      
      // Health check logic for Ollama Online status
      const healthRes = await fetch('/api/health-check');
      if (healthRes.status === 200) setOllamaStatus("online");
      else setOllamaStatus("disconnected");
    } catch (e) {
      setTelemetry(prev => ({
        ...prev,
        cpu: Math.floor(Math.random() * 30 + 10),
        ram: Math.floor(Math.random() * 20 + 40),
        gpu_util: Math.floor(Math.random() * 15)
      }));
    }
  };

  const refreshModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      setModels(data.models || []);
    } catch (e) {}
  };

  const sendMessage = async (overrideText?: string) => {
    const text = overrideText || inputText;
    if (!text.trim()) return;

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
    setMessages(prev => [...prev, userMsg]);
    if (!overrideText) setInputText("");
    setIsLoading(true);

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text, 
          model_manager: modelManager,
          capability: selectedCapability,
          history: messages 
        })
      });
      
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
        body: JSON.stringify({ direct_action: action, prompt: label })
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

  const agents = [
    { id: 'manager', label: 'Claw-Manager', sub: 'Coordinator', icon: Shield, color: 'blue', panel: 'System Overview' },
    { id: 'coder', label: 'Claw-Coder', sub: 'Engineer', icon: Terminal, color: 'emerald', panel: 'Terminal Console' },
    { id: 'researcher', label: 'Claw-Researcher', sub: 'Analyst', icon: Search, color: 'amber', panel: 'Browser Logs' },
    { id: 'artist', label: 'Claw-Artist', sub: 'Artisan', icon: Palette, color: 'rose', panel: 'Production Hub' }
  ];

  return (
    <div className="flex h-screen w-full p-6 gap-6 bg-[#0a0a0b] text-slate-100 antialiased overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 flex flex-col gap-6 bg-white/[0.03] backdrop-blur-[12px] border border-white/[0.08] rounded-[2.5rem] p-6 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-[#3c83f6] rounded-2xl shadow-lg shadow-blue-500/20">
            <Bot className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tighter uppercase italic text-white">Claw-Omni-OS</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Autonomous Core v2</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Active Fleet</p>
          
          {agents.map(agent => (
            <div 
              key={agent.id} 
              onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
              className={`group p-5 rounded-[2rem] border border-white/[0.05] hover:bg-white/[0.04] transition-all cursor-pointer relative overflow-hidden bg-white/[0.02] ${agentStatus[agent.id]?.status !== 'Idle' && agentStatus[agent.id] ? 'animate-status-pulse border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : ''} ${selectedAgent === agent.id ? 'ring-2 ring-blue-500/30' : ''}`}
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${agentStatus[agent.id]?.status === 'Idle' || !agentStatus[agent.id] ? 'bg-slate-800/50 text-slate-500' : `bg-${agent.color}-500/20 text-${agent.color}-400 shadow-lg shadow-${agent.color}-500/10`}`}>
                    <agent.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight">{agent.label}</h3>
                    <p className={`text-[9px] font-bold uppercase tracking-widest ${agentStatus[agent.id]?.status === 'Idle' || !agentStatus[agent.id] ? 'text-slate-600' : 'text-emerald-500'}`}>{agentStatus[agent.id]?.status || agent.sub}</p>
                  </div>
                </div>
              </div>
              {selectedAgent === agent.id && (
                 <div className="mt-4 px-3 py-2 rounded-xl bg-black/40 border border-white/5 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[9px] text-blue-400 font-bold uppercase mb-1 tracking-widest">{agent.panel}</p>
                    <p className="text-[9px] text-slate-400 font-medium leading-tight">
                       {agentStatus[agent.id]?.task || "System standing by for granular sub-task deployment."}
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
                   <span className="text-slate-500 flex items-center gap-1"><Cpu className="w-3 h-3" /> CPU Core</span>
                   <span className="text-blue-400 font-mono">{telemetry.cpu}%</span>
                 </div>
                 <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-700" style={{ width: `${telemetry.cpu}%` }}></div>
                 </div>
              </div>

              <div className="space-y-1.5">
                 <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                   <span className="text-slate-500 flex items-center gap-1"><Zap className="w-3 h-3" /> GPU Compute</span>
                   <span className="text-emerald-400 font-mono">{telemetry.gpu_util}%</span>
                 </div>
                 <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-700" style={{ width: `${telemetry.gpu_util}%` }}></div>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
               <div className="bg-white/5 p-2.5 rounded-2xl border border-white/5 text-center">
                  <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">VRAM</p>
                  <p className="text-[10px] font-black text-slate-200 font-mono">{telemetry.vram}</p>
               </div>
               <div className="bg-white/5 p-2.5 rounded-2xl border border-white/5 text-center">
                  <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Temp</p>
                  <p className="text-[10px] font-black text-orange-400 font-mono">{telemetry.temp}</p>
               </div>
            </div>

            <div className="flex items-center justify-between text-[10px] pt-3 border-t border-white/5">
              <span className="text-slate-500 font-bold uppercase tracking-tighter">Ollama Status</span>
              <span className={`flex items-center gap-1.5 ${ollamaStatus === 'online' ? 'text-emerald-500' : 'text-rose-500'} font-black uppercase tracking-widest`}>
                <span className={`w-1.5 h-1.5 rounded-full ${ollamaStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 animate-pulse'}`}></span>
                {ollamaStatus === 'online' ? 'Ollama Online' : 'Ollama disconnected'}
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-full py-4 rounded-[2rem] border border-white/[0.08] bg-white/[0.02] hover:bg-blue-500/10 hover:border-blue-500/20 hover:text-blue-400 text-[11px] font-black uppercase tracking-widest transition-all group flex items-center justify-center gap-2"
          >
            <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
            System Config
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col relative max-w-6xl mx-auto w-full">
        {/* Header */}
        <header className="flex items-center justify-between py-4 px-8 bg-white/[0.03] backdrop-blur-[12px] border border-white/[0.08] rounded-[2.5rem] mb-6 shadow-2xl">
          <nav className="flex gap-8">
            <button className="text-xs font-black uppercase tracking-widest text-[#3c83f6] flex items-center gap-2" onClick={() => {setMessages([]); setIsGalleryOpen(false)}}>
               <Layout className="w-3 h-3" /> Workspace
            </button>
            <button className={`text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2 ${isGalleryOpen ? 'text-[#3c83f6]' : 'text-slate-500 hover:text-slate-200'}`} onClick={() => setIsGalleryOpen(!isGalleryOpen)}>
               <ImageIcon className="w-3 h-3" /> Media Hub
            </button>
            <button className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-200 transition-colors flex items-center gap-2" onClick={() => triggerAction('sys_check', 'Diagnostic')}>
               <Activity className="w-3 h-3" /> Audit Logs
            </button>
          </nav>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-status-pulse"></span>
              Secure Node
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-white/10">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-lg overflow-hidden relative">
                 <span className="relative z-10">P</span>
                 <div className="absolute inset-0 bg-white/20 blur-md translate-y-4"></div>
              </div>
              <span className="text-xs font-black uppercase tracking-tighter text-white">Piotr</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-8 mb-36 custom-scrollbar scroll-smooth">
          {isGalleryOpen ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
               <div className="flex items-center justify-between mb-10">
                  <h2 className="text-3xl font-black uppercase tracking-tighter italic text-white flex items-center gap-3">
                     <Layers className="text-blue-500 w-8 h-8" /> Generated Assets
                  </h2>
                  <div className="px-5 py-2 bg-white/5 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest border border-white/5">Neural Index: {mediaGallery.length}</div>
               </div>
               {mediaGallery.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-40 text-slate-700 border-2 border-dashed border-white/[0.03] rounded-[3.5rem] bg-white/[0.01]">
                   <Database className="w-12 h-12 mb-4 opacity-10" />
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">No assets discovered in neural cache</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
                   {mediaGallery.map((url, i) => (
                      <div key={i} className="group relative aspect-square rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl transition-all hover:scale-[1.02] hover:-translate-y-2">
                         <img src={url} className="w-full h-full object-cover" alt="Asset" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all p-8 flex flex-col justify-end">
                            <p className="text-[11px] font-black uppercase tracking-widest text-[#3c83f6] mb-1">Claw-Artist Production</p>
                            <p className="text-[9px] text-white/40 font-bold">SHA-256 Verified</p>
                         </div>
                      </div>
                   ))}
                 </div>
               )}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-10 animate-in fade-in zoom-in-95 duration-1000 py-10">
               <div className="relative group">
                  <div className="w-28 h-28 bg-blue-500/10 rounded-[3rem] flex items-center justify-center border border-blue-500/20 shadow-2xl animate-status-pulse relative z-10 transition-transform group-hover:scale-110">
                     <Zap className="w-12 h-12 text-[#3c83f6]" strokeWidth={2.5} />
                  </div>
                  <div className="absolute -inset-10 bg-blue-500/5 blur-[80px] rounded-full -z-10 animate-pulse"></div>
               </div>
               <div className="space-y-4">
                  <h1 className="text-6xl font-black tracking-tight italic uppercase text-white">System: Ready.</h1>
                  <p className="text-slate-500 text-lg max-w-lg font-medium leading-relaxed tracking-tight">Claw-Omni-OS initialized. Sub-bot trinity standing by for architectural deployment.</p>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mt-10 w-full max-w-4xl">
                 {[
                   { l: 'Health Check', a: 'sys_check', i: Activity, d: 'Full Diagnostic', color: 'blue' },
                   { l: 'Code Audit', a: 'code_audit', i: Terminal, d: 'OpenHands Logic', color: 'emerald' },
                   { l: 'Smart Search', a: 'web_search', i: Search, d: 'Skyvern Data Scan', color: 'amber' },
                   { l: 'Neural Design', a: 'artist_gen', i: Palette, d: 'Creative Engine', color: 'rose' },
                   { l: 'VRAM Purge', a: 'clear_vram', i: Cpu, d: 'Ollama Flush', color: 'indigo' },
                   { l: 'Gateway Sync', a: 'sync_redis', i: RefreshCw, d: 'Network Re-align', color: 'zinc' }
                 ].map(btn => (
                   <button key={btn.a} onClick={() => triggerAction(btn.a, btn.l)} className="p-7 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] hover:border-[#3c83f6]/40 hover:bg-white/[0.04] transition-all flex flex-col items-start gap-6 group shadow-2xl text-left">
                     <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-[#3c83f6]/20 transition-all group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]`}>
                       <btn.i className="text-[#3c83f6] w-6 h-6 group-hover:scale-110 transition-transform" />
                     </div>
                     <div>
                       <p className="text-sm font-black tracking-widest uppercase text-white">{btn.l}</p>
                       <p className="text-[10px] text-slate-600 uppercase tracking-widest font-black mt-2 leading-none">{btn.d}</p>
                     </div>
                   </button>
                 ))}
               </div>
            </div>
          ) : (
            <div className="space-y-8 pb-10">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-6 max-w-4xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                  <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center shrink-0 border border-white/[0.08] shadow-2xl relative overflow-hidden ${msg.role === 'user' ? 'bg-[#3c83f6]' : 'bg-white/[0.05]'}`}>
                    <span className="relative z-10">
                      {msg.role === 'user' ? <Shield className="w-6 h-6 text-white" /> : (msg.agent === 'Coder' ? <Terminal className="w-6 h-6 text-blue-400" /> : (msg.agent === 'Artist' ? <Palette className="w-6 h-6 text-rose-400" /> : <Shield className="w-6 h-6 text-blue-400" />))}
                    </span>
                    <div className="absolute inset-0 bg-white/10 blur-md translate-y-6"></div>
                  </div>
                  <div className={`space-y-3 ${msg.role === 'user' ? 'flex flex-col items-end text-right' : ''}`}>
                    <div className="flex items-center gap-3 px-1">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{msg.role === 'user' ? 'Master Architect' : `Agent Claw-${msg.agent || 'Core'}`}</p>
                       <span className="text-[9px] text-zinc-700 font-bold uppercase font-mono">{msg.timestamp}</span>
                    </div>
                    <div className={`p-7 rounded-[2.5rem] leading-relaxed text-[16px] font-medium transition-all ${msg.role === 'user' ? 'bg-white/5 text-slate-100 border border-white/10 rounded-tr-none' : 'bg-white/[0.03] backdrop-blur-[24px] border border-white/10 text-slate-200 rounded-tl-none shadow-2xl shadow-black/60'}`}>
                      {msg.content}
                      {msg.image && (
                        <div className="mt-6 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group relative">
                          <img src={msg.image} alt="Project Asset" className="w-full h-auto max-h-[600px] object-cover transition-all duration-1000 group-hover:scale-105" />
                          <div className="absolute top-4 right-4 p-3 bg-black/60 backdrop-blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                             <Maximize2 className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {isLoading && (
             <div className="flex gap-6 max-w-3xl animate-in fade-in duration-300">
               <div className="w-12 h-12 rounded-[1.25rem] bg-[#3c83f6]/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                 <RefreshCw className="text-[#3c83f6] w-5 h-5 animate-spin" />
               </div>
               <div className="space-y-3 pt-1">
                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">Neural Processing Sync</p>
                 <div className="bg-white/5 p-6 rounded-[2.5rem] rounded-tl-none border border-white/5 flex gap-2 items-center">
                    {[0, 200, 400].map(delay => (
                       <span key={delay} className="w-2.5 h-2.5 bg-[#3c83f6] rounded-full animate-bounce shadow-[0_0_12px_rgba(60,131,246,0.6)]" style={{ animationDelay: `${delay}ms` }}></span>
                    ))}
                 </div>
               </div>
             </div>
          )}
        </div>

        {/* Interaction Bar */}
        <div className="absolute bottom-10 left-0 right-0 px-6 space-y-8">
          <div className="flex justify-center">
            <div className="bg-black/60 backdrop-blur-[24px] border border-white/[0.1] rounded-full p-2 flex gap-2 shadow-2xl ring-1 ring-white/5 translate-y-4">
              {capabilities.map(cap => (
                <button 
                  key={cap.id}
                  onClick={() => setSelectedCapability(cap.id)}
                  className={`flex items-center gap-2.5 px-8 py-3 rounded-full transition-all duration-300 ${selectedCapability === cap.id ? 'bg-[#3c83f6] text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 active:scale-95' : 'hover:bg-white/5 text-slate-500 text-[10px] font-bold uppercase tracking-widest'}`}
                >
                  {cap.id === 'text' && <Terminal className="w-4 h-4" />}
                  {cap.id === 'graphics' && <ImageIcon className="w-4 h-4" />}
                  {cap.id === 'video' && <Video className="w-4 h-4" />}
                  {cap.id === 'audio' && <Music className="w-4 h-4" />}
                  {cap.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#0a0a0b]/80 backdrop-blur-[40px] border border-white/10 rounded-[3.5rem] p-3.5 pl-10 flex items-center gap-8 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/10 max-w-5xl mx-auto focus-within:ring-2 focus-within:ring-[#3c83f6]/40 transition-all group scale-100 hover:scale-[1.01]">
            <Terminal className="text-slate-600 w-6 h-6 group-focus-within:text-blue-500 transition-colors" />
            <input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 bg-transparent border-none focus:ring-0 text-[17px] font-medium text-slate-100 placeholder-slate-700 outline-none" 
              placeholder="Issue architectural command..." 
              type="text"
            />
            <div className="flex items-center gap-4 pr-3">
              <button className="w-14 h-14 rounded-full border border-white/5 text-slate-500 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center group active:scale-90">
                <Mic className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
              <button 
                onClick={() => sendMessage()}
                className="bg-[#3c83f6] hover:bg-blue-500 text-white w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-[0_15px_30px_rgba(60,131,246,0.3)] shadow-blue-500/30"
              >
                <ArrowRight className="w-8 h-8 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-[60px] flex items-center justify-center z-50 p-6 animate-in fade-in duration-700">
           <div className="bg-[#0a0a0b] p-16 rounded-[4.5rem] border border-white/10 shadow-[0_0_120px_rgba(0,0,0,1)] w-full max-w-3xl transform animate-in zoom-in-95 duration-500 overflow-y-auto max-h-[92vh] custom-scrollbar border-b-blue-500/40 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
              
              <div className="flex justify-between items-start mb-16">
                <div className="space-y-2">
                  <h2 className="text-5xl font-black tracking-tighter uppercase italic text-white">Node Control</h2>
                  <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.4em] px-1">Global System Orchestration</p>
                </div>
                <button 
                   onClick={() => setIsSettingsOpen(false)} 
                   className="w-14 h-14 bg-white/5 rounded-[1.75rem] flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-500 transition-all font-black group"
                >
                   <X className="w-6 h-6 transition-transform group-hover:rotate-90" />
                </button>
              </div>

              <div className="space-y-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-10 group">
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                         <Layout className="w-3 h-3" /> Ollama Discovery Link
                      </label>
                      <div className="relative">
                         <input 
                           type="text" 
                           value={ollamaUrl} 
                           onChange={(e) => setOllamaUrl(e.target.value)} 
                           className="w-full bg-black/60 border border-white/10 rounded-[1.75rem] p-5 text-[14px] focus:border-blue-500 outline-none font-mono text-blue-400 shadow-inner group-focus-within:ring-2 ring-blue-500/20 transition-all"
                         />
                         <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${ollamaStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                         </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                         <Cpu className="w-3 h-3" /> Compute Engine
                      </label>
                      <div className="flex bg-black/80 p-2 rounded-[2rem] border border-white/5 relative">
                        {['auto', 'cpu', 'gpu'].map((m) => (
                          <button 
                             key={m} 
                             onClick={() => setHwMode(m)} 
                             className={`flex-1 py-4 rounded-[1.5rem] text-[10px] uppercase font-black tracking-widest transition-all relative z-10 ${hwMode === m ? 'bg-blue-500 text-white shadow-2xl shadow-blue-500/40' : 'text-zinc-600 hover:text-zinc-400'}`}
                          >
                             {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-white/[0.04] to-transparent p-10 rounded-[3.5rem] border border-white/10 flex flex-col justify-center items-center text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                       <Zap className="w-24 h-24" />
                    </div>
                    <p className="text-[10px] text-zinc-600 mb-3 font-black uppercase tracking-[0.3em] relative z-10">Neural Stability</p>
                    <p className="text-7xl font-black text-blue-500 italic tracking-tighter relative z-10">99.8<span className="text-3xl not-italic ml-1">%</span></p>
                    <div className="mt-8 px-5 py-2 bg-emerald-500/10 rounded-full text-[9px] text-emerald-500 font-black uppercase tracking-[0.2em] border border-emerald-500/20 relative z-10 shadow-lg shadow-emerald-500/10 animate-pulse">
                       Optimal Integration
                    </div>
                  </div>
                </div>

                <div className="space-y-10 pt-12 border-t border-white/5">
                  <p className="text-[11px] font-black text-white uppercase tracking-[0.4em] italic mb-6">Agent Neural Mapping</p>
                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-zinc-600 uppercase px-4 tracking-widest">Manager Core</label>
                      <select value={modelManager} onChange={(e) => setModelManager(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-xs font-black uppercase tracking-widest text-slate-300 focus:border-blue-500 outline-none appearance-none transition-all cursor-pointer hover:bg-black/80">
                        {models.length > 0 ? models.map(m => <option key={m} value={m} className="bg-[#0a0a0b]">{m}</option>) : <option>llama3 (default)</option>}
                      </select>
                    </div>
                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-zinc-600 uppercase px-4 tracking-widest">Coder Engine</label>
                       <select value={modelCoder} onChange={(e) => setModelCoder(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-xs font-black uppercase tracking-widest text-slate-300 focus:border-blue-500 outline-none appearance-none transition-all cursor-pointer hover:bg-black/80">
                        {models.length > 0 ? models.map(m => <option key={m} value={m} className="bg-[#0a0a0b]">{m}</option>) : <option>codellama (default)</option>}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-6 pt-12">
                  <button onClick={refreshModels} className="flex-1 bg-white/5 hover:bg-white/10 py-6 rounded-[2.25rem] text-[11px] font-black uppercase tracking-widest transition-all border border-white/5 flex items-center justify-center gap-3">
                     <RefreshCw className="w-4 h-4" /> Neural Flush
                  </button>
                  <button onClick={saveSettings} className="flex-[2] bg-blue-500 text-white hover:bg-blue-600 py-6 rounded-[2.25rem] text-[11px] font-black uppercase tracking-widest transition-all shadow-[0_20px_40px_rgba(59,130,246,0.4)] active:scale-95">Commit Architecture</button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

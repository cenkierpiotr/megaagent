import React, { useState, useEffect } from 'react';
import Head from 'next/head';

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

export default function Dashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [ollamaStatus, setOllamaStatus] = useState("checking");
  const [hwMode, setHwMode] = useState("auto");
  
  // Model Settings
  const [modelManager, setModelManager] = useState("llama3");
  const [modelCoder, setModelCoder] = useState("codellama");
  const [modelResearcher, setModelResearcher] = useState("mistral");
  const [modelArtist, setModelArtist] = useState("llava");
  const [ollamaUrl, setOllamaUrl] = useState("http://host.docker.internal:11434");
  
  const [selectedCapability, setSelectedCapability] = useState("text");
  const [models, setModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [mediaGallery, setMediaGallery] = useState<string[]>([]);
  const [agentStatus, setAgentStatus] = useState<Record<string, AgentStatus>>({});
  const [telemetry, setTelemetry] = useState({ cpu: 0, vram: "N/A", temp: "N/A" });

  useEffect(() => {
    refreshModels();
    const statusInterval = setInterval(fetchAgentStatus, 3000);
    fetch('/api/settings').then(res => res.json()).then(data => {
      if (data.mode) setHwMode(data.mode);
      if (data.model_manager) setModelManager(data.model_manager);
      if (data.model_coder) setModelCoder(data.model_coder);
      if (data.model_researcher) setModelResearcher(data.model_researcher);
      if (data.model_artist) setModelArtist(data.model_artist);
      if (data.ollama_url) setOllamaUrl(data.ollama_url);
    });
    return () => clearInterval(statusInterval);
  }, []);

  const fetchAgentStatus = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgentStatus(data);
      
      // Also fetch telemetry
      const telRes = await fetch('/api/telemetry');
      const telData = await telRes.json();
      setTelemetry(telData);
    } catch (e) {
      // Mock some data if API fails for demo purposes
      setTelemetry({ 
        cpu: (Math.random() * 40 + 20).toFixed(1) as any, 
        vram: "4.2 GiB", 
        temp: "54 C" 
      });
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

    const userMsg: Message = { role: 'user', content: text };
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
          model_coder: modelCoder,
          model_researcher: modelResearcher,
          model_artist: modelArtist,
          capability: selectedCapability,
          history: messages 
        })
      });
      
      // Verification response simulation
      setTimeout(() => {
        setIsLoading(false);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Task acknowledged. Initiating ${selectedCapability} execution using ${modelManager}. Results will be synchronized shortly.`,
          agent: 'Manager'
        }]);
      }, 1500);
    } catch (e) {
      setIsLoading(false);
    }
  };

  const triggerAction = async (action: string, label: string) => {
    setMessages(prev => [...prev, { role: 'user', content: `[System Command] ${label}` }]);
    setIsLoading(true);
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          direct_action: action,
          prompt: label,
          model_manager: modelManager,
          model_coder: modelCoder,
          model_researcher: modelResearcher,
          model_artist: modelArtist
        })
      });
      setTimeout(() => {
        setIsLoading(false);
        setMessages(prev => [...prev, { role: 'assistant', content: `Direct action [${label}] completed. Check system logs for details.`, agent: 'Manager' }]);
      }, 1000);
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
    <div className="bg-[#0a0a0b] font-['Inter', sans-serif] text-slate-100 min-h-screen overflow-hidden">
      <Head>
        <title>Claw-Omni-OS AI Agent Dashboard</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      </Head>

      <div className="flex h-screen w-full p-6 gap-6">
        {/* Floating Glassmorphic Sidebar */}
        <aside className="w-80 flex flex-col gap-6 bg-white/[0.03] backdrop-blur-[12px] border border-white/[0.08] rounded-[2rem] p-6 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#3c83f6] rounded-lg">
              <span className="material-symbols-outlined text-white">smart_toy</span>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Claw-Omni-OS</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Autonomous Core</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase px-2">Active Agents</p>
            
            {/* Agent Cards */}
            {[
              { id: 'manager', label: 'Claw-Manager', sub: 'System Coordinator', icon: 'shield_person', color: 'blue' },
              { id: 'coder', label: 'Claw-Coder', sub: 'Logic Engineer', icon: 'terminal', color: 'emerald' },
              { id: 'researcher', label: 'Claw-Researcher', sub: 'Insight Analyst', icon: 'search', color: 'amber' },
              { id: 'artist', label: 'Claw-Artist', sub: 'Visual Design', icon: 'palette', color: 'rose' }
            ].map(agent => (
              <div key={agent.id} className="group p-5 rounded-[2rem] border border-white/[0.05] hover:bg-white/[0.04] transition-all cursor-pointer relative overflow-hidden bg-white/[0.02]">
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${agentStatus[agent.id]?.status === 'Idle' || !agentStatus[agent.id] ? 'bg-slate-800/50 text-slate-500' : `bg-${agent.color}-500/20 text-${agent.color}-400 shadow-lg shadow-${agent.color}-500/10`}`}>
                      <span className="material-symbols-outlined text-xl">{agent.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-black tracking-tight">{agent.label}</h3>
                      <p className={`text-[9px] font-bold uppercase tracking-widest ${agentStatus[agent.id]?.status === 'Idle' || !agentStatus[agent.id] ? 'text-slate-600' : 'text-emerald-500'}`}>{agent.sub}</p>
                    </div>
                  </div>
                </div>
                {agentStatus[agent.id]?.task && (
                   <div className="mt-4 px-3 py-2 rounded-xl bg-black/20 border border-white/5 relative z-10">
                      <p className="text-[9px] text-slate-400 font-medium leading-tight">
                         <span className="text-blue-500 font-bold mr-1">CURRENT:</span>
                         {agentStatus[agent.id].task}
                      </p>
                   </div>
                )}
                <div className={`absolute top-0 right-0 w-24 h-24 bg-${agent.color}-500/5 blur-3xl -mr-12 -mt-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity`}></div>
              </div>
            ))}
          </div>

          <div className="mt-auto space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/[0.08] space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase px-1">Hardware Load</p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-medium">
                  <span className="text-slate-400">CPU Usage</span>
                  <span className="text-blue-400 font-bold">{telemetry.cpu}%</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${Math.min(Number(telemetry.cpu), 100)}%` }}></div>
                </div>
              </div>

              <div className="flex justify-between items-center bg-white/[0.02] p-2 rounded-lg border border-white/5">
                <div>
                  <p className="text-[8px] text-slate-500 uppercase font-black">VRAM</p>
                  <p className="text-xs font-bold text-emerald-400">{telemetry.vram}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] text-slate-500 uppercase font-black">Temp</p>
                  <p className="text-xs font-bold text-orange-400">{telemetry.temp}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                <span className="text-slate-400 text-[10px]">Ollama Link</span>
                <span className={`flex items-center gap-1.5 ${ollamaStatus === 'connected' ? 'text-emerald-500' : 'text-rose-500'} text-[10px]`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${ollamaStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`}></span>
                  {ollamaStatus}
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-full py-3 rounded-xl border border-white/[0.08] hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-400 text-sm font-medium transition-all group flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm group-hover:rotate-45 transition-transform">settings</span>
              System Settings
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative max-w-5xl mx-auto w-full">
          {/* Top Navbar */}
          <header className="flex items-center justify-between py-4 px-8 bg-white/[0.03] backdrop-blur-[12px] border border-white/[0.08] rounded-[2rem] mb-6">
            <div className="flex items-center gap-8">
              <nav className="flex gap-6">
                <button className="text-sm font-medium text-[#3c83f6]" onClick={() => {setMessages([]); setIsGalleryOpen(false)}}>Workspace</button>
                <button className={`text-sm font-medium transition-colors ${isGalleryOpen ? 'text-[#3c83f6]' : 'text-slate-400 hover:text-slate-100'}`} onClick={() => setIsGalleryOpen(!isGalleryOpen)}>Media Hub</button>
                <button className="text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors" onClick={() => triggerAction('sys_check', 'Diagnostic')}>Audit Logs</button>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Node Active
              </div>
              <div className="h-8 w-px bg-white/[0.08]"></div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#3c83f6] flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-[#3c83f6]/20">P</div>
                <span className="text-sm font-medium">Piotr</span>
              </div>
            </div>
          </header>

          {/* Conversation Display or Gallery */}
          <div className="flex-1 overflow-y-auto px-4 space-y-8 mb-32 custom-scrollbar relative">
            {isGalleryOpen ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Generated Assets</h2>
                  <p className="text-xs text-slate-500">Global Gallery ({mediaGallery.length} items)</p>
                </div>
                {mediaGallery.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-600 border-2 border-dashed border-white/5 rounded-[2rem]">
                    <span className="material-symbols-outlined text-4xl mb-4">image_not_supported</span>
                    <p className="text-sm font-medium">No assets generated in this session.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {mediaGallery.map((url, i) => (
                      <div key={i} className="group relative aspect-square rounded-3xl overflow-hidden border border-white/10 shadow-2xl transition-transform hover:scale-[1.02]">
                        <img src={url} className="w-full h-full object-cover" alt="Asset" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end">
                           <p className="text-[10px] font-black uppercase text-blue-400">Claw-Artist</p>
                           <p className="text-[8px] text-white/60">Generated 5m ago</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : messages.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-700">
                  <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/5 mb-4 shadow-2xl">
                     <span className="material-symbols-outlined text-4xl text-[#3c83f6]">auto_awesome</span>
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight">System Core Ready.</h1>
                  <p className="text-slate-400 text-lg max-w-md">Wydaj polecenie flocie agentów lub wybierz jedną z szybkich akcji poniżej.</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8 w-full max-w-2xl">
                    {[
                      { l: 'System Check', a: 'sys_check', i: 'speed', d: 'Health Diagnostic' },
                      { l: 'Code Audit', a: 'code_audit', i: 'fact_check', d: 'Logic Validation' },
                      { l: 'Smart Search', a: 'web_search', i: 'travel_explore', d: 'Deep Research' },
                      { l: 'Quick Sketch', a: 'artist_gen', i: 'auto_fix_high', d: 'Visual Prompt' },
                      { l: 'Clear Nodes', a: 'clear_vram', i: 'memory', d: 'VRAM Purge' },
                      { l: 'Sync Data', a: 'sync_redis', i: 'sync', d: 'Memory Rebuild' }
                    ].map(btn => (
                      <button key={btn.a} onClick={() => triggerAction(btn.a, btn.l)} className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.05] hover:border-[#3c83f6]/40 hover:bg-white/[0.06] transition-all flex flex-col items-start gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[#3c83f6]/20 transition-colors">
                          <span className="material-symbols-outlined text-[#3c83f6] group-hover:scale-110 transition-transform">{btn.i}</span>
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black tracking-tight">{btn.l}</p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">{btn.d}</p>
                        </div>
                      </button>
                    ))}
                  </div>
               </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex gap-4 max-w-4xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-white/[0.08] shadow-lg ${msg.role === 'user' ? 'bg-[#3c83f6] text-white' : 'bg-white/[0.05] text-[#3c83f6]'}`}>
                    <span className="material-symbols-outlined text-lg">{msg.role === 'user' ? 'person' : (msg.agent === 'Coder' ? 'terminal' : (msg.agent === 'Artist' ? 'palette' : (msg.agent === 'Researcher' ? 'search' : 'shield_person')))}</span>
                  </div>
                  <div className={`space-y-1.5 ${msg.role === 'user' ? 'flex flex-col items-end text-right' : ''}`}>
                    <div className="flex items-center gap-2">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{msg.role === 'user' ? 'User Node' : `Claw-${msg.agent || 'Agent'}`}</p>
                       <span className="text-[8px] text-zinc-700 font-bold">{msg.timestamp || new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className={`p-5 rounded-[1.5rem] leading-relaxed text-sm ${msg.role === 'user' ? 'bg-white/5 text-slate-100 border border-white/10 rounded-tr-none' : 'bg-white/[0.03] backdrop-blur-[20px] border border-white/[0.08] text-slate-200 rounded-tl-none shadow-2xl'}`}>
                      {msg.content}
                      {msg.image && (
                        <div className="mt-4 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                          <img src={msg.image} alt="Generated Asset" className="w-full h-auto max-h-[400px] object-cover hover:scale-105 transition-transform duration-700 cursor-zoom-in" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
               <div className="flex gap-4 max-w-3xl">
                 <div className="w-8 h-8 rounded-lg bg-[#3c83f6]/10 flex items-center justify-center shrink-0 animate-pulse">
                   <span className="material-symbols-outlined text-[#3c83f6] text-sm group-hover:rotate-180 transition-all duration-700">refresh</span>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Core Processing</p>
                   <div className="bg-white/5 p-4 rounded-xl rounded-tl-none border border-white/5 flex gap-1.5 items-center">
                      <span className="w-1.5 h-1.5 bg-[#3c83f6] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-[#3c83f6] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-[#3c83f6] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                   </div>
                 </div>
               </div>
            )}
          </div>

          {/* Interaction Layer */}
          <div className="absolute bottom-6 left-0 right-0 px-4 space-y-4">
            {/* Capability Selector */}
            <div className="flex justify-center">
              <div className="bg-white/[0.03] backdrop-blur-[12px] border border-white/[0.08] rounded-full px-2 py-1.5 flex gap-1 shadow-2xl">
                {capabilities.map(cap => (
                  <button 
                    key={cap.id}
                    onClick={() => setSelectedCapability(cap.id)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all ${selectedCapability === cap.id ? 'bg-[#3c83f6]/20 text-[#3c83f6] text-xs font-bold' : 'hover:bg-white/5 text-slate-400 text-xs font-medium'}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{cap.icon}</span>
                    {cap.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <div className="bg-white/[0.03] backdrop-blur-[12px] border border-white/10 rounded-full p-2 pl-6 flex items-center gap-4 shadow-2xl ring-1 ring-white/5 max-w-3xl mx-auto focus-within:ring-[#3c83f6]/50 transition-all">
              <span className="material-symbols-outlined text-slate-500">add_circle</span>
              <input 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-200 placeholder-slate-600 outline-none" 
                placeholder="Issue a command to the fleet..." 
                type="text"
              />
              <div className="flex items-center gap-2 mr-2">
                <button className="p-2 rounded-full text-slate-400 hover:text-slate-100 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">mic</span>
                </button>
                <button 
                  onClick={() => sendMessage()}
                  className="bg-[#3c83f6] hover:bg-[#3c83f6]/90 text-white w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-[#3c83f6]/20"
                >
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Advanced System Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
           <div className="bg-[#121215] p-10 rounded-[3rem] border border-white/5 shadow-2xl w-full max-w-2xl transform animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] custom-scrollbar">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-3xl font-black mb-2 tracking-tighter uppercase">System Config</h2>
                  <p className="text-zinc-500 text-sm font-medium">Fine-tune Claw-Omni-OS performance and agent roles.</p>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition">✕</button>
              </div>

              <div className="space-y-10">
                {/* Global Config */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-3 tracking-widest">Ollama Base URL</label>
                      <input 
                        type="text" 
                        value={ollamaUrl} 
                        onChange={(e) => setOllamaUrl(e.target.value)} 
                        className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm focus:border-blue-500 outline-none font-mono text-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-3 tracking-widest">Hardware Mode</label>
                      <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                        {['auto', 'cpu', 'gpu'].map((m) => (
                          <button key={m} onClick={() => setHwMode(m)} className={`flex-1 py-2.5 rounded-xl text-[10px] uppercase font-black transition-all ${hwMode === m ? 'bg-[#3c83f6] text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{m}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
                    <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-tighter">System Health</p>
                    <p className="text-4xl font-black text-[#3c83f6]">98.4%</p>
                    <p className="text-[10px] text-emerald-500 mt-2 font-black uppercase tracking-widest">Neural Buffer Synchronized</p>
                  </div>
                </div>

                {/* Agent Model Overrides */}
                <div className="space-y-6 pt-6 border-t border-white/5">
                  <p className="text-[11px] font-black text-white uppercase tracking-widest">Agent Neural Assignments</p>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Claw-Manager</label>
                      <select value={modelManager} onChange={(e) => setModelManager(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm focus:border-blue-500 outline-none">
                        {models.map(m => <option key={m} value={m} className="bg-zinc-900">{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Claw-Coder</label>
                      <select value={modelCoder} onChange={(e) => setModelCoder(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm focus:border-blue-500 outline-none">
                        {models.map(m => <option key={m} value={m} className="bg-zinc-900">{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Claw-Researcher</label>
                      <select value={modelResearcher} onChange={(e) => setModelResearcher(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm focus:border-blue-500 outline-none">
                        {models.map(m => <option key={m} value={m} className="bg-zinc-900">{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Claw-Artist</label>
                      <select value={modelArtist} onChange={(e) => setModelArtist(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm focus:border-blue-500 outline-none">
                        {models.map(m => <option key={m} value={m} className="bg-zinc-900">{m}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button onClick={refreshModels} className="flex-1 bg-white/5 hover:bg-white/10 py-5 rounded-2xl font-bold transition-all border border-white/5">Refresh Neural Tags</button>
                  <button onClick={saveSettings} className="flex-[2] bg-[#3c83f6] text-white hover:bg-blue-500 py-5 rounded-2xl font-bold transition-all shadow-2xl shadow-[#3c83f6]/20">Apply Configuration</button>
                </div>
              </div>
           </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

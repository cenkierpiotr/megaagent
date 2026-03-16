import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Dashboard() {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [inputText, setInputText] = useState("");
  const [status, setStatus] = useState("Idle");
  const [hwMode, setHwMode] = useState("auto");
  const [selectedModel, setSelectedModel] = useState("llama3");
  const [models, setModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => setHwMode(data.mode));
    fetch('/api/models').then(res => res.json()).then(data => setModels(data.models));
  }, []);

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
        model: selectedModel,
        history: messages 
      })
    });
    
    // Auto-update to simulation/placeholder while waiting for Redis sync
    setTimeout(() => {
       setIsLoading(false);
       setMessages(prev => [...prev, { role: 'assistant', content: "🤖 Polecenie wysłane do Agenta. Przetwarzam..." }]);
    }, 1500);
  };

  const saveSettings = async (mode: string) => {
    setHwMode(mode);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
  };

  return (
    <div className="flex h-screen bg-[#131314] text-[#e3e3e3] font-sans selection:bg-blue-500/30">
      <Head>
        <title>Claw-Omni-OS | AI Assistant</title>
      </Head>

      {/* Sidebar */}
      <aside className="w-72 bg-[#1e1f20] flex flex-col border-r border-[#333537] p-4 hidden md:flex">
        <button className="flex items-center gap-3 bg-[#2b2c2e] hover:bg-[#37393b] p-3 rounded-full mb-8 transition-all">
          <span className="text-xl">+</span>
          <span className="text-sm font-medium">New Chat</span>
        </button>
        
        <div className="flex-1 overflow-y-auto space-y-2">
          <p className="text-xs font-semibold text-[#80868b] px-3 mb-2 uppercase tracking-wider">Recent</p>
          <div className="hover:bg-[#2b2c2e] p-2 rounded-lg cursor-pointer text-sm truncate px-3">System status check</div>
          <div className="hover:bg-[#2b2c2e] p-2 rounded-lg cursor-pointer text-sm truncate px-3">Optimization logs</div>
        </div>

        <div className="mt-auto pt-4 border-t border-[#333537]">
          <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-3 w-full hover:bg-[#2b2c2e] p-3 rounded-lg transition">
            <span className="text-lg">⚙️</span>
            <span className="text-sm">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative max-w-5xl mx-auto w-full">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Claw-Omni-OS
            </span>
            <select 
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent border-none text-sm text-[#80868b] focus:ring-0 cursor-pointer hover:text-white transition"
            >
              {models.length > 0 ? models.map(m => <option key={m} value={m} className="bg-[#1e1f20]">{m}</option>) : <option>llama3</option>}
            </select>
          </div>
          
          <div className="flex items-center gap-2 text-[10px] text-[#80868b]">
             <span className={`w-2 h-2 rounded-full ${status === 'Idle' ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></span>
             {status}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-6 opacity-80 mt-[-10vh]">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl rotate-12">
                 <span className="text-3xl">🦾</span>
              </div>
              <h2 className="text-3xl font-medium text-center">How can I help you today?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                <div onClick={() => setInputText("Analyze system resources")} className="bg-[#1e1f20] hover:bg-[#2b2c2e] p-4 rounded-2xl border border-[#333537] cursor-pointer transition">
                   <p className="text-sm font-medium mb-1">Analyze system</p>
                   <p className="text-xs text-[#80868b]">Check health and VRAM status</p>
                </div>
                <div onClick={() => setInputText("Automate LinkedIn scraper")} className="bg-[#1e1f20] hover:bg-[#2b2c2e] p-4 rounded-2xl border border-[#333537] cursor-pointer transition">
                   <p className="text-sm font-medium mb-1">Automation</p>
                   <p className="text-xs text-[#80868b]">Deploy Skyvern agent for search</p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] p-4 rounded-3xl ${msg.role === 'user' ? 'bg-[#2b2c2e] rounded-br-lg' : 'bg-transparent text-[#e3e3e3] text-lg'}`}>
                  {msg.role === 'assistant' && <div className="text-[10px] uppercase font-bold text-blue-400 mb-2 tracking-widest">Agent</div>}
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {isLoading && <div className="p-4 text-[#80868b] animate-pulse">Thinking...</div>}
        </div>

        {/* Input */}
        <div className="p-4 md:p-8">
          <div className="max-w-3xl mx-auto relative">
            <input 
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Enter a prompt here..."
              className="w-full bg-[#1e1f20] border border-[#333537] rounded-full py-4 px-6 pr-14 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-xl"
            />
            <button onClick={sendMessage} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">↑</button>
          </div>
        </div>
      </main>

      {/* Settings */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e1f20] p-8 rounded-[32px] border border-[#333537] w-full max-w-md">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-semibold">Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)}>✕</button>
            </div>
            <div className="space-y-6">
              <label className="block text-xs font-medium text-[#80868b] mb-3 uppercase">Hardware Mode</label>
              <div className="flex bg-[#131314] p-1 rounded-2xl">
                {['auto', 'cpu', 'gpu'].map((m) => (
                  <button key={m} onClick={() => saveSettings(m)} className={`flex-1 py-3 rounded-xl text-xs uppercase font-bold ${hwMode === m ? 'bg-[#2b2c2e] text-white' : 'text-[#80868b]'}`}>{m}</button>
                ))}
              </div>
            </div>
            <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-white text-black font-bold py-4 rounded-2xl mt-8">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

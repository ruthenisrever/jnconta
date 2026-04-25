'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function IAPage() {
  const [messages, setMessages] = useState<{role: 'user'|'ai', content: string}[]>([{
    role: 'ai',
    content: '¡Hola! Soy **Javier**, tu Consultor Fiscal Inteligente v5.5. He analizado tu **Riesgo Fiscal (EFOS)**, **Saldos Bancarios** y **Proyecciones de Impuestos** en tiempo real. ¿En qué puedo asesorarte hoy?'
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const companyId = localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2';
      const res = await apiFetch('/api/ia/chat', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          history: messages.slice(1),
          message: userMessage
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'El servidor rechazó la conexión');

      setMessages(prev => [...prev, { role: 'ai', content: data.respuesta }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'ai', content: `⚠️ **Error detectado:** ${error.message}` }]);
    } finally {
       setIsLoading(false);
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 140px)' }} className="flex flex-col bg-[#061224]/80 backdrop-blur-xl rounded-2xl overflow-hidden border border-[#0ea5e9]/20 shadow-[0_0_40px_-10px_rgba(6,182,212,0.15)] relative">
      {/* HEADER IA */}
      <div className="bg-[#040e1c] p-5 border-b border-[#0ea5e9]/20 flex items-center gap-4 shrink-0 shadow-md z-10">
        <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#06b6d4]/20 to-[#0ea5e9]/10 border border-[#06b6d4]/30 shadow-inner">
          <Bot size={24} className="text-[#22d3ee]" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-xl font-black text-[#0ea5e9] tracking-tight flex items-center gap-2">
            Javier <span className="text-[#22d3ee]">AI</span>
            <span className="flex h-2 w-2 relative ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#06b6d4] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22d3ee]"></span>
            </span>
          </h2>
          <p className="text-[10px] uppercase font-bold text-cyan-500/70 tracking-widest mt-0.5">
            Analista Fiscal v5.0 • Motor Gemini 1.5
          </p>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-[#0ea5e9]/5">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
             {/* Avatar IA */}
             {msg.role === 'ai' && (
              <div className="w-10 h-10 rounded-xl bg-[#040e1c] flex items-center justify-center flex-shrink-0 text-[#22d3ee] border border-[#06b6d4]/30 shadow-lg mt-1">
                <Bot size={20} />
              </div>
            )}
            
            {/* Mensaje */}
            <div className={`max-w-[80%] rounded-2xl px-5 py-4 shadow-xl ${
              msg.role === 'user' 
              ? 'bg-gradient-to-br from-[#0284c7] to-[#0ea5e9] text-white rounded-tr-sm border border-[#38bdf8]/50' 
              : 'bg-[#0b1b36]/90 backdrop-blur-md text-slate-200 rounded-tl-sm border border-[#0ea5e9]/20'
            }`}>
              {msg.content.split('\n').map((line, j) => (
                <p key={j} className={`mb-2 last:mb-0 ${msg.role === 'user' ? 'text-white' : 'text-slate-300'} text-[14px] leading-relaxed`} 
                   dangerouslySetInnerHTML={{
                     // Remarcamos negritas con el color azul acua en IA y con blanco en Usuario
                     __html: line.replace(/\*\*(.*?)\*\*/g, msg.role === 'user' ? '<strong class="font-bold text-white">$1</strong>' : '<strong class="font-bold text-[#22d3ee]">$1</strong>')
                   }} 
                />
              ))}
            </div>

            {/* Avatar Usuario */}
            {msg.role === 'user' && (
              <div className="w-10 h-10 rounded-xl bg-[#0284c7] flex items-center justify-center flex-shrink-0 text-white border border-[#38bdf8]/50 shadow-lg mt-1">
                <User size={20} />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-4 justify-start animate-in fade-in">
            <div className="w-10 h-10 rounded-xl bg-[#040e1c] flex items-center justify-center flex-shrink-0 text-[#06b6d4] border border-[#06b6d4]/30 shadow-lg">
              <Bot size={20} className="animate-pulse" />
            </div>
            <div className="bg-[#0b1b36]/90 text-[#22d3ee] rounded-2xl rounded-tl-sm px-5 py-4 border border-[#0ea5e9]/20 flex items-center gap-3 shadow-xl">
              <Loader2 className="animate-spin" size={18} />
              <span className="text-[11px] font-black uppercase tracking-widest text-cyan-400">Consultando Cerebro Fiscal...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* SUGGESTION CHIPS */}
      {!isLoading && messages.length < 4 && (
        <div className="px-6 pb-2 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
           {[
             '¿Cómo está mi riesgo fiscal (EFOS)?',
             '¿Cuánto IVA debo este mes?',
             'Resumen de saldos en bancos',
             'Últimos movimientos de auditoría'
           ].map((sug, i) => (
             <button 
               key={i} 
               onClick={() => { setInput(sug); setTimeout(() => document.getElementById('chat-submit')?.click(), 50); }}
               className="px-3 py-1.5 bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 rounded-full text-[10px] font-bold text-[#22d3ee] hover:bg-[#0ea5e9]/20 transition-all hover:border-[#0ea5e9]/40"
             >
               {sug}
             </button>
           ))}
        </div>
      )}

      {/* INPUT AREA */}
      <div className="p-5 bg-[#040e1c]/90 border-t border-[#0ea5e9]/20 backdrop-blur-md z-10">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center group">
          <Sparkles className="absolute left-4 text-[#06b6d4]/50 group-focus-within:text-[#22d3ee] transition-colors" size={20} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ej. ¿Debo retener ISR en fletes según la ley actual?"
            className="w-full bg-[#0b1b36] border border-[#0ea5e9]/30 text-white rounded-xl pl-12 pr-16 py-4 focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/50 focus:border-[#22d3ee] shadow-inner disabled:opacity-50 transition-all placeholder:text-slate-500 font-medium text-[14px]"
          />
          <button
            type="submit"
            id="chat-submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-2.5 bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] hover:from-[#0369a1] hover:to-[#0284c7] disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 text-white rounded-lg transition-all shadow-lg active:scale-95"
          >
            <Send size={18} className={isLoading ? 'opacity-0' : 'ml-0.5'} />
            {isLoading && <Loader2 size={18} className="animate-spin absolute top-2.5 left-2.5" />}
          </button>
        </form>
        <p className="text-center text-[10px] text-cyan-500/60 mt-3 font-bold uppercase tracking-widest">
           La inteligencia artificial puede ser imprecisa. Verifica en el portal del SAT antes del envío.
        </p>
      </div>
    </div>
  );
}

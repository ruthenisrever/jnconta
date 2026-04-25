'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function FloatingJavier() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'ai', content: string}[]>([{
     role: 'ai', 
     content: 'Hola, soy **Javier AI**. Analizo esta pantalla y tus datos financieros en tiempo real. ¿Qué duda rápida tienes?'
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const companyId = localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2';

      const res = await apiFetch('/api/ia/chat', {
        method: 'POST',
        body: JSON.stringify({ companyId, history: messages.slice(1), message: text })
      });

      const data = await res.json();
      if (res.ok) {
         setMessages(prev => [...prev, { role: 'ai', content: data.respuesta }]);
      } else {
         setMessages(prev => [...prev, { role: 'ai', content: 'Fallo de conexión. ¿Estás en línea?' }]);
      }
    } catch {
       setMessages(prev => [...prev, { role: 'ai', content: 'Mi servidor no responde. 😔' }]);
    }
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-tr from-primary-600 to-cyan-400 text-white flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:scale-110 transition-all z-50 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100 animate-bounce'}`}
      >
        <Bot size={28} />
      </button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 h-[450px] bg-surface-1 border border-primary-500/30 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-4">
           {/* HEADER */}
           <div className="bg-surface-2 p-3 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded bg-primary-500/20 flex items-center justify-center text-primary-400">
                   <Bot size={18} />
                 </div>
                 <div>
                   <h3 className="font-bold text-sm text-primary-400 leading-tight">Javier AI</h3>
                   <span className="text-[9px] uppercase tracking-widest text-success flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"/> Online</span>
                 </div>
              </div>
              <button className="text-muted hover:text-white" onClick={() => setIsOpen(false)}><X size={16}/></button>
           </div>
           
           {/* CHAT AREA */}
           <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20">
             {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[85%] text-xs p-3 rounded-xl ${m.role === 'user' ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-surface-2 text-slate-300 rounded-tl-sm border border-white/5'}`}>
                      {m.role === 'ai' && <Sparkles size={10} className="text-primary-400 mb-1 inline-block mr-1" />}
                      <span dangerouslySetInnerHTML={{ __html: m.content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br/>') }} />
                   </div>
                </div>
             ))}
             {loading && <div className="text-primary-500 p-2"><Loader2 className="animate-spin" size={14}/></div>}
             <div ref={endRef} />
           </div>

           {/* INPUT */}
           <form onSubmit={handleSend} className="p-3 bg-surface-2 border-t border-white/5 flex gap-2">
             <input type="text" className="search-input w-full rounded-full text-xs px-4" placeholder="Pregúntame saldos, impuestos..." value={input} onChange={e => setInput(e.target.value)} />
             <button type="submit" disabled={!input || loading} className="w-9 h-9 rounded-full bg-primary-500 text-white justify-center items-center flex shrink-0 disabled:opacity-50">
               <Send size={14} />
             </button>
           </form>
        </div>
      )}
    </>
  );
}

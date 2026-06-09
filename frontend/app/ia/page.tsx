'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const renderMessageContent = (content: string, isUser: boolean) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (tableHeader.length > 0 || tableRows.length > 0) {
      elements.push(
        <div key={key} className="table-responsive my-3 rounded-xl border border-[#0ea5e9]/25 overflow-hidden shadow-lg">
          <table className="w-full text-left border-collapse bg-[#040e1c]/60">
            <thead>
              <tr className="bg-[#0b1b36] border-b border-[#0ea5e9]/25">
                {tableHeader.map((cell, idx) => (
                  <th key={idx} className="px-4 py-3 text-[11px] font-bold text-[#22d3ee] uppercase tracking-wider">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-[#0ea5e9]/10 hover:bg-[#0b1b36]/40 transition-colors">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-4 py-3 text-[13px] text-slate-300">
                      <span dangerouslySetInnerHTML={{ __html: cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeader = [];
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if it's a table row
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      // Check if it is a separator row like |---|---|
      const isSeparator = cells.every(c => c.match(/^[:\s-]*$/));
      
      if (isSeparator) {
        continue;
      }
      
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
    } else {
      if (inTable) {
        inTable = false;
        flushTable(`table-${i}`);
      }
      
      if (line === '') {
        elements.push(<div key={`empty-${i}`} className="h-2" />);
      } else if (line.startsWith('#')) {
        // Render headings
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.replace(/^#+\s*/, '');
        const headingClass = level === 1 ? 'text-lg font-black text-[#0ea5e9] mb-3 mt-3 tracking-tight' : 'text-md font-bold text-[#22d3ee] mb-2 mt-2';
        elements.push(
          <div key={`heading-${i}`} className={headingClass} dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        );
      } else {
        // Render normal paragraph
        elements.push(
          <p key={`p-${i}`} className="mb-2 last:mb-0 text-slate-300 text-[14px] leading-relaxed"
             dangerouslySetInnerHTML={{
               __html: line.replace(/\*\*(.*?)\*\*/g, isUser ? '<strong class="font-bold text-white">$1</strong>' : '<strong class="font-bold text-[#22d3ee]">$1</strong>')
             }}
          />
        );
      }
    }
  }
  
  if (inTable) {
    flushTable(`table-end`);
  }
  
  return elements;
};

export default function IAPage() {
  const [messages, setMessages] = useState<{role: 'user'|'ai', content: string}[]>([{
    role: 'ai',
    content: '¡Hola! Soy **Javy IA**, tu Consultor Fiscal Inteligente v5.5. He analizado tu **Riesgo Fiscal (EFOS)**, **Saldos Bancarios** y **Proyecciones de Impuestos** en tiempo real. ¿En qué puedo asesorarte hoy?'
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
    <div className="chat-container">
      {/* HEADER IA */}
      <div className="chat-header">
        <div className="chat-header-avatar">
          <Bot size={24} className="text-[#22d3ee]" />
        </div>
        <div className="chat-header-title">
          <h2>
            Javy <span className="text-[#22d3ee]">IA</span>
            <span className="flex h-2 w-2 relative ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#06b6d4] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22d3ee]"></span>
            </span>
          </h2>
          <p>
            Analista Fiscal v5.5 • Motor Claude
          </p>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="chat-area">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message-row ${msg.role === 'ai' ? 'ai' : 'user'}`}>
             {/* Avatar IA */}
             {msg.role === 'ai' && (
              <div className="chat-avatar ai">
                <Bot size={20} />
              </div>
            )}
            
            {/* Mensaje */}
            <div className={`chat-bubble ${msg.role === 'ai' ? 'ai' : 'user'}`}>
              {renderMessageContent(msg.content, msg.role === 'user')}
            </div>

            {/* Avatar Usuario */}
            {msg.role === 'user' && (
              <div className="chat-avatar user">
                <User size={20} />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="chat-message-row ai">
            <div className="chat-avatar ai">
              <Bot size={20} className="animate-pulse" />
            </div>
            <div className="chat-loading-bubble">
              <Loader2 className="animate-spin" size={18} />
              <span>Consultando Cerebro Fiscal...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* SUGGESTION CHIPS */}
      {!isLoading && messages.length < 4 && (
        <div className="chat-chips-container">
           {[
             '¿Cómo está mi riesgo fiscal (EFOS)?',
             '¿Cuánto IVA debo este mes?',
             'Resumen de saldos en bancos',
             'Últimos movimientos de auditoría'
           ].map((sug, i) => (
             <span 
               key={i} 
               role="button"
               onClick={() => { setInput(sug); setTimeout(() => document.getElementById('chat-submit')?.click(), 50); }}
               className="chat-chip"
             >
               {sug}
             </span>
           ))}
        </div>
      )}

      {/* INPUT AREA */}
      <div className="chat-input-container">
        <form onSubmit={handleSend} className="chat-input-form">
          <Sparkles className="chat-input-icon" size={20} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ej. ¿Debo retener ISR en fletes según la ley actual?"
            className="chat-input-field"
          />
          <button
            type="submit"
            id="chat-submit"
            disabled={isLoading || !input.trim()}
            className="chat-submit-btn"
          >
            <Send size={18} className={isLoading ? 'opacity-0' : 'ml-0.5'} />
            {isLoading && <Loader2 size={18} className="animate-spin absolute top-2.5 left-2.5" />}
          </button>
        </form>
        <span className="chat-disclaimer" style={{ display: 'block' }}>
           La inteligencia artificial puede ser imprecisa. Verifica en el portal del SAT antes del envío.
        </span>
      </div>
    </div>
  );
}

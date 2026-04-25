'use client';

import React from 'react';
import { X, Copy, Download, Code } from 'lucide-react';

interface XmlViewerProps {
  xml: string;
  onClose: () => void;
  title?: string;
}

export default function XmlViewer({ xml, onClose, title = 'Visor de XML CFDI' }: XmlViewerProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(xml);
    alert('XML copiado al portapapeles');
  };

  const handleDownload = () => {
    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Función simple para resaltar XML (Simulación)
  const formatXml = (xmlStr: string) => {
    return xmlStr
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/(&lt;[\/]?[\w:]+)/g, '<span class="xml-tag">$1</span>')
      .replace(/([\w:]+)=(['"].*?['"])/g, '<span class="xml-attr">$1</span>=<span class="xml-val">$2</span>');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-surface-1 w-full max-w-5xl h-[80vh] rounded-xl border border-surface-3 flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-surface-3 flex justify-between items-center bg-surface-2">
          <div className="flex items-center gap-2">
            <Code className="text-primary-400" size={20} />
            <h2 className="text-lg font-bold">{title}</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="btn btn-ghost btn-sm flex items-center gap-2 border border-surface-4">
              <Copy size={14} /> Copiar
            </button>
            <button onClick={handleDownload} className="btn btn-ghost btn-sm flex items-center gap-2 border border-surface-4">
              <Download size={14} /> Descargar
            </button>
            <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm ml-2">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-6 font-mono text-sm leading-relaxed bg-black/30">
          <pre 
            className="xml-content"
            dangerouslySetInnerHTML={{ __html: formatXml(xml) }} 
          />
        </div>

        <div className="p-3 bg-surface-2 border-t border-surface-3 text-[10px] text-muted flex justify-between">
          <span>Estándar CFDI 4.0 / Anexo 20</span>
          <span>JnConta Premium Workstation</span>
        </div>
      </div>

      <style jsx global>{`
        .xml-tag { color: #f472b6; font-weight: bold; }
        .xml-attr { color: #60a5fa; }
        .xml-val { color: #34d399; }
        .xml-content { white-space: pre-wrap; word-break: break-all; }
      `}</style>
    </div>
  );
}

'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Box, Save, X, Search } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function BusinessSegmentsPage() {
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({ code: '', name: '', description: '' });
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2' : '';

  useEffect(() => { fetchSegments(); }, []);

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/segments?companyId=${companyId}`);
      if (res.ok) setSegments(await res.json());
    } catch {}
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const url = editingId ? `/api/segments/${editingId}` : `/api/segments`;
      const method = editingId ? 'PUT' : 'POST';
      await apiFetch(url, {
        method,
        body: JSON.stringify({ ...form, companyId })
      });
      setShowModal(false);
      fetchSegments();
    } catch (e) { alert('Error al guardar segmento'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar Centro de Costos?')) return;
    try {
      const res = await apiFetch(`/api/segments/${id}`, { method: 'DELETE' });
      if (res.ok) fetchSegments();
      else alert((await res.json()).message || 'No se puede eliminar, está en uso.');
    } catch {}
  };

  return (
    <div className="main-content">
      <header className="page-header mb-8">
        <div className="page-header-left">
           <div className="flex items-center gap-3">
             <div className="p-2.5 bg-primary-600/20 rounded-xl">
               <Box size={24} className="text-primary-400" />
             </div>
             <div>
               <h1 className="text-2xl font-bold">Centros de Costo / Segmentos</h1>
               <p className="text-muted text-sm mt-1">Administra sucursales, departamentos o proyectos.</p>
             </div>
           </div>
        </div>
        <button className="btn btn-primary shadow-glow flex gap-2" onClick={() => { setForm({code:'', name:'', description:''}); setEditingId(''); setShowModal(true); }}>
           <Plus size={18} /> Nuevo Segmento
        </button>
      </header>

      {loading ? <div className="text-center p-12"><div className="spinner lg m-auto" /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {segments.map(seg => (
              <div key={seg.id} className="panel p-6 glass-border group relative overflow-hidden transition-all hover:border-primary-500/50 hover:shadow-[0_10px_40px_-10px_rgba(34,211,238,0.2)]">
                 <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button className="text-muted hover:text-primary-400" onClick={() => {setForm(seg); setEditingId(seg.id); setShowModal(true)}}><Edit2 size={16} /></button>
                    <button className="text-muted hover:text-danger" onClick={() => handleDelete(seg.id)}><Trash2 size={16} /></button>
                 </div>
                 <div className="text-primary-400 font-mono text-xs font-bold mb-2 tracking-widest">{seg.code}</div>
                 <h3 className="text-xl font-bold mb-2">{seg.name}</h3>
                 <p className="text-sm text-muted line-clamp-2">{seg.description || 'Sin descripción corporativa'}</p>
                 <div className="mt-6 pt-4 border-t border-border-subtle flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success"></div>
                    <span className="text-[10px] uppercase text-muted font-bold tracking-wider">Activo para Asignación</span>
                 </div>
              </div>
           ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in">
           <div className="bg-surface-1 border border-surface-2 p-8 rounded-2xl w-[400px] shadow-2xl relative">
              <button className="absolute top-4 right-4 text-muted hover:text-white" onClick={() => setShowModal(false)}><X size={20} /></button>
              <h2 className="text-lg font-bold mb-6">{editingId ? 'Editar Segmento' : 'Nuevo Segmento Operativo'}</h2>
              
              <div className="space-y-4">
                 <div>
                    <label className="text-xs uppercase text-muted font-bold block mb-1">Código del Centro</label>
                    <input className="search-input w-full font-mono uppercase" placeholder="Ej. SUC-MTY" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-xs uppercase text-muted font-bold block mb-1">Nombre Descriptivo</label>
                    <input className="search-input w-full" placeholder="Ej. Sucursal Monterrey" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-xs uppercase text-muted font-bold block mb-1">Propósito (Opcional)</label>
                    <textarea className="search-input w-full h-24 resize-none" placeholder="Descripción extendida del modelo de segmentación..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                 </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                 <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                 <button className="btn btn-primary" onClick={handleSave} disabled={!form.code || !form.name}>Guardar Configuración</button>
              </div>
           </div>
        </div>
      )}

      <style jsx>{`
        .glass-border { border: 1px solid rgba(255,255,255,0.08); background: rgba(16,24,39,0.3); backdrop-filter: blur(10px); }
        .animate-in { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

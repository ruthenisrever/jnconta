'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Package, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const fmt = (n: number, c = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency: c, minimumFractionDigits: 2 }).format(n);

interface Product { id: string; sku: string; name: string; description?: string; cost: number; price: number; stock: number; minStock: number; unit: string; taxRate: number; currency: string; isActive: boolean; category?: { name: string }; }

const demoProducts: Product[] = [
  { id:'1', sku:'SW-001', name:'Licencia JnConta Pro Anual', cost:2500, price:4800, stock:100, minStock:5, unit:'LIC', taxRate:0.16, currency:'MXN', isActive:true, category:{name:'Software'} },
  { id:'2', sku:'HW-001', name:'Laptop Dell Latitude 5540', cost:18500, price:24900, stock:15, minStock:3, unit:'PZA', taxRate:0.16, currency:'MXN', isActive:true, category:{name:'Hardware'} },
  { id:'3', sku:'SV-001', name:'Consultoría Contable (hora)', cost:500, price:1200, stock:999, minStock:0, unit:'HR', taxRate:0.16, currency:'MXN', isActive:true, category:{name:'Servicios'} },
];

export default function InventariosPage() {
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showKardex, setShowKardex] = useState(false);
  const [kardexData, setKardexData] = useState<any[]>([]);
  const [selectedKardexProduct, setSelectedKardexProduct] = useState<Product | null>(null);
  const [showMovModal, setShowMovModal] = useState(false);
  const [movType, setMovType] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA');
  const [movForm, setMovForm] = useState({ quantity: '', unitCost: '', notes: '' });
  const [movLoading, setMovLoading] = useState(false);
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') || '' : '';

  useEffect(() => {
    apiFetch('/api/products').then(r => r.json())
      .then(d => setProducts(Array.isArray(d) ? d : demoProducts))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p: Product) => filter === '' || p.name.toLowerCase().includes(filter.toLowerCase()) || p.sku.includes(filter.toUpperCase()));
  const valorInventario = products.reduce((s: number, p: Product) => s + p.cost * p.stock, 0);
  const lowStock = products.filter((p: Product) => p.stock <= p.minStock && p.minStock > 0).length;

  const handleOpenKardex = async (product: Product) => {
     setSelectedKardexProduct(product);
     setShowKardex(true);
     setKardexData([]);
     try {
       const res = await apiFetch(`/api/inventory/kardex/${product.id}?companyId=${companyId}`);
       if (res.ok) setKardexData(await res.json());
     } catch {}
  };

  const handleOpenMovModal = (type: 'ENTRADA' | 'SALIDA') => {
    setMovType(type);
    setMovForm({ quantity: '', unitCost: selectedKardexProduct?.cost?.toString() || '', notes: '' });
    setShowMovModal(true);
  };

  const handleSubmitMovement = async () => {
    if (!selectedKardexProduct || !movForm.quantity) return;
    setMovLoading(true);
    try {
      const res = await apiFetch('/api/inventory/movement', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          productId: selectedKardexProduct.id,
          type: movType,
          quantity: parseFloat(movForm.quantity),
          unitCost: parseFloat(movForm.unitCost || '0'),
          notes: movForm.notes || `${movType === 'ENTRADA' ? 'Entrada de ajuste' : 'Salida manual'} registrada`,
        }),
      });
      if (res.ok) {
        setShowMovModal(false);
        // Recargar kardex; actualizar stock del producto afectado de forma optimista
        const delta = movType === 'SALIDA' ? -parseFloat(movForm.quantity) : parseFloat(movForm.quantity);
        setProducts(prev => prev.map(p =>
          p.id === selectedKardexProduct.id ? { ...p, stock: p.stock + delta } : p
        ));
        const kardexRes = await apiFetch(`/api/inventory/kardex/${selectedKardexProduct.id}?companyId=${companyId}`);
        if (kardexRes.ok) setKardexData(await kardexRes.json());
      }
    } catch {}
    setMovLoading(false);
  };

  return (
    <>
      <header className="main-header">
        <div className="header-title"><h1>Inventarios</h1><p>Catálogo de productos y control de existencias</p></div>
        <div className="header-actions">
          <div className="search-wrapper"><Search size={15} /><input className="search-input" placeholder="Buscar SKU o nombre..." value={filter} onChange={e => setFilter(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} />Nuevo Producto</button>
        </div>
      </header>
      <main className="main-content">
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
          <div className="kpi-card"><div className="kpi-card-icon teal"><Package size={18} /></div><p className="kpi-card-label">Total Productos</p><p className="kpi-card-value">{products.length}</p></div>
          <div className="kpi-card"><p className="kpi-card-label">Valor Inventario</p><p className="kpi-card-value" style={{fontSize:18}}>{fmt(valorInventario)}</p></div>
          <div className="kpi-card"><p className="kpi-card-label">Bajo Stock</p><p className="kpi-card-value" style={{color:lowStock>0?'var(--danger)':'var(--success)'}}>{lowStock}</p><div className="kpi-card-sub neutral"><span>{lowStock>0?'Revisar existencias':'Todo en orden'}</span></div></div>
          <div className="kpi-card"><p className="kpi-card-label">Margen Promedio</p><p className="kpi-card-value">{products.length ? Math.round(products.filter((p: Product)=>p.price>0).reduce((s: number,p: Product)=>s+((p.price-p.cost)/p.price*100),0)/products.filter((p: Product)=>p.price>0).length) : 0}%</p></div>
        </div>
        {lowStock > 0 && <div className="alert alert-warning mb-4"><AlertCircle size={16}/><span>{lowStock} producto(s) por debajo del mínimo de existencias. Verifica el almacén.</span></div>}
        <div className="panel">
          <div className="panel-header"><p className="panel-title">Catálogo de Productos</p></div>
          <div className="panel-body table-responsive">
            <table>
              <thead><tr><th>SKU</th><th>Nombre</th><th>Categoría</th><th>Costo</th><th>Precio</th><th>Margen</th><th>Stock</th><th>Mín.</th><th>Unidad</th><th>IVA</th><th>Estado</th></tr></thead>
              <tbody>
                {loading ? <tr className="loading-row"><td colSpan={11}>Cargando...</td></tr>
                  : filtered.map(p => {
                    const margin = p.price > 0 ? ((p.price - p.cost) / p.price * 100) : 0;
                    const isLow = p.stock <= p.minStock && p.minStock > 0;
                    return (
                      <tr key={p.id}>
                        <td className="td-primary">{p.sku}</td>
                        <td style={{color:'var(--text-primary)',fontWeight:500}}>{p.name}</td>
                        <td>{p.category?.name || '—'}</td>
                        <td className="td-amount">{fmt(p.cost, p.currency)}</td>
                        <td className="td-amount">{fmt(p.price, p.currency)}</td>
                        <td style={{color: margin >= 30 ? 'var(--success)' : margin >= 15 ? 'var(--warning)' : 'var(--danger)', fontWeight:600}}>{margin.toFixed(1)}%</td>
                        <td style={{color: isLow ? 'var(--danger)' : 'inherit', fontWeight: isLow ? 700 : 400}}>{p.stock} {isLow ? '⚠' : ''}</td>
                        <td style={{color:'var(--text-muted)'}}>{p.minStock}</td>
                        <td><span className="badge badge-muted">{p.unit}</span></td>
                        <td>{(p.taxRate*100).toFixed(0)}%</td>
                        <td>
                          <div className="flex items-center gap-2">
                             <button className="btn btn-ghost btn-sm text-[10px] uppercase font-bold tracking-widest text-primary-400 border border-primary-500/20" onClick={() => handleOpenKardex(p)}>Kardex</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><h2>Nuevo Producto</h2><button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setShowModal(false)}><X size={16}/></button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>SKU</label><input placeholder="PROD-001" /></div>
                <div className="form-group"><label>Unidad</label><select><option>PZA</option><option>KG</option><option>LT</option><option>MT</option><option>HR</option><option>LIC</option></select></div>
                <div className="form-group full-width"><label>Nombre del Producto</label><input placeholder="Nombre descriptivo" /></div>
                <div className="form-group full-width"><label>Descripción</label><textarea placeholder="Descripción opcional" rows={2}/></div>
                <div className="form-group"><label>Costo</label><input type="number" step="0.01" placeholder="0.00" /></div>
                <div className="form-group"><label>Precio de Venta</label><input type="number" step="0.01" placeholder="0.00" /></div>
                <div className="form-group"><label>Stock Inicial</label><input type="number" step="1" placeholder="0" /></div>
                <div className="form-group"><label>Stock Mínimo</label><input type="number" step="1" placeholder="0" /></div>
                <div className="form-group"><label>IVA</label><select><option value={0.16}>16%</option><option value={0}>0%</option><option value={0.08}>8%</option></select></div>
                <div className="form-group"><label>Moneda</label><select><option>MXN</option><option>USD</option></select></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary">Guardar Producto</button>
            </div>
          </div>
        </div>
      )}

      {/* KARDEX MODAL */}
      {showKardex && selectedKardexProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
           <div className="bg-surface-1 border border-primary-500/30 rounded-2xl w-[900px] max-h-[85vh] p-0 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-surface-2">
                 <div>
                    <h2 className="text-lg font-bold flex items-center gap-2"><Package size={18} className="text-primary-400" /> Kardex de Movimientos (Costeo Físico)</h2>
                    <span className="font-mono text-xs text-primary-300 font-bold">{selectedKardexProduct.sku} - {selectedKardexProduct.name}</span>
                 </div>
                 <button className="text-muted hover:text-white" onClick={() => setShowKardex(false)}><X size={20} /></button>
              </div>
              
              <div className="p-4 bg-black/20 flex gap-6 text-sm border-b border-white/5 shrink-0">
                 <div><span className="text-muted text-[10px] uppercase block mb-1">Costo Actual (Promedio)</span><span className="font-mono font-bold">{fmt(kardexData.length > 0 ? kardexData[kardexData.length-1].costoPromedio : selectedKardexProduct.cost)}</span></div>
                 <div><span className="text-muted text-[10px] uppercase block mb-1">Existencia Real</span><span className="font-mono font-bold text-primary-300">{selectedKardexProduct.stock} {selectedKardexProduct.unit}</span></div>
                 <div><span className="text-muted text-[10px] uppercase block mb-1">Valor Total en Almacén</span><span className="font-mono font-bold text-success">{fmt(selectedKardexProduct.stock * (kardexData.length > 0 ? kardexData[kardexData.length-1].costoPromedio : selectedKardexProduct.cost))}</span></div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                 <table className="report-table text-xs w-full">
                    <thead><tr><th>Fecha</th><th>Concepto / Tipo</th><th>Referencia</th><th className="text-right">Unidades</th><th className="text-right">Costo Unitario</th><th className="text-right">Costo Total</th><th className="text-right bg-surface-2/50">Stock Disp.</th><th className="text-right bg-surface-2/50">Costo Promedio Calc.</th></tr></thead>
                    <tbody className="font-mono">
                      {kardexData.length === 0 ? <tr><td colSpan={8} className="text-center p-8 text-muted">Sin movimientos registrados.</td></tr> : kardexData.map((m) => (
                        <tr key={m.id} className="hover:bg-surface-2 border-b border-white/5">
                           <td className="text-muted">{new Date(m.date).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' })}</td>
                           <td><span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold ${m.type==='ENTRADA'?'bg-success/20 text-success':m.type==='SALIDA'?'bg-danger/20 text-danger':'bg-warning/20 text-warning'}`}>{m.type}</span></td>
                           <td className="text-muted text-[10px]">{m.reference || m.notes || '—'}</td>
                           <td className="text-right font-bold">{m.type === 'SALIDA' ? `-${m.quantity}` : `+${m.quantity}`}</td>
                           <td className="text-right text-muted">{fmt(m.unitCost)}</td>
                           <td className={`text-right font-bold ${m.type==='ENTRADA'?'text-success':m.type==='SALIDA'?'text-danger':''}`}>{fmt(m.totalCost)}</td>
                           <td className="text-right font-bold bg-surface-2/30 text-primary-300">{m.stockAcumulado}</td>
                           <td className="text-right font-bold bg-surface-2/30 text-warning">{fmt(m.costoPromedio)}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
              </div>
              
              <div className="p-4 border-t border-white/5 bg-surface-2 flex justify-end gap-2 shrink-0">
                 <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>PDF Kardex</button>
                 <button className="btn btn-primary btn-sm bg-danger text-white border-none flex items-center gap-1" onClick={() => handleOpenMovModal('SALIDA')}>+ Salida Manual</button>
                 <button className="btn btn-primary btn-sm text-white flex items-center gap-1" onClick={() => handleOpenMovModal('ENTRADA')}>+ Entrada de Ajuste</button>
              </div>
           </div>
        </div>
      )}
      {/* MODAL MOVIMIENTO DE INVENTARIO */}
      {showMovModal && selectedKardexProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-1 border border-primary-500/30 rounded-2xl w-[440px] p-0 shadow-2xl animate-in zoom-in-95">
            <div className={`p-4 border-b border-white/5 flex justify-between items-center ${movType === 'SALIDA' ? 'bg-danger/10' : 'bg-success/10'}`}>
              <h2 className={`text-base font-bold ${movType === 'SALIDA' ? 'text-danger' : 'text-success'}`}>
                {movType === 'SALIDA' ? '— Salida Manual de Inventario' : '+ Entrada de Ajuste de Inventario'}
              </h2>
              <button className="text-muted hover:text-white" onClick={() => setShowMovModal(false)}><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-surface-2 rounded-lg p-3 text-xs">
                <span className="text-muted">Producto: </span>
                <span className="font-bold text-primary-300">{selectedKardexProduct.sku} — {selectedKardexProduct.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="text-xs text-muted mb-1 block">Cantidad *</label>
                  <input type="number" step="0.001" min="0.001" className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none"
                    value={movForm.quantity} onChange={e => setMovForm(f => ({...f, quantity: e.target.value}))} placeholder="0" autoFocus />
                </div>
                <div className="form-group">
                  <label className="text-xs text-muted mb-1 block">Costo Unitario</label>
                  <input type="number" step="0.01" min="0" className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none"
                    value={movForm.unitCost} onChange={e => setMovForm(f => ({...f, unitCost: e.target.value}))} placeholder="0.00" />
                </div>
              </div>
              <div className="form-group">
                <label className="text-xs text-muted mb-1 block">Motivo / Notas</label>
                <input type="text" className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none"
                  value={movForm.notes} onChange={e => setMovForm(f => ({...f, notes: e.target.value}))} placeholder="Ej. Ajuste físico de inventario" />
              </div>
            </div>
            <div className="p-4 border-t border-white/5 bg-surface-2 flex justify-end gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowMovModal(false)}>Cancelar</button>
              <button disabled={movLoading || !movForm.quantity}
                className={`btn btn-sm text-white font-bold px-5 ${movType === 'SALIDA' ? 'bg-danger border-danger' : 'bg-success border-success'} disabled:opacity-40`}
                onClick={handleSubmitMovement}>
                {movLoading ? 'Guardando...' : `Registrar ${movType}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

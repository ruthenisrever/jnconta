'use client';

import React, { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, Download, FileText, MapPin, Package, User, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const CONFIGS_VEHICULAR = ['C2','C3','C2R2','C3R2','C3R3','T2S1','T2S2','T3S2','T3S3','OTROEV'];
const TIPOS_PERMISO_SCT  = ['TPAF01','TPAF02','TPAF03','TPAF04','TPAF05','TPAF06','TPAF07','TPAF08','TPAF09','TPAF10','TPAF11','TPAF12'];

const initialCP = {
  transpInternac: 'No',
  totalDistKm: '',
  claveProdServ: '78101800',
  ubicaciones: [
    { tipo: 'Origen',  rfc: '', nombre: '', fechaHora: '', distanciaKm: '', calle: '', numExt: '', colonia: '', municipio: '', estado: 'JAL', cp: '' },
    { tipo: 'Destino', rfc: '', nombre: '', fechaHora: '', distanciaKm: '', calle: '', numExt: '', colonia: '', municipio: '', estado: 'JAL', cp: '' },
  ],
  mercancias: [{ bienesTransp: '10101501', descripcion: '', cantidad: '1', claveUnidad: 'KGM', pesoKg: '', valor: '', moneda: 'MXN', materialPeligroso: 'No' }],
  autotransporte: { permSCT: 'TPAF10', numPermiso: '', configVehicular: 'C2', placa: '', anio: String(new Date().getFullYear()), aseguradora: '', polizaMedAmbiente: '', aseguradoraCarga: '', polizaCarga: '', primaSeguro: '0' },
  figuras: [{ tipo: '01', rfc: '', nombre: '', numLicencia: '' }],
};

export default function CartaPortePage() {
  const [clients, setClients] = useState<any[]>([]);
  const [cartasPorte, setCartasPorte] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [openSection, setOpenSection] = useState<string>('general');

  const [form, setForm] = useState({
    clientId: '', cfdiType: 'I', serie: 'CP', date: new Date().toISOString().split('T')[0],
    currency: 'MXN', paymentMethod: 'PUE', paymentForm: '01', cfdiUse: 'S01',
    subtotal: '', cartaPorte: { ...initialCP },
  });

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    setCompanyId(cid);
    Promise.all([
      apiFetch(`/api/clients?companyId=${cid}`).then(r => r.json()),
      apiFetch(`/api/invoices/carta-porte?companyId=${cid}`).then(r => r.json()),
    ]).then(([c, cp]) => { setClients(Array.isArray(c) ? c : []); setCartasPorte(Array.isArray(cp) ? cp : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const updateCP = (path: string, value: any) => {
    setForm(prev => {
      const cp = { ...prev.cartaPorte };
      const keys = path.split('.');
      let obj: any = cp;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return { ...prev, cartaPorte: cp };
    });
  };

  const addUbicacion = () => setForm(p => ({ ...p, cartaPorte: { ...p.cartaPorte, ubicaciones: [...p.cartaPorte.ubicaciones, { tipo: 'Destino', rfc: '', nombre: '', fechaHora: '', distanciaKm: '', calle: '', numExt: '', colonia: '', municipio: '', estado: 'JAL', cp: '' }] } }));
  const removeUbicacion = (i: number) => setForm(p => ({ ...p, cartaPorte: { ...p.cartaPorte, ubicaciones: p.cartaPorte.ubicaciones.filter((_: any, idx: number) => idx !== i) } }));
  const updateUbicacion = (i: number, field: string, val: string) => {
    const ubs = [...form.cartaPorte.ubicaciones];
    ubs[i] = { ...ubs[i], [field]: val };
    setForm(p => ({ ...p, cartaPorte: { ...p.cartaPorte, ubicaciones: ubs } }));
  };

  const addMercancia = () => setForm(p => ({ ...p, cartaPorte: { ...p.cartaPorte, mercancias: [...p.cartaPorte.mercancias, { bienesTransp: '10101501', descripcion: '', cantidad: '1', claveUnidad: 'KGM', pesoKg: '', valor: '', moneda: 'MXN', materialPeligroso: 'No' }] } }));
  const removeMercancia = (i: number) => setForm(p => ({ ...p, cartaPorte: { ...p.cartaPorte, mercancias: p.cartaPorte.mercancias.filter((_: any, idx: number) => idx !== i) } }));
  const updateMercancia = (i: number, field: string, val: string) => {
    const m = [...form.cartaPorte.mercancias];
    m[i] = { ...m[i], [field]: val };
    setForm(p => ({ ...p, cartaPorte: { ...p.cartaPorte, mercancias: m } }));
  };

  const addFigura = () => setForm(p => ({ ...p, cartaPorte: { ...p.cartaPorte, figuras: [...p.cartaPorte.figuras, { tipo: '01', rfc: '', nombre: '', numLicencia: '' }] } }));
  const removeFigura = (i: number) => setForm(p => ({ ...p, cartaPorte: { ...p.cartaPorte, figuras: p.cartaPorte.figuras.filter((_: any, idx: number) => idx !== i) } }));
  const updateFigura = (i: number, field: string, val: string) => {
    const f = [...form.cartaPorte.figuras];
    f[i] = { ...f[i], [field]: val };
    setForm(p => ({ ...p, cartaPorte: { ...p.cartaPorte, figuras: f } }));
  };

  const handleSave = async () => {
    if (!form.clientId) return alert('Selecciona el receptor (cliente o propio RFC)');
    setSaving(true);
    try {
      const res = await apiFetch('/api/invoices/carta-porte', {
        method: 'POST',
        body: JSON.stringify({ ...form, companyId, subtotal: Number(form.subtotal) || 0, items: [{ description: 'Servicio de autotransporte terrestre', quantity: 1, unitPrice: Number(form.subtotal) || 0, satCode: form.cartaPorte.claveProdServ, unitKey: 'E48' }] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCartasPorte(prev => [data, ...prev]);
      setShowForm(false);
      setForm({ clientId: '', cfdiType: 'I', serie: 'CP', date: new Date().toISOString().split('T')[0], currency: 'MXN', paymentMethod: 'PUE', paymentForm: '01', cfdiUse: 'S01', subtotal: '', cartaPorte: { ...initialCP } });
    } catch (e: any) { alert('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  const downloadXml = async (id: string, folio: number) => {
    const res = await apiFetch(`/api/invoices/carta-porte/${id}/xml`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `CP${folio}.xml`; a.click();
    URL.revokeObjectURL(url);
  };

  const Section = ({ id, title, icon: Icon, children }: any) => (
    <div className="border border-surface-3 rounded-xl overflow-hidden mb-4">
      <button className="w-full flex items-center justify-between p-4 bg-surface-2 hover:bg-surface-3 transition-colors" onClick={() => setOpenSection(openSection === id ? '' : id)}>
        <div className="flex items-center gap-3 font-bold"><Icon size={18} className="text-primary-400" />{title}</div>
        {openSection === id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {openSection === id && <div className="p-4">{children}</div>}
    </div>
  );

  const inputCls = 'input text-sm';
  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Carta Porte — CFDI 4.0 CP 3.1</h1>
          <p>Complemento Carta Porte obligatorio para el traslado de mercancías por autotransporte federal.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Nueva Carta Porte
          </button>
        </div>
      </header>

      {/* FORMULARIO */}
      {showForm && (
        <div className="panel mb-8">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Truck size={18} className="text-primary-400" />Nuevo CFDI con Complemento Carta Porte 3.1</h3>

          {/* ── 1. DATOS GENERALES ── */}
          <Section id="general" title="1. Datos del CFDI" icon={FileText}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Receptor (Cliente)</label>
                <select className={inputCls} value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
                  <option value="">-- Seleccionar --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.rfc}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Tipo CFDI</label>
                <select className={inputCls} value={form.cfdiType} onChange={e => setForm(p => ({ ...p, cfdiType: e.target.value }))}>
                  <option value="I">I — Ingreso (cobro por servicio de transporte)</option>
                  <option value="T">T — Traslado (mercancía propia, sin cobro)</option>
                </select>
              </div>
              <div>
                <label className="form-label">Fecha</label>
                <input type="date" className={inputCls} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              {form.cfdiType === 'I' && (
                <div>
                  <label className="form-label">Subtotal Servicio ($)</label>
                  <input type="number" className={inputCls} placeholder="0.00" value={form.subtotal} onChange={e => setForm(p => ({ ...p, subtotal: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="form-label">Clave SAT Servicio</label>
                <input className={inputCls} value={form.cartaPorte.claveProdServ} onChange={e => updateCP('claveProdServ', e.target.value)} placeholder="78101800" />
              </div>
              <div>
                <label className="form-label">Internacional</label>
                <select className={inputCls} value={form.cartaPorte.transpInternac} onChange={e => updateCP('transpInternac', e.target.value)}>
                  <option value="No">No</option>
                  <option value="Sí">Sí</option>
                </select>
              </div>
              <div>
                <label className="form-label">Distancia Total Recorrida (km)</label>
                <input type="number" className={inputCls} value={form.cartaPorte.totalDistKm} onChange={e => updateCP('totalDistKm', e.target.value)} />
              </div>
            </div>
          </Section>

          {/* ── 2. UBICACIONES ── */}
          <Section id="ubicaciones" title="2. Ubicaciones (Origen / Destino)" icon={MapPin}>
            <div className="space-y-4">
              {form.cartaPorte.ubicaciones.map((u: any, i: number) => (
                <div key={i} className="p-4 bg-surface-2 rounded-xl border border-surface-3">
                  <div className="flex justify-between items-center mb-3">
                    <span className={`badge ${u.tipo === 'Origen' ? 'badge-success' : 'badge-warning'}`}>{u.tipo}</span>
                    {i > 1 && <button onClick={() => removeUbicacion(i)} className="btn btn-ghost btn-sm p-1 text-danger"><Trash2 size={14} /></button>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><label className="form-label">Tipo</label>
                      <select className={inputCls} value={u.tipo} onChange={e => updateUbicacion(i, 'tipo', e.target.value)}>
                        <option>Origen</option><option>Destino</option>
                      </select>
                    </div>
                    <div><label className="form-label">RFC Remitente/Dest.</label><input className={inputCls} value={u.rfc} onChange={e => updateUbicacion(i, 'rfc', e.target.value)} placeholder="XAXX010101000" /></div>
                    <div><label className="form-label">Nombre</label><input className={inputCls} value={u.nombre} onChange={e => updateUbicacion(i, 'nombre', e.target.value)} /></div>
                    <div><label className="form-label">Fecha/Hora Salida</label><input type="datetime-local" className={inputCls} value={u.fechaHora} onChange={e => updateUbicacion(i, 'fechaHora', e.target.value)} /></div>
                    <div><label className="form-label">Calle</label><input className={inputCls} value={u.calle} onChange={e => updateUbicacion(i, 'calle', e.target.value)} /></div>
                    <div><label className="form-label">Núm. Ext.</label><input className={inputCls} value={u.numExt} onChange={e => updateUbicacion(i, 'numExt', e.target.value)} /></div>
                    <div><label className="form-label">Colonia</label><input className={inputCls} value={u.colonia} onChange={e => updateUbicacion(i, 'colonia', e.target.value)} /></div>
                    <div><label className="form-label">Municipio</label><input className={inputCls} value={u.municipio} onChange={e => updateUbicacion(i, 'municipio', e.target.value)} /></div>
                    <div><label className="form-label">Estado (clave SAT)</label>
                      <select className={inputCls} value={u.estado} onChange={e => updateUbicacion(i, 'estado', e.target.value)}>
                        {['AGU','BCN','BCS','CAM','CHP','CHH','COA','COL','DIF','DUR','GUA','GRO','HID','JAL','MEX','MIC','MOR','NAY','NLE','OAX','PUE','QUE','ROO','SLP','SIN','SON','TAB','TAM','TLA','VER','YUC','ZAC'].map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div><label className="form-label">C.P.</label><input className={inputCls} value={u.cp} onChange={e => updateUbicacion(i, 'cp', e.target.value)} maxLength={5} /></div>
                    <div><label className="form-label">Distancia (km)</label><input type="number" className={inputCls} value={u.distanciaKm} onChange={e => updateUbicacion(i, 'distanciaKm', e.target.value)} /></div>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm flex items-center gap-2" onClick={addUbicacion}><Plus size={14} /> Agregar Destino</button>
            </div>
          </Section>

          {/* ── 3. MERCANCÍAS ── */}
          <Section id="mercancias" title="3. Mercancías" icon={Package}>
            <div className="space-y-4">
              {form.cartaPorte.mercancias.map((m: any, i: number) => (
                <div key={i} className="p-4 bg-surface-2 rounded-xl border border-surface-3">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold">Mercancía {i + 1}</span>
                    {form.cartaPorte.mercancias.length > 1 && <button onClick={() => removeMercancia(i)} className="btn btn-ghost btn-sm p-1 text-danger"><Trash2 size={14} /></button>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><label className="form-label">Clave Bienes Transp.</label><input className={inputCls} value={m.bienesTransp} onChange={e => updateMercancia(i, 'bienesTransp', e.target.value)} placeholder="10101501" /></div>
                    <div className="md:col-span-2"><label className="form-label">Descripción</label><input className={inputCls} value={m.descripcion} onChange={e => updateMercancia(i, 'descripcion', e.target.value)} /></div>
                    <div><label className="form-label">Cantidad</label><input type="number" className={inputCls} value={m.cantidad} onChange={e => updateMercancia(i, 'cantidad', e.target.value)} /></div>
                    <div><label className="form-label">Clave Unidad</label><input className={inputCls} value={m.claveUnidad} onChange={e => updateMercancia(i, 'claveUnidad', e.target.value)} placeholder="KGM" /></div>
                    <div><label className="form-label">Peso Bruto (kg)</label><input type="number" className={inputCls} value={m.pesoKg} onChange={e => updateMercancia(i, 'pesoKg', e.target.value)} /></div>
                    <div><label className="form-label">Valor Declarado ($)</label><input type="number" className={inputCls} value={m.valor} onChange={e => updateMercancia(i, 'valor', e.target.value)} /></div>
                    <div><label className="form-label">Mat. Peligroso</label>
                      <select className={inputCls} value={m.materialPeligroso} onChange={e => updateMercancia(i, 'materialPeligroso', e.target.value)}>
                        <option value="No">No</option><option value="Sí">Sí</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm flex items-center gap-2" onClick={addMercancia}><Plus size={14} /> Agregar Mercancía</button>
            </div>
          </Section>

          {/* ── 4. AUTOTRANSPORTE ── */}
          <Section id="autotransporte" title="4. Datos del Vehículo (Autotransporte)" icon={Truck}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><label className="form-label">Permiso SCT</label>
                <select className={inputCls} value={form.cartaPorte.autotransporte.permSCT} onChange={e => updateCP('autotransporte.permSCT', e.target.value)}>
                  {TIPOS_PERMISO_SCT.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div><label className="form-label">Núm. Permiso SCT</label><input className={inputCls} value={form.cartaPorte.autotransporte.numPermiso} onChange={e => updateCP('autotransporte.numPermiso', e.target.value)} /></div>
              <div><label className="form-label">Configuración Vehicular</label>
                <select className={inputCls} value={form.cartaPorte.autotransporte.configVehicular} onChange={e => updateCP('autotransporte.configVehicular', e.target.value)}>
                  {CONFIGS_VEHICULAR.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="form-label">Placa</label><input className={inputCls} value={form.cartaPorte.autotransporte.placa} onChange={e => updateCP('autotransporte.placa', e.target.value)} placeholder="AAA-000-A" /></div>
              <div><label className="form-label">Año Modelo</label><input type="number" className={inputCls} value={form.cartaPorte.autotransporte.anio} onChange={e => updateCP('autotransporte.anio', e.target.value)} /></div>
              <div><label className="form-label">Aseguradora (Resp. Civil)</label><input className={inputCls} value={form.cartaPorte.autotransporte.aseguradora} onChange={e => updateCP('autotransporte.aseguradora', e.target.value)} placeholder="GNP, AXA, HDI..." /></div>
              <div><label className="form-label">Póliza Resp. Civil</label><input className={inputCls} value={form.cartaPorte.autotransporte.polizaMedAmbiente} onChange={e => updateCP('autotransporte.polizaMedAmbiente', e.target.value)} /></div>
              <div><label className="form-label">Aseguradora Carga</label><input className={inputCls} value={form.cartaPorte.autotransporte.aseguradoraCarga} onChange={e => updateCP('autotransporte.aseguradoraCarga', e.target.value)} /></div>
              <div><label className="form-label">Póliza Carga</label><input className={inputCls} value={form.cartaPorte.autotransporte.polizaCarga} onChange={e => updateCP('autotransporte.polizaCarga', e.target.value)} /></div>
              <div><label className="form-label">Prima de Seguro ($)</label><input type="number" className={inputCls} value={form.cartaPorte.autotransporte.primaSeguro} onChange={e => updateCP('autotransporte.primaSeguro', e.target.value)} /></div>
            </div>
          </Section>

          {/* ── 5. FIGURAS DE TRANSPORTE ── */}
          <Section id="figuras" title="5. Figuras de Transporte (Operador/Propietario)" icon={User}>
            <div className="space-y-4">
              {form.cartaPorte.figuras.map((f: any, i: number) => (
                <div key={i} className="p-4 bg-surface-2 rounded-xl border border-surface-3">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold">Figura {i + 1}</span>
                    {form.cartaPorte.figuras.length > 1 && <button onClick={() => removeFigura(i)} className="btn btn-ghost btn-sm p-1 text-danger"><Trash2 size={14} /></button>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><label className="form-label">Tipo</label>
                      <select className={inputCls} value={f.tipo} onChange={e => updateFigura(i, 'tipo', e.target.value)}>
                        <option value="01">01 — Operador</option>
                        <option value="02">02 — Propietario</option>
                        <option value="03">03 — Arrendador</option>
                        <option value="04">04 — Notificado</option>
                      </select>
                    </div>
                    <div><label className="form-label">RFC</label><input className={inputCls} value={f.rfc} onChange={e => updateFigura(i, 'rfc', e.target.value)} placeholder="XXXX000000XXX" /></div>
                    <div><label className="form-label">Nombre</label><input className={inputCls} value={f.nombre} onChange={e => updateFigura(i, 'nombre', e.target.value)} /></div>
                    {f.tipo === '01' && <div><label className="form-label">Núm. Licencia</label><input className={inputCls} value={f.numLicencia} onChange={e => updateFigura(i, 'numLicencia', e.target.value)} /></div>}
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm flex items-center gap-2" onClick={addFigura}><Plus size={14} /> Agregar Figura</button>
            </div>
          </Section>

          <div className="flex gap-3 mt-4">
            <button className="btn btn-primary flex items-center gap-2" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : <><CheckCircle2 size={16} /> Guardar Carta Porte</>}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* LISTADO */}
      <div className="panel">
        <h3 className="font-bold mb-6 flex items-center gap-2">
          <Truck size={18} className="text-primary-400" /> Cartas Porte Emitidas
        </h3>
        {loading ? (
          <div className="py-12 text-center text-muted">Cargando...</div>
        ) : cartasPorte.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-surface-3 rounded-2xl text-muted">
            No hay Cartas Porte. Presiona <strong>Nueva Carta Porte</strong> para crear la primera.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Folio</th><th>Tipo</th><th>Receptor</th><th>Fecha</th><th className="text-right">Total</th><th>Estado</th><th />
                </tr>
              </thead>
              <tbody>
                {cartasPorte.map((cp: any) => (
                  <tr key={cp.id}>
                    <td className="font-mono font-bold">{cp.serie}{cp.folio}</td>
                    <td><span className="badge badge-default">{cp.cfdiType === 'T' ? 'Traslado' : 'Ingreso'}</span></td>
                    <td>{cp.client?.name ?? cp.clientId}</td>
                    <td className="text-xs">{new Date(cp.date).toLocaleDateString('es-MX')}</td>
                    <td className="text-right font-bold">${Number(cp.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td><span className={`badge ${cp.uuid ? 'badge-success' : 'badge-default'}`}>{cp.uuid ? 'TIMBRADO' : 'BORRADOR'}</span></td>
                    <td className="flex gap-1">
                      <button className="btn btn-ghost btn-sm p-1" title="Descargar XML" onClick={() => downloadXml(cp.id, cp.folio)}><Download size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';

type Entity = 'clients' | 'suppliers' | 'products' | 'accounts';
const ENTITY_LABELS: Record<Entity, string> = { clients: 'Clientes', suppliers: 'Proveedores', products: 'Productos', accounts: 'Plan de Cuentas' };
const ENTITY_FIELDS: Record<Entity, string[]> = {
  clients: ['code', 'name', 'rfc', 'email', 'phone', 'creditLimit', 'creditDays'],
  suppliers: ['code', 'name', 'rfc', 'email', 'phone', 'creditDays'],
  products: ['sku', 'name', 'description', 'cost', 'price', 'stock', 'unit'],
  accounts: ['code', 'name', 'type', 'nature', 'level', 'satCode'],
};

const TEMPLATES: Record<Entity, string> = {
  clients: 'code,name,rfc,email,phone,creditLimit,creditDays\nCLI-001,Empresa Ejemplo SA de CV,EEJ010101001,ejemplo@empresa.com,5512345678,50000,30',
  suppliers: 'code,name,rfc,email,phone,creditDays\nPROV-001,Proveedor Ejemplo SA de CV,PEJ020202002,prov@empresa.com,5598765432,15',
  products: 'sku,name,description,cost,price,stock,unit\nPRD-001,Producto Ejemplo,Descripción del producto,100,200,50,PZA',
  accounts: 'code,name,type,nature,level,satCode\n1.1.01,Caja,ACTIVO,DEUDORA,3,102.01',
};

export default function ImportarPage() {
  const [entity, setEntity] = useState<Entity>('clients');
  const [csv, setCsv] = useState('');
  const [parsed, setParsed] = useState<{ headers: string[]; rows: any[]; count: number } | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const cid = typeof window !== 'undefined' ? localStorage.getItem('companyId') : '';

  const parseCSV = async () => {
    if (!csv.trim()) return;
    const r = await apiFetch('/api/import/parse-csv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv }) });
    const d = await r.json();
    setParsed(d); setResult(null);
  };

  const doImport = async () => {
    if (!parsed) return;
    setLoading(true);
    const r = await apiFetch(`/api/import/${entity}?companyId=${cid}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: parsed.rows }) });
    const d = await r.json();
    setResult(d); setLoading(false);
  };

  const loadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setCsv(ev.target?.result as string); setParsed(null); setResult(null); };
    reader.readAsText(file, 'UTF-8');
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATES[entity]], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `plantilla-${entity}.csv`; a.click();
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Importación Masiva</h1>
          <p className="page-subtitle">Importa clientes, proveedores, productos o cuentas desde archivos CSV</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(Object.keys(ENTITY_LABELS) as Entity[]).map(e => (
          <button key={e} onClick={() => { setEntity(e); setCsv(''); setParsed(null); setResult(null); }} style={{ padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: entity === e ? 'var(--primary-600)' : 'var(--surface-2)', color: entity === e ? '#fff' : 'var(--text-muted)' }}>{ENTITY_LABELS[e]}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: 14 }}>Paso 1: Pega o carga tu CSV</h3>
              <button onClick={downloadTemplate} style={{ background: '#3b82f620', border: '1px solid #3b82f630', color: '#3b82f6', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Descargar Plantilla</button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 8 }}>Campos requeridos: <code style={{ color: 'var(--teal-400)' }}>{ENTITY_FIELDS[entity].join(', ')}</code></p>
            <label style={{ display: 'block', background: 'var(--surface-2)', border: '2px dashed var(--border)', borderRadius: 8, padding: 12, cursor: 'pointer', textAlign: 'center', marginBottom: 10, color: 'var(--text-muted)', fontSize: 13 }}>
              📂 Seleccionar archivo CSV
              <input type="file" accept=".csv,.txt" onChange={loadFile} style={{ display: 'none' }} />
            </label>
            <textarea className="input" rows={10} value={csv} onChange={e => { setCsv(e.target.value); setParsed(null); }} placeholder={`Pega el contenido CSV aquí...\n\nEjemplo:\n${TEMPLATES[entity]}`} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} />
            <button className="btn-primary" onClick={parseCSV} disabled={!csv.trim()} style={{ width: '100%', marginTop: 10 }}>Vista Previa</button>
          </div>
        </div>

        <div>
          {parsed && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: 14, marginBottom: 12 }}>Paso 2: Vista Previa — {parsed.count} registros</h3>
              <div style={{ overflow: 'auto', maxHeight: 280 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr>{parsed.headers.map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {parsed.rows.slice(0, 8).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        {parsed.headers.map(h => <td key={h} style={{ padding: '5px 10px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{row[h] ?? ''}</td>)}
                      </tr>
                    ))}
                    {parsed.rows.length > 8 && <tr><td colSpan={parsed.headers.length} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 8 }}>...y {parsed.rows.length - 8} más</td></tr>}
                  </tbody>
                </table>
              </div>
              <button className="btn-primary" onClick={doImport} disabled={loading} style={{ width: '100%', marginTop: 12, background: '#10b981' }}>{loading ? 'Importando...' : `Importar ${parsed.count} ${ENTITY_LABELS[entity]}`}</button>
            </div>
          )}

          {result && (
            <div style={{ background: result.errors?.length > 0 ? '#f59e0b10' : '#10b98110', border: `1px solid ${result.errors?.length > 0 ? '#f59e0b' : '#10b981'}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ color: result.errors?.length > 0 ? '#f59e0b' : '#10b981', marginBottom: 12 }}>Resultado de la importación</h3>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>✓ {result.created} importados</span>
                <span style={{ color: '#6b7280', fontWeight: 700 }}>⊘ {result.skipped} omitidos</span>
                {result.errors?.length > 0 && <span style={{ color: '#ef4444', fontWeight: 700 }}>✕ {result.errors.length} errores</span>}
              </div>
              {result.errors?.slice(0, 5).map((e: string, i: number) => (
                <p key={i} style={{ color: '#ef4444', fontSize: 12, margin: '2px 0' }}>• {e}</p>
              ))}
            </div>
          )}

          {!parsed && !result && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: 14, marginBottom: 12 }}>Instrucciones</h3>
              <ol style={{ color: 'var(--text-muted)', fontSize: 13, paddingLeft: 18, lineHeight: 1.8 }}>
                <li>Descarga la <strong>plantilla CSV</strong> del tipo de datos a importar</li>
                <li>Llena el archivo con tus datos (sin modificar los encabezados)</li>
                <li>Sube o pega el contenido del CSV en el área izquierda</li>
                <li>Revisa la vista previa y confirma la importación</li>
              </ol>
              <div style={{ marginTop: 16, background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Los registros con código/SKU existente se <strong>actualizarán</strong>. Los nuevos se crearán. El proceso es idempotente y seguro de repetir.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function FielPage() {
  const [cert, setCert] = useState('');
  const [key, setKey] = useState('');
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const cid = typeof window !== 'undefined' ? localStorage.getItem('companyId') : '';

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const r = await apiFetch(`/api/companies/${cid}`);
      const d = await r.json();
      if (d.fielCert) setCert(d.fielCert.substring(0, 40) + '…');
      if (d.fielKey) setKey(d.fielKey.substring(0, 40) + '…');
    } catch {}
  };

  const loadFile = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const buf = ev.target?.result as ArrayBuffer;
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      setter(b64);
    };
    reader.readAsArrayBuffer(file);
  };

  const save = async () => {
    const body: any = { fielPassword: password };
    if (!cert.includes('…')) body.fielCert = cert;
    if (!key.includes('…')) body.fielKey = key;
    const r = await apiFetch(`/api/companies/${cid}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaved(r.ok);
    setTimeout(() => setSaved(false), 3000);
  };

  const testSync = async () => {
    setTesting(true);
    setTestResult(null);
    const now = new Date();
    const fechaFinal = now.toISOString().split('T')[0];
    const fechaInicial = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    try {
      const r = await apiFetch('/api/sat-sync/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: cid,
          fechaInicial,
          fechaFinal,
          ...(!cert.includes('…') && { fielCert: cert }),
          ...(!key.includes('…') && { fielKey: key }),
          fielPassword: password,
        }),
      });
      const d = await r.json();
      setTestResult({ ok: r.ok, msg: d.message ?? JSON.stringify(d) });
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.message });
    }
    setTesting(false);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración FIEL</h1>
          <p className="page-subtitle">Firma Electrónica Avanzada — requerida para Descarga Masiva SAT</p>
        </div>
      </div>

      <div style={{ maxWidth: 600 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: 14, marginBottom: 16 }}>Archivos FIEL del SAT</h3>

          <div style={{ marginBottom: 14 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 6 }}>Certificado (.cer)</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', border: '2px dashed var(--border)', borderRadius: 8, padding: 12, cursor: 'pointer' }}>
              <span style={{ color: cert ? '#10b981' : 'var(--text-muted)', fontSize: 13 }}>
                {cert ? (cert.includes('…') ? '✓ Certificado guardado' : '✓ Archivo seleccionado') : '📂 Seleccionar archivo .cer'}
              </span>
              <input type="file" accept=".cer" onChange={loadFile(setCert)} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 6 }}>Llave privada (.key)</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', border: '2px dashed var(--border)', borderRadius: 8, padding: 12, cursor: 'pointer' }}>
              <span style={{ color: key ? '#10b981' : 'var(--text-muted)', fontSize: 13 }}>
                {key ? (key.includes('…') ? '✓ Llave guardada' : '✓ Archivo seleccionado') : '📂 Seleccionar archivo .key'}
              </span>
              <input type="file" accept=".key" onChange={loadFile(setKey)} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 6 }}>Contraseña del .key</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña de tu llave privada FIEL"
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" onClick={save} style={{ flex: 1 }}>
              {saved ? '✓ Guardado' : 'Guardar FIEL'}
            </button>
            <button onClick={testSync} disabled={testing} style={{ flex: 1, background: '#3b82f620', border: '1px solid #3b82f640', color: '#3b82f6', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              {testing ? 'Probando…' : 'Probar Descarga SAT'}
            </button>
          </div>

          {testResult && (
            <div style={{ marginTop: 14, background: testResult.ok ? '#10b98110' : '#ef444410', border: `1px solid ${testResult.ok ? '#10b981' : '#ef4444'}`, borderRadius: 8, padding: 12 }}>
              <p style={{ color: testResult.ok ? '#10b981' : '#ef4444', fontSize: 13 }}>{testResult.msg}</p>
            </div>
          )}
        </div>

        <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: 8, padding: 14 }}>
          <p style={{ color: '#f59e0b', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Seguridad</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6 }}>
            Tu FIEL se almacena cifrada en la base de datos y solo se usa para firmar solicitudes al SAT.
            Nunca se transmite a terceros. Si cambias tu FIEL (renovación), sube los nuevos archivos aquí.
          </p>
        </div>
      </div>
    </div>
  );
}

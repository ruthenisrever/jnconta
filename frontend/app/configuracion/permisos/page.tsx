'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', invoices: 'Facturación', payments: 'Complemento Pagos', quotes: 'Cotizaciones',
  pos: 'Punto de Venta', clients: 'Clientes', suppliers: 'Proveedores', bills: 'Compras',
  banks: 'Bancos', reconciliation: 'Conciliación', inventory: 'Inventarios', warehouses: 'Almacenes',
  assets: 'Activos Fijos', payroll: 'Nómina', nomina: 'Nómina CFDI', reports: 'Reportes',
  sat: 'Portal SAT', diot: 'DIOT', 'xml-sat': 'Gestor XML', 'sat-exports': 'Cont. Electrónica',
  accounts: 'Plan de Cuentas', journals: 'Pólizas', budgets: 'Presupuestos', segments: 'C. de Costos',
  audit: 'Auditoría', templates: 'Plantillas', fiscal: 'Fiscal', currencies: 'Multimoneda',
  companies: 'Empresas', certificates: 'Certificados',
};

export default function PermisosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [perms, setPerms] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const cid = typeof window !== 'undefined' ? localStorage.getItem('companyId') : '';

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selectedUser) loadPerms(); }, [selectedUser]);

  const load = async () => {
    const [u, m] = await Promise.all([
      apiFetch(`/api/permissions/users?companyId=${cid}`).then(r => r.json()),
      apiFetch('/api/permissions/modules').then(r => r.json()),
    ]);
    setUsers(Array.isArray(u) ? u : []);
    setModules(Array.isArray(m) ? m : []);
  };

  const loadPerms = async () => {
    const p = await apiFetch(`/api/permissions?companyId=${cid}&userId=${selectedUser}`).then(r => r.json());
    setPerms(p ?? {});
  };

  const toggle = (module: string, field: string) => {
    setPerms(prev => ({ ...prev, [module]: { ...(prev[module] ?? {}), module, [field]: !(prev[module]?.[field] ?? false) } }));
  };

  const save = async () => {
    setSaving(true);
    const permissions = modules.map(m => ({ module: m, canView: perms[m]?.canView ?? true, canCreate: perms[m]?.canCreate ?? false, canEdit: perms[m]?.canEdit ?? false, canDelete: perms[m]?.canDelete ?? false }));
    await apiFetch('/api/permissions/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId: cid, userId: selectedUser, permissions }) });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Permisos por Módulo</h1>
          <p className="page-subtitle">Control granular de acceso por usuario y módulo</p>
        </div>
        {selectedUser && <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar Cambios'}</button>}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 6 }}>Seleccionar Usuario</label>
        <select className="input" style={{ maxWidth: 400 }} value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
          <option value="">-- Seleccionar usuario --</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email}) — {u.role}</option>)}
        </select>
      </div>

      {selectedUser && modules.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>Módulo</th>
                {['Ver', 'Crear', 'Editar', 'Eliminar'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, width: 80 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((mod, i) => {
                const p = perms[mod] ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };
                return (
                  <tr key={mod} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>{MODULE_LABELS[mod] ?? mod}</td>
                    {(['canView', 'canCreate', 'canEdit', 'canDelete'] as const).map(field => (
                      <td key={field} style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input type="checkbox" checked={p[field] ?? false} onChange={() => toggle(mod, field)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary-500)' }} />
                        </label>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!selectedUser && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 80 }}>
          <p style={{ fontSize: 16 }}>Selecciona un usuario para configurar sus permisos</p>
        </div>
      )}
    </div>
  );
}

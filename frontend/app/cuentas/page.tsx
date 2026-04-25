'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Search, ChevronRight, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const getCompanyId = () => typeof window !== 'undefined' ? (localStorage.getItem('companyId') || '') : '';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  nature: string;
  level: number;
  satCode?: string;
  children?: Account[];
}

const TYPE_COLORS: Record<string, string> = {
  ACTIVO: 'badge-success',
  PASIVO: 'badge-danger',
  CAPITAL: 'badge-primary',
  INGRESO: 'badge-info',
  GASTO: 'badge-warning'
};

function AccountRow({ account, depth = 0, onEdit }: { account: Account; depth?: number; onEdit: (acc: Account) => void }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = account.children && account.children.length > 0;
  
  return (
    <>
      <tr>
        <td style={{ paddingLeft: 16 + depth * 24 }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button 
                onClick={() => setOpen(!open)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-300)', padding: 0, display: 'flex' }}
              >
                <ChevronRight size={14} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: '0.15s' }} />
              </button>
            ) : <span style={{ width: 14 }} />}
            <span className="td-primary" style={{ fontWeight: depth === 0 ? 800 : depth === 1 ? 700 : 500, fontSize: depth === 0 ? 14 : 13 }}>
              {account.code}
            </span>
          </div>
        </td>
        <td style={{ paddingLeft: 16 + depth * 24, fontWeight: depth === 0 ? 700 : 400, color: depth === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {account.name}
        </td>
        <td><span className={`badge ${TYPE_COLORS[account.type] || 'badge-muted'}`}>{account.type}</span></td>
        <td><span className="badge badge-muted">{account.nature}</span></td>
        <td style={{ color: 'var(--primary-300)', fontFamily: 'monospace', fontWeight: 600 }}>{account.satCode || '-'}</td>
        <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>Nivel {account.level}</td>
        <td>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => onEdit(account)}>Editar</button>
          </div>
        </td>
      </tr>
      {open && hasChildren && account.children?.map(child => (
        <AccountRow key={child.id} account={child} depth={depth + 1} onEdit={onEdit} />
      ))}
    </>
  );
}

export default function CuentasPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [filter, setFilter] = useState('');
  const [formData, setFormData] = useState({
    code: '', name: '', type: 'ACTIVO', nature: 'DEUDORA', level: 1, satCode: ''
  });

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/accounts?companyId=${getCompanyId()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Build hierarchy for display (recursive helper)
        setAccounts(data.filter(a => a.level === 1));
      }
    } catch (e) {
      console.error('Error loading accounts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (getCompanyId()) loadAccounts();
  }, []);

  const openForm = (acc?: Account) => {
    if (acc) {
      setEditingAccount(acc);
      setFormData({
        code: acc.code,
        name: acc.name,
        type: acc.type,
        nature: acc.nature,
        level: acc.level,
        satCode: acc.satCode || ''
      });
    } else {
      setEditingAccount(null);
      setFormData({ code: '', name: '', type: 'ACTIVO', nature: 'DEUDORA', level: 1, satCode: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    const isEdit = !!editingAccount;
    const url = isEdit ? `/api/accounts/${editingAccount.id}` : `/api/accounts`;
    const method = isEdit ? 'PUT' : 'POST';
    
    const payload = isEdit 
      ? { name: formData.name, satCode: formData.satCode }
      : { ...formData, companyId: getCompanyId() };

    try {
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        loadAccounts();
      }
    } catch (e) {
      console.error('Error saving account:', e);
    }
  };

  return (
    <>
      <header className="main-header">
        <div className="header-title">
          <h1>Plan de Cuentas</h1>
          <p>Catálogo de cuentas contables y códigos SAT</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="search-wrapper">
            <Search size={15} />
            <input 
              className="search-input" 
              placeholder="Buscar cuenta..." 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
            />
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ whiteSpace: 'nowrap' }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv,.txt';
              input.onchange = async (e: any) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (event: any) => {
                  const text = event.target.result;
                  const lines = text.split('\n').filter((l: string) => l.trim());
                  const accounts: any[] = lines.slice(1).map((line: string) => {
                    const [code, name, type, nature, satCode, level] = line.split(',');
                    return { code: code?.trim(), name: name?.trim(), type: type?.trim() || 'ACTIVO', nature: nature?.trim() || 'DEUDORA', satCode: satCode?.trim(), level: parseInt(level) || 1 };
                  });
                  
                  try {
                    const res = await apiFetch('/api/accounts/import', {
                      method: 'POST',
                      body: JSON.stringify({ accounts, companyId: getCompanyId() })
                    });
                    if (res.ok) {
                      alert('Catálogo importado con éxito');
                      loadAccounts();
                    }
                  } catch (err) {
                    alert('Error al importar catálogo');
                  }
                };
                reader.readAsText(file);
              };
              input.click();
            }}
          >
            Importar Catálogo
          </button>
          <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={() => openForm()}>
            <Plus size={15} /> Nueva Cuenta
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-title">Catálogo de Cuentas</p>
              <p className="panel-subtitle">Sincronizado con códigos agrupadores del SAT</p>
            </div>
          </div>
          <div className="panel-body table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Naturaleza</th>
                  <th>Cód. SAT</th>
                  <th>Nivel</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Cargando catálogo...</td></tr>
                ) : accounts.length === 0 ? (
                   <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>No hay cuentas registradas.</td></tr>
                ) : (
                  accounts.map(a => <AccountRow key={a.id} account={a} onEdit={openForm} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editingAccount ? 'Propiedades de Cuenta' : 'Nueva Cuenta'}</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Código</label>
                  <input 
                    disabled={!!editingAccount}
                    value={formData.code} 
                    onChange={e => setFormData({...formData, code: e.target.value})} 
                    placeholder="Ej: 1.1.01" 
                  />
                </div>
                <div className="form-group">
                  <label>Nivel</label>
                  <select 
                    disabled={!!editingAccount}
                    value={formData.level} 
                    onChange={e => setFormData({...formData, level: parseInt(e.target.value)})}
                  >
                    {[1, 2, 3, 4].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Nombre</label>
                  <input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="Nombre descriptivo de la cuenta" 
                  />
                </div>
                <div className="form-group">
                  <label>Tipo</label>
                  <select 
                    disabled={!!editingAccount}
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option>ACTIVO</option>
                    <option>PASIVO</option>
                    <option>CAPITAL</option>
                    <option>INGRESO</option>
                    <option>GASTO</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Naturaleza</label>
                  <select 
                    disabled={!!editingAccount}
                    value={formData.nature} 
                    onChange={e => setFormData({...formData, nature: e.target.value})}
                  >
                    <option>DEUDORA</option>
                    <option>ACREEDORA</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label style={{ color: 'var(--info)' }}>Código Agrupador SAT</label>
                  <input 
                    value={formData.satCode} 
                    onChange={e => setFormData({...formData, satCode: e.target.value})} 
                    placeholder="Ej: 101.01 (Consulta el catálogo del SAT)" 
                  />
                  <p style={{ fontSize: 10, marginTop: 4, color: 'var(--text-muted)' }}>
                    Este código es obligatorio para la Contabilidad Electrónica.
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingAccount ? 'Actualizar' : 'Guardar Cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

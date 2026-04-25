'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, BookOpen, ListTree, Users, Building2,
  FileText, ShoppingCart, Landmark, Package, UserCheck,
  Briefcase, BarChart3, Settings, LogOut, FileCode,
  Download, DollarSign, ChevronDown, CheckCircle,
  ShieldCheck, FileLock2, Play, Database, Box, Link2, Receipt, Calculator, DownloadCloud,
  Target, Fingerprint, CreditCard, HardHat, Wallet, RefreshCw, Lock, ChevronsRight,
  UserMinus, Gift, TrendingUp, XCircle, FileMinus, Percent, Truck, Inbox,
  ShoppingBag, Clock, Waves, Globe,
  MapPin, Tag, Barcode, FileDown, Upload, UserSquare, KeyRound, FilePlus2, Repeat2,
} from 'lucide-react';
import FloatingJavier from '../components/FloatingJavier';
import './globals.css';
import { apiFetch } from '@/lib/api';
import { useSubscription } from '@/lib/useSubscription';
import { PlanFeatures, PLAN_LABELS } from '@/lib/subscription';
import Image from 'next/image';

type NavItem = { href: string; icon: any; label: string; feature?: keyof Omit<PlanFeatures, 'maxCompanies'> };
type NavSection = { title: string; items: NavItem[] };

const navSections: NavSection[] = [
  { title: 'Inteligencia Artificial', items: [{ href: '/ia', icon: Database, label: 'Javier IA', feature: 'ai' }] },
  { title: 'Principal', items: [{ href: '/', icon: LayoutDashboard, label: 'Dashboard' }] },
  { title: 'Contabilidad', items: [
    { href: '/contabilidad', icon: BookOpen, label: 'Pólizas', feature: 'accounting' },
    { href: '/contabilizador', icon: Play, label: 'Contabilizador Inteligente', feature: 'accounting' },
    { href: '/cuentas', icon: ListTree, label: 'Plan de Cuentas', feature: 'chartOfAccounts' },
  ]},
  { title: 'Centro de Reportes', items: [
    { href: '/reportes', icon: FileText, label: 'Estados Financieros', feature: 'accounting' },
    { href: '/reportes/isr-provisional', icon: Calculator, label: 'ISR Provisional', feature: 'taxCalc' },
    { href: '/reportes/declaracion-anual', icon: BarChart3, label: 'Declaración Anual ISR', feature: 'taxCalc' },
    { href: '/reportes/declaracion-iva', icon: BarChart3, label: 'Declaración IVA', feature: 'taxCalc' },
    { href: '/reportes/antiguedad-saldos', icon: Clock, label: 'Antigüedad de Saldos', feature: 'accounting' },
    { href: '/reportes/flujo-efectivo', icon: Waves, label: 'Flujo de Efectivo', feature: 'accounting' },
    { href: '/auditoria', icon: ShieldCheck, label: 'Auditoría 360°', feature: 'audit' },
  ]},
  { title: 'Control Gerencial', items: [
    { href: '/presupuestos', icon: Target, label: 'Presupuestos', feature: 'budgets' },
    { href: '/segmentos', icon: Box, label: 'C. de Costos', feature: 'segments' },
    { href: '/sucursales', icon: MapPin, label: 'Sucursales', feature: 'segments' },
    { href: '/importar', icon: Upload, label: 'Importación Masiva' },
    { href: '/bitacora', icon: Fingerprint, label: 'Bitácora Forense', feature: 'audit' },
  ]},
  { title: 'Ventas', items: [
    { href: '/clientes', icon: Users, label: 'Clientes (CxC)', feature: 'clients' },
    { href: '/cotizaciones', icon: FileText, label: 'Cotizaciones / Pedidos', feature: 'invoicing' },
    { href: '/ventas/listas-precios', icon: Tag, label: 'Listas de Precios', feature: 'invoicing' },
    { href: '/ventas/vendedores', icon: UserSquare, label: 'Vendedores / Comisiones', feature: 'invoicing' },
    { href: '/facturacion', icon: FileText, label: 'Facturación CFDI', feature: 'invoicing' },
    { href: '/facturacion/nota-credito', icon: FileMinus, label: 'Notas de Crédito', feature: 'invoicing' },
    { href: '/facturacion/nota-debito', icon: FilePlus2, label: 'Notas de Débito', feature: 'invoicing' },
    { href: '/facturacion/anticipos', icon: CreditCard, label: 'Anticipos CFDI', feature: 'invoicing' },
    { href: '/facturacion/cancelacion', icon: XCircle, label: 'Cancelación CFDI', feature: 'invoicing' },
    { href: '/facturacion/carta-porte', icon: Truck, label: 'Carta Porte CP 3.1', feature: 'invoicing' },
    { href: '/facturacion/comercio-exterior', icon: Globe, label: 'Comercio Exterior', feature: 'invoicing' },
    { href: '/facturacion/retenciones', icon: Percent, label: 'Retenciones CFDI', feature: 'invoicing' },
    { href: '/pagos', icon: CreditCard, label: 'Complemento de Pagos', feature: 'payments' },
    { href: '/pos', icon: ShoppingBag, label: 'Punto de Venta (POS)', feature: 'invoicing' },
    { href: '/pos/factura-global', icon: Repeat2, label: 'CFDI Global POS', feature: 'invoicing' },
  ]},
  { title: 'Compras e Inventarios', items: [
    { href: '/proveedores', icon: Building2, label: 'Proveedores', feature: 'suppliers' },
    { href: '/compras', icon: ShoppingCart, label: 'Facturas Recibidas', feature: 'bills' },
    { href: '/compras/ordenes', icon: Receipt, label: 'Órdenes de Compra', feature: 'bills' },
    { href: '/inventarios', icon: Package, label: 'Inventarios (Kardex)', feature: 'inventory' },
    { href: '/inventarios/almacenes', icon: MapPin, label: 'Almacenes Múltiples', feature: 'inventory' },
    { href: '/inventarios/series-lotes', icon: Barcode, label: 'Series y Lotes', feature: 'inventory' },
  ]},
  { title: 'Tesorería', items: [
    { href: '/bancos', icon: Landmark, label: 'Bancos', feature: 'banks' },
    { href: '/bancos/cheques', icon: FileDown, label: 'Cheques', feature: 'banks' },
    { href: '/tesoreria', icon: Wallet, label: 'Flujo de Tesorería', feature: 'treasury' },
    { href: '/conciliacion', icon: Link2, label: 'Conciliación Bancaria', feature: 'reconciliation' },
  ]},
  { title: 'Nómina', items: [
    { href: '/nomina', icon: UserCheck, label: 'Nómina', feature: 'payroll' },
    { href: '/nomina/empleados', icon: Users, label: 'Empleados', feature: 'payroll' },
    { href: '/nomina/periodos', icon: Receipt, label: 'Periodos / Recibos', feature: 'payroll' },
    { href: '/nomina/aguinaldo', icon: Gift, label: 'Aguinaldo', feature: 'payroll' },
    { href: '/nomina/ptu', icon: TrendingUp, label: 'PTU', feature: 'payroll' },
    { href: '/nomina/liquidaciones', icon: UserMinus, label: 'Liquidaciones / Finiquitos', feature: 'payroll' },
    { href: '/nomina/sua', icon: Download, label: 'SUA / SIPARE (IMSS)', feature: 'payroll' },
    { href: '/nomina/retenciones', icon: Percent, label: 'Constancias de Retenciones', feature: 'payroll' },
  ]},
  { title: 'Activos Fijos', items: [
    { href: '/activos', icon: Briefcase, label: 'Activos Fijos', feature: 'assets' },
    { href: '/activos/depreciacion', icon: TrendingUp, label: 'Depreciación', feature: 'assets' },
  ]},
  { title: 'SAT / Fiscal', items: [
    { href: '/sat', icon: ShieldCheck, label: 'Portal Fiscal SAT' },
    { href: '/sat/buzon', icon: Inbox, label: 'Buzón Tributario', feature: 'satXml' },
    { href: '/impuestos', icon: Calculator, label: 'Cálculo de Impuestos', feature: 'taxCalc' },
    { href: '/sat-sync', icon: DownloadCloud, label: 'Descarga Masiva SAT', feature: 'satSync' },
    { href: '/xml-sat', icon: FileCode, label: 'Gestor XML SAT', feature: 'satXml' },
    { href: '/sat-exports', icon: Download, label: 'Contabilidad Electrónica', feature: 'electronicAccounting' },
    { href: '/fiscal/iva', icon: BarChart3, label: 'Control de IVA', feature: 'taxCalc' },
    { href: '/fiscal/diot', icon: FileText, label: 'Reporte DIOT', feature: 'diot' },
    { href: '/monedas', icon: DollarSign, label: 'Multimoneda', feature: 'multiCurrency' },
    { href: '/configuracion', icon: Settings, label: 'PAC / Timbrado & Certificados' },
    { href: '/configuracion/fiel', icon: FileCode, label: 'FIEL / Descarga SAT' },
    { href: '/configuracion/permisos', icon: KeyRound, label: 'Permisos por Módulo' },
  ]},
  { title: 'Auditoría & Cierre', items: [
    { href: '/auditoria', icon: ShieldCheck, label: 'Auditoría SAT (360°)', feature: 'audit' },
    { href: '/fiscal/cierre', icon: FileLock2, label: 'Cierre del Ejercicio', feature: 'fiscalClose' },
  ]},
  { title: 'Análisis', items: [{ href: '/reportes', icon: BarChart3, label: 'Reportes', feature: 'accounting' }] },
];

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/select-company'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [tcUsd, setTcUsd] = useState<number | null>(null);
  const [companyInfo, setCompanyInfo] = useState<{ name: string; logo: string | null } | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [showCompanySwitcher, setShowCompanySwitcher] = useState(false);
  const { status: subscription } = useSubscription();
  const features = subscription.features;
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const res = await apiFetch('/api/auth/my-companies');
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      setCompanies(data);
      const savedId = localStorage.getItem('companyId');
      const active = savedId ? data.find((c: any) => c.id === savedId) : data[0];
      if (active) {
        setSelectedCompany(active);
        if (!savedId) localStorage.setItem('companyId', active.id);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const syncCurrency = async () => {
    try {
      const res = await apiFetch('/api/currency/sync');
      if (res.ok) {
        const data = await res.json();
        setTcUsd(data.rate);
      }
    } catch (err) {
      console.error('Error syncing currency:', err);
    }
  };

  useEffect(() => {
    if (isPublic) return;
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('jnconta_token');
    if (!token) { router.replace('/login'); return; }

    try {
      const userData = JSON.parse(localStorage.getItem('jnconta_user') || '{}');
      setUser(userData);

      const cid = localStorage.getItem('companyId');
      if (cid) {
        apiFetch(`/api/companies/${cid}`)
          .then(r => r.json())
          .then(data => setCompanyInfo({ name: data.name, logo: data.logo }))
          .catch(() => setCompanyInfo({ name: 'Empresa Seleccionada', logo: null }));
      }
    } catch { router.replace('/login'); }

    apiFetch('/api/currency/usd')
      .then(r => r.json())
      .then(d => setTcUsd(d.rate))
      .catch(() => setTcUsd(17.15));
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem('jnconta_token');
    localStorage.removeItem('jnconta_user');
    localStorage.removeItem('companyId');
    router.replace('/login');
  }

  if (isPublic) {
    return (
      <html lang="es">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>JnConta — Iniciar Sesión</title>
        </head>
        <body style={{ margin: 0 }}>{children}</body>
      </html>
    );
  }

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>JnConta — Sistema Contable Integral</title>
        <meta name="description" content="Sistema contable completo: pólizas, facturación CFDI, nómina real, bancos, inventarios y reportes." />
        <style>{`
          .glass-top { background: rgba(16, 24, 39, 0.6); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        `}</style>
      </head>
      <body>
        <div className="layout-root">
          {/* SIDEBAR */}
          <aside className="sidebar overflow-y-auto">
            <div className="sidebar-header border-b border-white/5 mb-6 pb-6 px-4">
                {/* LOGO JNCONTA (SIEMPRE VISIBLE) */}
                <div className="flex items-center gap-3 w-full pb-3 border-b border-white/5 mb-4 hover:opacity-90 transition-opacity cursor-pointer">
                  <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 shadow-inner">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 16L9 11L13 14L18 7" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="6" cy="16" r="1.5" fill="#22d3ee" />
                      <circle cx="9" cy="11" r="1.5" fill="#22d3ee" />
                      <circle cx="13" cy="14" r="1.5" fill="#22d3ee" />
                      <circle cx="18" cy="7" r="2" fill="#46dfdf" className="animate-pulse" />
                      <path d="M15 7H18V10" stroke="#46dfdf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span style={{ color: '#0ea5e9', fontWeight: 900, fontSize: '24px', letterSpacing: '-0.05em', lineHeight: '1' }}>
                      JN<span style={{ color: '#22d3ee' }}>Conta</span>
                    </span>
                    <span style={{ fontSize: '9px', color: '#06b6d4', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', marginTop: '2px' }}>
                      Ultra Elite
                    </span>
                  </div>
                </div>

                {/* LOGO DE CLIENTE / EMPRESA (SI EXISTE) */}
                {companyInfo?.logo && (
                  <div className="w-10 h-10 mb-3 rounded-lg overflow-hidden border border-white/10 bg-white/5 p-1 shadow-inner">
                    <img src={companyInfo.logo} alt="Client Logo" className="w-full h-full object-contain" />
                  </div>
                )}
               <div className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
                  <span className="text-[10px] text-primary-400 font-bold uppercase tracking-tighter">Entidad Activa</span>
                  <span className="text-xs font-bold text-white truncate max-w-[180px]">{companyInfo?.name || 'Cargando...'}</span>
               </div>
               {companies.length > 1 && (
                 <button
                   onClick={() => router.push('/select-company')}
                   title="Cambiar empresa"
                   style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', flexShrink: 0 }}
                 >
                   <ChevronsRight size={16} style={{ color: '#06b6d4' }} />
                 </button>
               )}
            </div>

            {tcUsd && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, margin: '0 16px 20px',
                padding: '10px 14px', background: 'rgba(56,189,248,0.05)',
                borderRadius: 12, border: '1px solid rgba(56,189,248,0.1)'
              }}>
                <DollarSign size={13} style={{ color: 'var(--teal-400)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>USD/MXN</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal-300)', marginLeft: 'auto' }}>${tcUsd.toFixed(2)}</span>
              </div>
            )}

            {navSections.map(section => (
              <div key={section.title} className="sidebar-section">
                <p className="sidebar-section-title">{section.title}</p>
                {section.items.map(item => {
                  const isActive = pathname === item.href;
                  const locked = item.feature && features[item.feature] === false;
                  if (locked) {
                    return (
                      <div key={item.href} className="nav-link" style={{ opacity: 0.45, cursor: 'not-allowed' }} title="Requiere plan superior">
                        <item.icon size={16} />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        <Lock size={11} style={{ color: '#f59e0b', flexShrink: 0 }} />
                      </div>
                    );
                  }
                  return (
                    <Link key={item.href} href={item.href} className={`nav-link ${isActive ? 'active' : ''}`}>
                      <item.icon size={16} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}

            <div className="sidebar-bottom">
              <Link href="/configuracion/empresa" className={`nav-link ${pathname === '/configuracion/empresa' ? 'active' : ''}`}>
                <Building2 size={16} />
                <span>Perfil Empresa</span>
              </Link>
              <Link href="/configuracion" className={`nav-link ${pathname === '/configuracion' ? 'active' : ''}`}>
                <Settings size={16} />
                <span>Configuración</span>
              </Link>
              <button className="nav-link" style={{ marginTop: 4 }} onClick={handleLogout}>
                <LogOut size={16} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </aside>

          {/* MAIN */}
          <div className="main-wrapper">
            {/* TOP BAR / SWITCHER */}
            <nav className="glass-top flex items-center justify-between px-8 py-3 z-50 sticky top-0">
               <div className="flex items-center gap-6">
                  <Link href="/empresas" className="flex items-center gap-2 group">
                     <div className="p-2 bg-white/5 rounded-lg group-hover:bg-primary-500/20 transition-colors border border-white/5">
                        <Briefcase size={16} className="text-muted group-hover:text-primary-400" />
                     </div>
                     <span className="text-xs font-bold text-muted group-hover:text-white transition-colors">Panel del Despacho</span>
                  </Link>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                     <span className="text-[10px] text-muted font-bold tracking-widest uppercase">Servidor v5.0 Activo</span>
                  </div>
                  <div className="h-4 w-px bg-white/10" />
                  
                  {/* ELITE CURRENCY SYNC WIDGET */}
                  <div className="flex items-center gap-3 bg-white/5 px-4 py-1.5 rounded-xl border border-white/5 hover:border-primary-500/20 transition-all group">
                     <div className="flex flex-col">
                        <span className="text-[9px] text-muted font-black uppercase tracking-tighter">DOF / BANXICO</span>
                        <span className="text-xs font-black text-white group-hover:text-primary-400 transition-colors">USD ${tcUsd?.toFixed(4) || '17.1500'}</span>
                     </div>
                     <button 
                       onClick={syncCurrency}
                       className="p-1.5 bg-primary-500/10 rounded-lg text-primary-400 hover:bg-primary-500/20 active:scale-95 transition-all"
                       title="Sincronizar Tipo de Cambio Oficial"
                     >
                        <RefreshCw size={12} className={tcUsd ? '' : 'animate-spin'} />
                     </button>
                  </div>
               </div>

               <div className="flex items-center gap-3">
                  {/* Plan badge */}
                  <div style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 900,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    background: subscription.status === 'ACTIVE' ? 'rgba(6,182,212,0.15)' : 'rgba(245,158,11,0.15)',
                    border: subscription.status === 'ACTIVE' ? '1px solid rgba(6,182,212,0.3)' : '1px solid rgba(245,158,11,0.3)',
                    color: subscription.status === 'ACTIVE' ? '#22d3ee' : '#f59e0b',
                  }}>
                    {subscription.planName}
                    {subscription.status === 'TRIAL' && ' · Trial'}
                  </div>

                  {/* Company switcher */}
                  {companies.length > 1 && (
                    <button
                      onClick={() => router.push('/select-company')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 12px', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
                        cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as any).style.borderColor = 'rgba(6,182,212,0.4)'; (e.currentTarget as any).style.color = '#22d3ee'; }}
                      onMouseLeave={e => { (e.currentTarget as any).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as any).style.color = 'var(--text-muted)'; }}
                      title="Cambiar empresa"
                    >
                      <Building2 size={13} />
                      <span>{companyInfo?.name || 'Empresa'}</span>
                      <ChevronsRight size={13} />
                    </button>
                  )}

                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex flex-col items-end">
                     <span className="text-[10px] text-muted font-bold uppercase">{user?.role || 'usuario'}</span>
                     <span className="text-xs font-bold text-white">{user?.name || 'Administrador'}</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary-600/30 border border-primary-500/50 flex items-center justify-center font-bold text-primary-300">
                     {user?.name?.[0] || 'A'}
                  </div>
               </div>
            </nav>

            {children}
            <FloatingJavier />
          </div>
        </div>
      </body>
    </html>
  );
}

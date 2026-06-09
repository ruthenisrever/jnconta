'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Receipt, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight,
  Zap,
  BarChart3,
  Calendar,
  Layers,
  ChevronRight,
  TrendingDown as TrendingDownIcon,
  HelpCircle
} from 'lucide-react';
import CashFlowChart from '@/components/CashFlowChart';

interface DashboardData {
  historical: { month: string; income: number; expenses: number; profit: number }[];
  fiscal: {
    ivaNeto: number;
    bankLiquidity: number;
    pendingCxc: number;
  };
}

// --- Custom Premium SVG Line Chart ---
const PremiumLineChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 italic text-sm">
        No hay datos suficientes para generar la gráfica
      </div>
    );
  }
  
  const allValues = data.flatMap(d => [d.income, d.expenses]);
  const maxValRaw = Math.max(...allValues);
  const maxVal = maxValRaw === 0 ? 1000 : maxValRaw * 1.2;
  
  const width = 800;
  const height = 300;
  const padding = 40;

  const getX = (i: number) => (i * (width - padding * 2)) / Math.max(1, data.length - 1) + padding;
  const getY = (val: number) => height - (val / maxVal) * (height - padding * 2) - padding;

  const incomePoints = data.map((d, i) => `${getX(i)},${getY(d.income)}`).join(' ');
  const expensePoints = data.map((d, i) => `${getX(i)},${getY(d.expenses)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="gradIncome" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 0.3 }} />
          <stop offset="100%" style={{ stopColor: '#3B82F6', stopOpacity: 0 }} />
        </linearGradient>
        <linearGradient id="gradExpense" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#EF4444', stopOpacity: 0.2 }} />
          <stop offset="100%" style={{ stopColor: '#EF4444', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      
      {/* Grid Lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
        <line key={i} x1={padding} y1={getY(maxVal * p)} x2={width - padding} y2={getY(maxVal * p)} stroke="white" strokeOpacity="0.03" strokeDasharray="4" />
      ))}

      {/* Areas */}
      <polyline points={`${padding},${height-padding} ${incomePoints} ${width-padding},${height-padding}`} fill="url(#gradIncome)" />
      <polyline points={`${padding},${height-padding} ${expensePoints} ${width-padding},${height-padding}`} fill="url(#gradExpense)" />

      {/* Lines */}
      <polyline points={incomePoints} fill="none" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={expensePoints} fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 4" opacity="0.6" />

      {/* Data Points */}
      {data.map((d, i) => (
        <g key={i} className="group cursor-pointer">
          <circle cx={getX(i)} cy={getY(d.income)} r="6" fill="#3B82F6" className="transform transition-all group-hover:r-8" />
          <text x={getX(i)} y={height - 10} textAnchor="middle" fill="#64748B" fontSize="10" fontWeight="bold" className="uppercase tracking-widest">{d.month}</text>
        </g>
      ))}
    </svg>
  );
};

import LandingPage from '@/components/LandingPage';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [cashFlowData, setCashFlowData] = useState<{ initialCash: number, projection: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const cid = typeof window !== 'undefined' ? localStorage.getItem('companyId') : null;
    const token = typeof window !== 'undefined' ? localStorage.getItem('jnconta_token') : null;
    if (cid && cid !== 'undefined' && cid !== '') {
      setIsAuthenticated(true);
      fetchDashboard(cid);
    } else if (token) {
      window.location.href = '/select-company';
    } else {
      setLoading(false);
    }
  }, []);

  const fetchDashboard = async (cid: string) => {
    try {
      const [statsRes, cashFlowRes] = await Promise.all([
        apiFetch(`/api/reports/dashboard-stats?companyId=${cid}`),
        apiFetch(`/api/dashboard/cash-flow?companyId=${cid}`)
      ]);
      
      if (statsRes.ok) setData(await statsRes.json());
      if (cashFlowRes.ok) setCashFlowData(await cashFlowRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-white animate-pulse font-black tracking-widest bg-[#070B14] min-h-screen">CARGANDO INTELIGENCIA...</div>;

  if (!isAuthenticated) return <LandingPage />;

  return (
    <div className="min-h-screen bg-[#070B14] text-white p-8 overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-12 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
               <div className="px-2 py-0.5 bg-blue-500/20 rounded border border-blue-500/30 text-[10px] font-black text-blue-400 uppercase tracking-widest">Enterprise Elite</div>
               <div className="w-1 h-1 rounded-full bg-gray-600" />
               <span className="text-gray-500 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
               </span>
            </div>
            <h1 className="text-6xl font-black tracking-tighter italic">
              PANEL <span className="text-blue-500">EJECUTIVO</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 backdrop-blur-xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                   <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                   <div className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">Estado Fiscal</div>
                   <div className="text-xs font-bold text-green-400 uppercase">Sin Contingencias</div>
                </div>
             </div>
          </div>
        </header>

        {/* Top Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
                { label: 'Liquidez en Bancos', value: data?.fiscal.bankLiquidity || 0, icon: Wallet, color: 'blue' },
                { label: 'Cuentas por Cobrar', value: data?.fiscal.pendingCxc || 0, icon: ArrowUpRight, color: 'indigo' },
                { label: 'IVA Neto Mes', value: data?.fiscal.ivaNeto || 0, icon: Receipt, color: data?.fiscal.ivaNeto! > 0 ? 'orange' : 'green' },
                { label: 'Utilidad Retenida', value: data?.historical?.[data.historical.length-1]?.profit || 0, icon: Zap, color: 'purple' }
            ].map((m, i) => (
                <div key={i} className="kpi-card group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-current opacity-[0.02] rounded-full group-hover:scale-150 transition-transform" />
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-2 bg-${m.color}-500/10 rounded-xl`}>
                            <m.icon className={`w-5 h-5 text-${m.color}-400`} />
                        </div>
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{m.label}</div>
                    <div className="text-2xl font-black">${m.value.toLocaleString()}</div>
                </div>
            ))}
        </div>

        {/* Cash Flow Projection Section */}
        <div className="panel p-8 relative mb-8">
           <div className="flex items-center justify-between mb-2">
              <div>
                 <h3 className="text-xl font-bold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-400" />
                    Proyección de Flujo de Efectivo
                 </h3>
                 <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mt-1">Próximas 4 Semanas (Basado en Vencimientos de Facturas)</p>
              </div>
              <div className="text-right">
                 <div className="text-[10px] text-gray-500 font-black uppercase">Saldo Inicial</div>
                 <div className="text-xl font-black text-indigo-300">${cashFlowData?.initialCash.toLocaleString() || 0}</div>
              </div>
           </div>
           
           {cashFlowData ? (
             <CashFlowChart data={cashFlowData.projection} initialCash={cashFlowData.initialCash} />
           ) : (
             <div className="h-[300px] flex items-center justify-center text-gray-700 italic text-sm">Calculando proyecciones financieras...</div>
           )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
           {/* Main Chart Area */}
           <div className="lg:col-span-2 panel p-8 relative">
              <div className="flex items-center justify-between mb-8">
                 <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                       <BarChart3 className="w-5 h-5 text-blue-400" />
                       Comportamiento Financiero
                    </h3>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mt-1">Últimos 6 Meses (Ingresos vs Gastos)</p>
                 </div>
                 <div className="flex items-center gap-4 text-[10px] font-black uppercase">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded bg-blue-500" /> Ingresos
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded bg-red-500/40 border border-red-500/40" /> Gastos
                    </div>
                 </div>
              </div>
              <div className="h-[300px] w-full">
                 <PremiumLineChart data={data?.historical || []} />
              </div>
           </div>

           {/* Sidebar Stats */}
           <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/20 rounded-[35px] p-8 backdrop-blur-xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                    <Zap className="w-16 h-16 text-white" />
                 </div>
                 <h3 className="text-lg font-black italic mb-2 tracking-tighter">INTELIGENCIA FISCAL</h3>
                 <p className="text-blue-100/60 text-xs font-medium mb-6 leading-relaxed">Detección de riesgos SAT y optimización de flujos de efectivo en tiempo real.</p>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-bold text-blue-200/50 uppercase tracking-widest">IVAs Pendientes</span>
                       <span className="text-lg font-black text-white">${Math.abs(data?.fiscal.ivaNeto || 0).toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 rounded-full w-[65%]" />
                    </div>
                    <button className="w-full mt-4 py-3 bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-400 transition-colors">
                       Ver Auditoría SAT
                    </button>
                 </div>
              </div>

              <div className="panel p-8">
                 <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Atajos Elite</h4>
                 <div className="space-y-2">
                    {[
                      { label: 'Contabilizador XML', href: '/contabilizador' },
                      { label: 'Conciliación Bancaria', href: '/conciliacion' },
                      { label: 'Gestión de Nómina', href: '/nomina' },
                      { label: 'Bitácora Forense', href: '/bitacora' }
                    ].map((link, i) => (
                      <a key={i} href={link.href} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 group border border-transparent hover:border-white/5 transition-all">
                        <span className="text-sm font-bold text-gray-300 group-hover:text-white">{link.label}</span>
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                      </a>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

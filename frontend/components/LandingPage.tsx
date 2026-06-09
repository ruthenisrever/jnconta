'use client';

import React from 'react';
import { 
  Zap, ShieldCheck, BarChart3, Globe, 
  MessageSquare, Users, CheckCircle2, 
  ArrowRight, ShieldAlert, Cpu
} from 'lucide-react';

export default function LandingPage() {
  const plans = [
    {
      name: 'Lite',
      price: '139',
      description: 'Ideal para personas físicas y startups.',
      folios: '15 folios',
      tokens: '50k Tokens IA',
      features: ['Facturación CFDI 4.0', 'Clientes y Productos', 'Soporte vía Ticket'],
      accent: 'blue'
    },
    {
      name: 'Pro',
      price: '295',
      description: 'Gestión profesional para PYMEs.',
      folios: '60 folios',
      tokens: '250k Tokens IA',
      features: ['Contabilidad Core', 'Bancos y Conciliación', 'IA: Javy Básico', '3 RFCs incluidos'],
      highlight: true,
      accent: 'indigo'
    },
    {
      name: 'Business',
      price: '450',
      description: 'Potencia total para tu empresa.',
      folios: '200 folios',
      tokens: '1M Tokens IA',
      features: ['Nómina Completa', 'Gestión de Inventarios', 'Auditoría SAT', '10 RFCs incluidos'],
      accent: 'purple'
    },
    {
      name: 'Despacho',
      price: '1,599',
      description: 'La estación de trabajo del contador.',
      folios: '800 folios',
      tokens: '5M Tokens IA',
      features: ['50 RFCs incluidos', 'Auditoría Forense (EFOs)', 'Javy IA Pro', 'Soporte Prioritario'],
      accent: 'emerald'
    }
  ];


  const handleCheckout = (planId: string) => {
    // Redirect to register with plan pre-selected; after signup, API creates the subscription
    window.location.href = `/register?plan=${planId.toLowerCase()}`;
  };

  return (
    <div className="bg-[#030712] text-white min-h-screen font-sans selection:bg-primary-500/30">
      {/* Navbar Minimalista */}
      <nav className="fixed top-0 w-full z-50 bg-[#030712]/80 backdrop-blur-md border-b border-white/5 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter italic">JnConta<span className="text-blue-500">.com</span></span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#precios" className="text-sm font-bold text-gray-400 hover:text-white transition-colors">Planes</a>
          <button onClick={() => window.location.href='/login'} className="btn btn-ghost text-sm px-6">Entrar</button>
          <button onClick={() => window.location.href='/register'} className="btn btn-primary text-sm px-6 py-2 rounded-full shadow-lg shadow-blue-500/20">Empezar Gratis</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-8 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-6">
            <Cpu className="w-3 h-3" /> Potenciado por Javy IA
          </div>
          <h1 className="text-7xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
            CONTABILIDAD <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">INTELIGENTE</span>
          </h1>
          <p className="max-w-2xl mx-auto text-gray-400 text-lg md:text-xl font-medium mb-12 leading-relaxed">
            La plataforma definitiva para contadores y empresarios que buscan dominar el ecosistema fiscal de México con inteligencia artificial y auditoría forense.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <button onClick={() => window.location.href='/register'} className="w-full md:w-auto px-10 py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-blue-400 hover:scale-105 transition-all shadow-xl shadow-white/5">
              Prueba Gratis 14 Días
            </button>
            <button onClick={() => window.location.href='/login'} className="w-full md:w-auto px-10 py-4 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all backdrop-blur-xl">
              Iniciar Sesión
            </button>
          </div>
        </div>

        {/* Mockup Dashboard */}
        <div className="max-w-5xl mx-auto mt-20 relative px-4">
           <div className="bg-white/[0.03] border border-white/10 rounded-t-[40px] p-4 backdrop-blur-3xl shadow-2xl relative">
              <div className="flex gap-1.5 mb-4">
                 <div className="w-3 h-3 rounded-full bg-red-500/50" />
                 <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                 <div className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
              <div className="aspect-video bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center overflow-hidden">
                 <img src="https://images.unsplash.com/photo-1551288049-bb848a55a130?q=80&w=2071&auto=format&fit=crop" alt="JnConta Dashboard" className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-700" />
              </div>
           </div>
           <div className="absolute -bottom-10 left-0 w-full h-40 bg-gradient-to-t from-[#030712] to-transparent z-20" />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precios" className="py-24 px-8 relative">
        <div className="max-w-7xl mx-auto">
          <header className="text-center mb-16">
            <h2 className="text-4xl font-black tracking-tight mb-4">Planes diseñados para crecer</h2>
            <p className="text-gray-500 text">Escoge el nivel que mejor se adapte a tu volumen de operación.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, i) => (
              <div key={i} className={`group relative p-8 rounded-[35px] border transition-all duration-500 backdrop-blur-2xl flex flex-col ${
                plan.highlight 
                ? 'bg-blue-600/5 border-blue-500/30 scale-105 shadow-[0_0_40px_rgba(59,130,246,0.1)]' 
                : 'bg-white/[0.02] border-white/5 hover:border-white/20'
              }`}>
                {plan.highlight && (
                  <div className="absolute top-0 right-8 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
                    Recomendado
                  </div>
                )}
                
                <h3 className="text-2xl font-black italic mb-1 uppercase tracking-tighter">{plan.name}</h3>
                <p className="text-xs text-gray-500 font-medium mb-6 leading-relaxed">{plan.description}</p>
                
                <div className="mb-8">
                  <span className="text-5xl font-black tracking-tighter">${plan.price}</span>
                  <span className="text-gray-500 text-sm font-bold ml-1">/ mes</span>
                </div>

                <div className="space-y-4 mb-10 flex-1">
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <CheckCircle2 size={16} className="text-blue-500" />
                    <span>{plan.folios} <span className="text-gray-500 text-[10px] font-normal uppercase tracking-widest ml-1">Inlcuidos</span></span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <ShieldCheck size={16} className="text-indigo-500" />
                    <span>{plan.tokens} <span className="text-gray-500 text-[10px] font-normal uppercase tracking-widest ml-1">Capacidad IA</span></span>
                  </div>
                  <div className="pt-4 border-t border-white/5 space-y-3">
                    {plan.features.map((feature, j) => (
                      <div key={j} className="flex items-start gap-3 text-[11px] text-gray-400 font-medium">
                        <div className="mt-1 w-1 h-1 rounded-full bg-gray-700 group-hover:bg-blue-500 transition-colors" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => handleCheckout(plan.name)}
                  className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
                  plan.highlight
                  ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-500/20'
                  : 'bg-white/10 text-white hover:bg-white/20'
                }`}>
                  Elegir Plan {plan.name}
                </button>

              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
             <p className="text-xs text-gray-500 font-medium flex items-center justify-center gap-3">
                <ShieldAlert className="text-orange-500" size={14} />
                Folio excedente: $1.00 MXN ($0.80 en Plan Despacho). IVA no incluido.
             </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12 text-gray-400">
           <div className="max-w-xs">
              <div className="flex items-center gap-2 mb-6 text-white">
                <Zap className="w-5 h-5 text-blue-500" />
                <span className="text-xl font-black tracking-tighter italic">JnConta<span className="text-blue-500">.com</span></span>
              </div>
              <p className="text-xs leading-relaxed">Automatizando el futuro financiero de México con inteligencia artificial aplicada a la contabilidad real.</p>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
              <div>
                 <h4 className="text-white text-xs font-black uppercase tracking-widest mb-6">Plataforma</h4>
                 <ul className="text-xs space-y-4">
                    <li><a href="#" className="hover:text-white">Facturación</a></li>
                    <li><a href="#" className="hover:text-white">Nómina</a></li>
                    <li><a href="#" className="hover:text-white">Auditoría SAT</a></li>
                 </ul>
              </div>
              <div>
                 <h4 className="text-white text-xs font-black uppercase tracking-widest mb-6">Empresa</h4>
                 <ul className="text-xs space-y-4">
                    <li><a href="#" className="hover:text-white">Nosotros</a></li>
                    <li><a href="#" className="hover:text-white">Prensa</a></li>
                    <li><a href="#" className="hover:text-white">Contacto</a></li>
                 </ul>
              </div>
           </div>
        </div>
        <div className="max-w-6xl mx-auto mt-20 pt-10 border-t border-white/5 text-[10px] font-bold uppercase tracking-widest text-gray-600 flex justify-between">
           <span>© 2026 JnConta Elite S.A. de C.V.</span>
           <div className="flex gap-6">
              <a href="#">Privacidad</a>
              <a href="#">Términos</a>
           </div>
        </div>
      </footer>
    </div>
  );
}

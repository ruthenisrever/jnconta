'use client';

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, ReferenceLine, AreaChart, Area
} from 'recharts';

interface CashFlowData {
  label: string;
  inflow: number;
  outflow: number;
  net: number;
}

export default function CashFlowChart({ data, initialCash }: { data: CashFlowData[], initialCash: number }) {
  // Calcular saldo acumulado para la proyección
  let currentBalance = initialCash;
  const chartData = data.map(week => {
    currentBalance += week.net;
    return {
      ...week,
      balance: currentBalance
    };
  });

  return (
    <div className="w-full h-[300px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          <XAxis 
            dataKey="label" 
            stroke="#9ca3af" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#9ca3af" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `$${value/1000}k`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
            itemStyle={{ color: '#fff' }}
          />
          <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
          <Area 
            type="monotone" 
            dataKey="inflow" 
            stackId="1" 
            stroke="#4f46e5" 
            fillOpacity={1} 
            fill="url(#colorNet)" 
            name="Entradas Proyectadas"
          />
          <Area 
            type="monotone" 
            dataKey="outflow" 
            stackId="2" 
            stroke="#ef4444" 
            fillOpacity={0.2} 
            fill="#ef4444" 
            name="Salidas Proyectadas"
          />
          <Area 
            type="monotone" 
            dataKey="balance" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#colorBalance)" 
            name="Saldo Proyectado"
          />
          <ReferenceLine y={0} stroke="#6b7280" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

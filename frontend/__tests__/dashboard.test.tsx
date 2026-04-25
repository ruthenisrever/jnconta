/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import Dashboard from '../app/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => '/',
}));

jest.mock('../lib/api', () => ({
  apiFetch: jest.fn(),
}));

jest.mock('../components/CashFlowChart', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid="cashflow-chart">{data?.length} weeks</div>,
}));

import { apiFetch } from '../lib/api';
const mockApiFetch = apiFetch as jest.Mock;

const mockStatsData = {
  historical: [
    { month: 'ENE', income: 100000, expenses: 60000, profit: 40000 },
    { month: 'FEB', income: 120000, expenses: 70000, profit: 50000 },
  ],
  fiscal: {
    ivaNeto: 15000,
    bankLiquidity: 250000,
    pendingCxc: 80000,
  },
};

const mockCashFlowData = {
  initialCash: 250000,
  projection: [
    { week: 'Sem 1', inflows: 50000, outflows: 30000, balance: 270000 },
  ],
};

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: jest.fn().mockReturnValue('company-test-id') },
      writable: true,
    });
  });

  it('debe mostrar el spinner mientras carga', async () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {}));
    await act(async () => {
      render(<Dashboard />);
    });
    expect(screen.getByText(/CARGANDO INTELIGENCIA/i)).toBeInTheDocument();
  });

  it('no debe renderizar contenido sin companyId', async () => {
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: jest.fn().mockReturnValue(null) },
      writable: true,
    });
    mockApiFetch.mockImplementation(() => new Promise(() => {}));
    await act(async () => {
      render(<Dashboard />);
    });
    expect(screen.getByText(/CARGANDO INTELIGENCIA/i)).toBeInTheDocument();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('debe renderizar el panel ejecutivo con datos financieros', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockStatsData })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCashFlowData });

    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/PANEL/i)).toBeInTheDocument();
      expect(screen.getByText(/EJECUTIVO/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar la liquidez en bancos', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockStatsData })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCashFlowData });

    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Liquidez en Bancos')).toBeInTheDocument();
    });
  });

  it('debe mostrar el gráfico de flujo de caja', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockStatsData })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCashFlowData });

    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-chart')).toBeInTheDocument();
    });
  });

  it('debe llamar a /api/reports/dashboard-stats con companyId', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockStatsData })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCashFlowData });

    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/reports/dashboard-stats')
      );
    });
  });

  it('debe llamar a /api/dashboard/cash-flow con companyId', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockStatsData })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCashFlowData });

    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/dashboard/cash-flow')
      );
    });
  });

  it('debe renderizar aun si la API falla', async () => {
    mockApiFetch.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/PANEL/i)).toBeInTheDocument();
    });
  });
});

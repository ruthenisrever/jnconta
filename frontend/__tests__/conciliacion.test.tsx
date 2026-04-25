/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import ConciliacionPage from '../app/bancos/conciliacion/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => '/bancos/conciliacion',
}));

jest.mock('../lib/api', () => ({ apiFetch: jest.fn() }));

import { apiFetch } from '../lib/api';
const mockApiFetch = apiFetch as jest.Mock;

const mockBanks = [
  { id: 'bank-1', name: 'BBVA Bancomer', accountNumber: '0123456789', accountId: 'acc-bank-1' },
  { id: 'bank-2', name: 'Santander',     accountNumber: '9876543210', accountId: 'acc-bank-2' },
];

const mockMatches = [
  {
    transaction: { id: 'trx-1', date: '2024-04-10T00:00:00Z', concept: 'DEPOSITO CLIENTE ABC', amount: 25000 },
    potentialMatches: [
      { journal: { id: 'jrn-1', number: 'ING-0042', concept: 'Pago factura A-123' }, debit: 25000, credit: 0 },
    ],
  },
  {
    transaction: { id: 'trx-2', date: '2024-04-11T00:00:00Z', concept: 'COMISION BANCARIA', amount: -350 },
    potentialMatches: [],
  },
];

const mockLedgerEntries = [
  { debit: 10000, credit: 0, journal: { id: 'jrn-2', number: 'ING-0043', concept: 'Cobro factura B-99', date: '2024-04-09T00:00:00Z' } },
];

const localStorageMock = (() => {
  let store: Record<string, string> = { companyId: 'company-test-1' };
  return { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('ConciliacionPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockBanks })         // /api/banks
      .mockResolvedValueOnce({ ok: true, json: async () => mockMatches })        // auto-match
      .mockResolvedValueOnce({ ok: true, json: async () => mockLedgerEntries }); // entries-to-reconcile
  });

  it('debe renderizar el título de conciliación', async () => {
    await act(async () => { render(<ConciliacionPage />); });
    await waitFor(() => {
      expect(screen.getByText(/Conciliación Bancaria/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar las cuentas bancarias en el selector', async () => {
    await act(async () => { render(<ConciliacionPage />); });
    await waitFor(() => {
      expect(screen.getByText(/BBVA Bancomer/)).toBeInTheDocument();
    });
  });

  it('debe mostrar los movimientos bancarios pendientes', async () => {
    await act(async () => { render(<ConciliacionPage />); });
    await waitFor(() => {
      expect(screen.getByText('DEPOSITO CLIENTE ABC')).toBeInTheDocument();
      expect(screen.getByText('COMISION BANCARIA')).toBeInTheDocument();
    });
  });

  it('debe mostrar las sugerencias de conciliación para el primer movimiento', async () => {
    await act(async () => { render(<ConciliacionPage />); });
    await waitFor(() => {
      expect(screen.getByText(/ING-0042/)).toBeInTheDocument();
      expect(screen.getByText(/Pago factura A-123/)).toBeInTheDocument();
    });
  });

  it('debe mostrar "Sin póliza detectada" para el movimiento sin match', async () => {
    await act(async () => { render(<ConciliacionPage />); });
    await waitFor(() => {
      expect(screen.getByText(/Sin póliza detectada/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar las pólizas contables pendientes en el auxiliar', async () => {
    await act(async () => { render(<ConciliacionPage />); });
    await waitFor(() => {
      expect(screen.getByText(/ING-0043/)).toBeInTheDocument();
    });
  });

  it('debe mostrar el contador de movimientos pendientes', async () => {
    await act(async () => { render(<ConciliacionPage />); });
    await waitFor(() => {
      expect(screen.getByText(/2 Pendientes/)).toBeInTheDocument();
    });
  });

  it('debe llamar a /api/banks con el companyId correcto', async () => {
    await act(async () => { render(<ConciliacionPage />); });
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/banks?companyId=company-test-1')
      );
    });
  });

  it('debe abrir el modal de importación al hacer clic en el botón', async () => {
    await act(async () => { render(<ConciliacionPage />); });
    await waitFor(() => { screen.getAllByText(/Importar Estado de Cuenta/i); });

    const importBtn = screen.getAllByText(/Importar Estado de Cuenta/i)[0];
    await act(async () => { fireEvent.click(importBtn); });

    // El label "Contenido CSV" aparece en el modal
    await waitFor(() => {
      expect(screen.getAllByText(/Contenido CSV/i).length).toBeGreaterThan(0);
    });
  });

  it('debe cerrar el modal al hacer clic en Cancelar', async () => {
    await act(async () => { render(<ConciliacionPage />); });
    await waitFor(() => { screen.getAllByText(/Importar Estado de Cuenta/i); });

    const importBtn = screen.getAllByText(/Importar Estado de Cuenta/i)[0];
    await act(async () => { fireEvent.click(importBtn); });

    const cancelBtn = screen.getByText('Cancelar');
    await act(async () => { fireEvent.click(cancelBtn); });

    // Después de cerrar, el label solo del header queda, no el del modal
    expect(screen.queryByText(/Processar Importación/i)).not.toBeInTheDocument();
  });

  it('debe llamar a /api/reconciliation/link al conciliar', async () => {
    jest.clearAllMocks();
    mockApiFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockBanks })
      .mockResolvedValueOnce({ ok: true, json: async () => mockMatches })
      .mockResolvedValueOnce({ ok: true, json: async () => mockLedgerEntries })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })   // link
      .mockResolvedValueOnce({ ok: true, json: async () => mockBanks })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    await act(async () => { render(<ConciliacionPage />); });
    await waitFor(() => { screen.getByText('Conciliar'); });

    const conciliarBtn = screen.getByText('Conciliar');
    await act(async () => { fireEvent.click(conciliarBtn); });

    await waitFor(() => {
      const calls = mockApiFetch.mock.calls.map((c: any) => c[0] as string);
      expect(calls.some(u => u.includes('/api/reconciliation/link'))).toBe(true);
    });
  });
});

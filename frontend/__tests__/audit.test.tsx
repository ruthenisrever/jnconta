/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import AuditPage from '../app/audit/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => '/audit',
}));

jest.mock('../lib/api', () => ({
  apiFetch: jest.fn(),
}));

import { apiFetch } from '../lib/api';
const mockApiFetch = apiFetch as jest.Mock;

const mockHealthy = {
  riskScore: 95,
  status: 'HEALTHY',
  efos: { detected: 0, items: [] },
  integrity: {
    bills: { total: 20, withXml: 20 },
    invoices: { total: 15, withXml: 15 },
  },
};

const mockCritical = {
  riskScore: 40,
  status: 'CRITICAL',
  efos: {
    detected: 2,
    items: [
      { rfc: 'EFOS000001AAA', name: 'Empresa Fantasma SA', status: 'DEFINITIVO', riskLevel: 'CRITICAL' },
      { rfc: 'EFOS000002BBB', name: 'Prestanombre Corp', status: 'PRESUNTO', riskLevel: 'WARNING' },
    ],
  },
  integrity: {
    bills: { total: 10, withXml: 3 },
    invoices: { total: 8, withXml: 5 },
  },
};

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('AuditPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.setItem('companyId', 'audit-company-1');
  });

  it('debe renderizar el título de la página', async () => {
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => mockHealthy });

    await act(async () => {
      render(<AuditPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Audit & SAT Compliance/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar el Fiscal Health Score', async () => {
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => mockHealthy });

    await act(async () => {
      render(<AuditPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('95')).toBeInTheDocument();
      expect(screen.getByText(/HEALTHY/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar 0 proveedores EFOS cuando la empresa está limpia', async () => {
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => mockHealthy });

    await act(async () => {
      render(<AuditPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText(/No se detectaron proveedores/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar proveedores EFOS sancionados en estado crítico', async () => {
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => mockCritical });

    await act(async () => {
      render(<AuditPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Empresa Fantasma SA')).toBeInTheDocument();
      expect(screen.getByText('Prestanombre Corp')).toBeInTheDocument();
      expect(screen.getByText('DEFINITIVO')).toBeInTheDocument();
      expect(screen.getByText('PRESUNTO')).toBeInTheDocument();
    });
  });

  it('debe mostrar el score crítico cuando hay EFOS', async () => {
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => mockCritical });

    await act(async () => {
      render(<AuditPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('40')).toBeInTheDocument();
      expect(screen.getByText(/CRITICAL/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar barras de progreso de integridad documental', async () => {
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => mockCritical });

    await act(async () => {
      render(<AuditPage />);
    });

    await waitFor(() => {
      // bills: 3/10 y invoices: 5/8
      expect(screen.getByText('3 / 10')).toBeInTheDocument();
      expect(screen.getByText('5 / 8')).toBeInTheDocument();
    });
  });

  it('debe llamar a sync-blacklist cuando se presiona Actualizar Listas SAT', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockHealthy }) // initial fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })        // sync
      .mockResolvedValueOnce({ ok: true, json: async () => mockHealthy }); // re-fetch

    await act(async () => {
      render(<AuditPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Actualizar Listas SAT/i)).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Actualizar Listas SAT/i));
    });

    await waitFor(() => {
      const calls = mockApiFetch.mock.calls;
      const syncCall = calls.find((c: string[]) => c[0].includes('sync-blacklist'));
      expect(syncCall).toBeTruthy();
    });
  });

  it('debe mostrar mensaje cuando no hay companyId', async () => {
    localStorageMock.clear();
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => null });

    await act(async () => {
      render(<AuditPage />);
    });

    // Cuando no hay datos y no está cargando
    expect(screen.getByText(/Selecciona una empresa/i)).toBeInTheDocument();
  });
});

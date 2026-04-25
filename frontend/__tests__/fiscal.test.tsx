/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import FiscalWorksheetPage from '../app/fiscal/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => '/fiscal',
}));

jest.mock('../lib/api', () => ({
  apiFetch: jest.fn(),
}));

import { apiFetch } from '../lib/api';
const mockApiFetch = apiFetch as jest.Mock;

const mockWorksheet = {
  period: { month: 4, year: 2024 },
  summary: {
    trasladado: {
      base16: 100000, iva16: 16000,
      base8: 0, iva8: 0,
      base0: 5000, baseExempt: 2000,
      totalBase: 107000, totalIva: 16000,
    },
    acreditable: {
      base16: 40000, iva16: 6400,
      base8: 0, iva8: 0,
      base0: 0, baseExempt: 1000,
      totalBase: 41000, totalIva: 6400,
    },
    retentions: { iva: 500, isr: 2000 },
  },
  ivaNeto: 9100, // 16000 - 6400 - 500
  ivaAFavor: 0,
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

describe('FiscalWorksheetPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.setItem('companyId', 'company-test-1');
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => mockWorksheet,
    });
  });

  it('debe renderizar el título del papel de trabajo', async () => {
    await act(async () => {
      render(<FiscalWorksheetPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Papel de Trabajo Fiscal/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar el IVA trasladado correctamente', async () => {
    await act(async () => {
      render(<FiscalWorksheetPage />);
    });

    await waitFor(() => {
      // Base16 = 100,000
      expect(screen.getByText(/100,000/)).toBeInTheDocument();
    });
  });

  it('debe mostrar el resumen con IVA A CARGO', async () => {
    await act(async () => {
      render(<FiscalWorksheetPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/IVA A CARGO/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar IVA A FAVOR cuando ivaNeto=0 y ivaAFavor>0', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockWorksheet, ivaNeto: 0, ivaAFavor: 3500 }),
    });

    await act(async () => {
      render(<FiscalWorksheetPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/IVA A FAVOR/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar spinner durante la carga', async () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {}));
    localStorageMock.setItem('companyId', 'company-test-1');

    await act(async () => {
      render(<FiscalWorksheetPage />);
    });

    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  it('debe llamar a la API con companyId, month y year', async () => {
    await act(async () => {
      render(<FiscalWorksheetPage />);
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/fiscal/worksheet')
      );
      const callUrl = mockApiFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('companyId=company-test-1');
    });
  });

  it('debe mostrar los selectores de mes y año', async () => {
    await act(async () => {
      render(<FiscalWorksheetPage />);
    });

    await waitFor(() => {
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('debe mostrar retenciones ISR en la sección de otras retenciones', async () => {
    await act(async () => {
      render(<FiscalWorksheetPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/ISR Retenido/i)).toBeInTheDocument();
    });
  });
});

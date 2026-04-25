/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import TesoreriaPage from '../app/tesoreria/page';

const mockEvents = [
  { id: 'inv-1', type: 'IN', title: 'Cobro: Cliente A (Folio 1)', amount: 5000, currency: 'MXN', date: '2026-04-15T00:00:00.000Z', originalDate: '2026-04-01T00:00:00.000Z' },
  { id: 'bill-1', type: 'OUT', title: 'Pago: Proveedor B (Folio 99)', amount: -2000, currency: 'MXN', date: null, originalDate: '2026-04-01T00:00:00.000Z' },
];

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(mockEvents) } as any)
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TesoreriaPage', () => {
  it('debe renderizar el título y el calendario', async () => {
    await act(async () => {
      render(<TesoreriaPage />);
    });
    expect(screen.getByText('Calendario de Tesorería (Cash Flow)')).toBeInTheDocument();
  });

  it('debe mostrar el resumen de liquidez una vez cargado', async () => {
    await act(async () => {
      render(<TesoreriaPage />);
    });
    expect(screen.getByText('Resumen de Liquidez Real')).toBeInTheDocument();
  });

  it('debe mostrar el spinner mientras carga', async () => {
    // fetch que nunca resuelve → estado de carga indefinido
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));

    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<TesoreriaPage />));
    });

    expect(container.querySelector('.spinner')).toBeInTheDocument();
  });

  it('debe mostrar la advertencia de documentos sin fecha', async () => {
    await act(async () => {
      render(<TesoreriaPage />);
    });
    await waitFor(() => {
      expect(screen.getByText(/documentos sin fecha de vencimiento/i)).toBeInTheDocument();
    });
  });

  it('debe llamar al API de tesorería al montar', async () => {
    await act(async () => {
      render(<TesoreriaPage />);
    });
    const calls = (global.fetch as jest.Mock).mock.calls;
    const calendarCall = calls.find(([url]: [string]) =>
      typeof url === 'string' && url.includes('/api/treasury/calendar')
    );
    expect(calendarCall).toBeDefined();
  });

  it('debe separar eventos con y sin fecha', async () => {
    await act(async () => {
      render(<TesoreriaPage />);
    });
    await waitFor(() => {
      // El evento con fecha aparece en el calendario; el sin fecha en la bandeja
      expect(screen.getByText(/Pago:/i)).toBeInTheDocument();
    });
  });
});

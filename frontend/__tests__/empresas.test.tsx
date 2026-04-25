/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import EmpresasPage from '../app/empresas/page';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  usePathname: () => '/empresas',
}));

jest.mock('../lib/api', () => ({ apiFetch: jest.fn() }));

import { apiFetch } from '../lib/api';
const mockApiFetch = apiFetch as jest.Mock;

const mockCompanies = [
  { id: 'c1', name: 'Constructora ACME SA',   rfc: 'CAC000101AAA', regimenFiscal: '601 - General de Ley', email: 'acme@empresa.com', logo: null },
  { id: 'c2', name: 'Servicios Beta SC',       rfc: 'SBC000202BBB', regimenFiscal: '612 - Personas Físicas', email: 'beta@empresa.com', logo: null },
  { id: 'c3', name: 'Importadora Gamma',       rfc: 'IMG000303CCC', regimenFiscal: null,                     email: null, logo: null },
];

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('EmpresasPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => mockCompanies });
  });

  it('debe renderizar el título del panel del despacho', async () => {
    await act(async () => { render(<EmpresasPage />); });
    await waitFor(() => {
      expect(screen.getByText(/Panel del Despacho/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar todas las empresas al cargar', async () => {
    await act(async () => { render(<EmpresasPage />); });
    await waitFor(() => {
      expect(screen.getByText('Constructora ACME SA')).toBeInTheDocument();
      expect(screen.getByText('Servicios Beta SC')).toBeInTheDocument();
      expect(screen.getByText('Importadora Gamma')).toBeInTheDocument();
    });
  });

  it('debe mostrar los RFC de las empresas', async () => {
    await act(async () => { render(<EmpresasPage />); });
    await waitFor(() => {
      expect(screen.getByText('CAC000101AAA')).toBeInTheDocument();
      expect(screen.getByText('SBC000202BBB')).toBeInTheDocument();
    });
  });

  it('debe mostrar spinner mientras carga', async () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {}));
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<EmpresasPage />));
    });
    expect(container.querySelector('.spinner')).toBeInTheDocument();
  });

  it('debe filtrar empresas por nombre al escribir en el buscador', async () => {
    await act(async () => { render(<EmpresasPage />); });
    await waitFor(() => { screen.getByText('Constructora ACME SA'); });

    const input = screen.getByPlaceholderText(/Buscar empresa por nombre o RFC/i);
    await act(async () => { fireEvent.change(input, { target: { value: 'Beta' } }); });

    expect(screen.getByText('Servicios Beta SC')).toBeInTheDocument();
    expect(screen.queryByText('Constructora ACME SA')).not.toBeInTheDocument();
    expect(screen.queryByText('Importadora Gamma')).not.toBeInTheDocument();
  });

  it('debe filtrar empresas por RFC', async () => {
    await act(async () => { render(<EmpresasPage />); });
    await waitFor(() => { screen.getByText('Constructora ACME SA'); });

    const input = screen.getByPlaceholderText(/Buscar empresa por nombre o RFC/i);
    await act(async () => { fireEvent.change(input, { target: { value: 'IMG000303' } }); });

    expect(screen.getByText('Importadora Gamma')).toBeInTheDocument();
    expect(screen.queryByText('Constructora ACME SA')).not.toBeInTheDocument();
  });

  it('debe mostrar lista vacía si el filtro no coincide con ninguna empresa', async () => {
    await act(async () => { render(<EmpresasPage />); });
    await waitFor(() => { screen.getByText('Constructora ACME SA'); });

    const input = screen.getByPlaceholderText(/Buscar empresa por nombre o RFC/i);
    await act(async () => { fireEvent.change(input, { target: { value: 'XXX_NO_EXISTE' } }); });

    expect(screen.queryByText('Constructora ACME SA')).not.toBeInTheDocument();
    expect(screen.queryByText('Servicios Beta SC')).not.toBeInTheDocument();
    expect(screen.queryByText('Importadora Gamma')).not.toBeInTheDocument();
  });

  it('debe abrir el modal de nueva empresa al hacer clic en el botón', async () => {
    await act(async () => { render(<EmpresasPage />); });
    await waitFor(() => { screen.getByText('Constructora ACME SA'); });

    const addBtn = screen.getByText(/Nueva Empresa Cliente/i);
    await act(async () => { fireEvent.click(addBtn); });

    expect(screen.getByText(/Alta de Empresa Cliente/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ej\. Comercializadora del Norte/i)).toBeInTheDocument();
  });

  it('debe deshabilitar el botón Registrar si faltan nombre o RFC', async () => {
    await act(async () => { render(<EmpresasPage />); });
    await waitFor(() => { screen.getByText('Constructora ACME SA'); });

    const addBtn = screen.getByText(/Nueva Empresa Cliente/i);
    await act(async () => { fireEvent.click(addBtn); });

    const registerBtn = screen.getByText(/Registrar e Ingresar/i);
    expect(registerBtn).toBeDisabled();
  });

  it('debe habilitar el botón Registrar cuando se completan nombre y RFC', async () => {
    await act(async () => { render(<EmpresasPage />); });
    await waitFor(() => { screen.getByText('Constructora ACME SA'); });

    await act(async () => { fireEvent.click(screen.getByText(/Nueva Empresa Cliente/i)); });

    const nameInput = screen.getByPlaceholderText(/Ej\. Comercializadora/i);
    const rfcInput  = screen.getByPlaceholderText(/RFC de 12 o 13/i);

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Mi Empresa SA' } });
      fireEvent.change(rfcInput,  { target: { value: 'MEE000101AAA' } });
    });

    expect(screen.getByText(/Registrar e Ingresar/i)).not.toBeDisabled();
  });

  it('debe cerrar el modal al hacer clic en Cancelar', async () => {
    await act(async () => { render(<EmpresasPage />); });
    await waitFor(() => { screen.getByText('Constructora ACME SA'); });

    await act(async () => { fireEvent.click(screen.getByText(/Nueva Empresa Cliente/i)); });
    expect(screen.getByText(/Alta de Empresa Cliente/i)).toBeInTheDocument();

    await act(async () => { fireEvent.click(screen.getByText('Cancelar')); });
    expect(screen.queryByText(/Alta de Empresa Cliente/i)).not.toBeInTheDocument();
  });

  it('debe guardar companyId en localStorage al seleccionar empresa', async () => {
    await act(async () => { render(<EmpresasPage />); });
    await waitFor(() => { screen.getByText('Constructora ACME SA'); });

    const card = screen.getByText('Constructora ACME SA').closest('[class*="cursor-pointer"]')
                 || screen.getByText('Constructora ACME SA').parentElement!.parentElement!.parentElement!;
    await act(async () => { fireEvent.click(card); });

    expect(localStorageMock.getItem('companyId')).toBe('c1');
    expect(localStorageMock.getItem('companyName')).toBe('Constructora ACME SA');
  });

  it('debe llamar a POST /api/companies al registrar nueva empresa', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCompanies }) // initial load
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })           // POST
      .mockResolvedValueOnce({ ok: true, json: async () => mockCompanies }); // reload

    await act(async () => { render(<EmpresasPage />); });
    await waitFor(() => { screen.getByText('Constructora ACME SA'); });

    await act(async () => { fireEvent.click(screen.getByText(/Nueva Empresa Cliente/i)); });

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Ej\. Comercializadora/i), { target: { value: 'Nueva SA' } });
      fireEvent.change(screen.getByPlaceholderText(/RFC de 12 o 13/i),        { target: { value: 'NSA000101AAA' } });
    });

    await act(async () => { fireEvent.click(screen.getByText(/Registrar e Ingresar/i)); });

    await waitFor(() => {
      const calls = mockApiFetch.mock.calls.map((c: any) => c[0] as string);
      expect(calls.some(u => u.includes('/api/companies'))).toBe(true);
      const postCall = mockApiFetch.mock.calls.find((c: any) => c[1]?.method === 'POST');
      expect(postCall).toBeDefined();
    });
  });
});

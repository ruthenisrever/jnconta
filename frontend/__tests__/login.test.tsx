/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import LoginPage from '../app/login/page';

// Mock next/navigation
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockFetch.mockReset();
  });

  it('debe renderizar el formulario de login', async () => {
    await act(async () => {
      render(<LoginPage />);
    });
    expect(screen.getByPlaceholderText('admin@jnconta.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument();
  });

  it('debe mostrar credenciales demo pre-rellenadas', async () => {
    await act(async () => {
      render(<LoginPage />);
    });
    const emailInput = screen.getByPlaceholderText('admin@jnconta.com') as HTMLInputElement;
    expect(emailInput.value).toBe('admin@jnconta.com');
  });

  it('debe redirigir al dashboard si ya tiene token en localStorage', async () => {
    localStorageMock.setItem('jnconta_token', 'existing-token');
    await act(async () => {
      render(<LoginPage />);
    });
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('debe llamar a la API y guardar el token en localStorage al hacer login exitoso', async () => {
    const mockToken = 'jwt-token-abc123';
    // Mock login
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: mockToken,
        user: { id: 'u1', name: 'Admin', email: 'admin@jnconta.com', role: 'admin', companyId: 'c1' },
      }),
    });
    // Mock my-companies (segunda llamada)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ id: 'c1', name: 'Empresa Test' }]),
    });

    await act(async () => {
      render(<LoginPage />);
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /ingresar/i }).closest('form')!);
    });

    await waitFor(() => {
      expect(localStorageMock.getItem('jnconta_token')).toBe(mockToken);
      expect(localStorageMock.getItem('companyId')).toBe('c1');
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('debe mostrar mensaje de error cuando la API responde con error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Credenciales inválidas' }),
    });

    await act(async () => {
      render(<LoginPage />);
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /ingresar/i }).closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText(/credenciales inválidas/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar error de conexión cuando fetch falla', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      render(<LoginPage />);
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /ingresar/i }).closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('debe alternar visibilidad de la contraseña', async () => {
    await act(async () => {
      render(<LoginPage />);
    });

    const passwordInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    // Clic en toggle (el botón que no es submit)
    const toggleButtons = screen.getAllByRole('button', { hidden: true });
    const toggleBtn = toggleButtons.find(b => b.getAttribute('type') === 'button');

    await act(async () => {
      fireEvent.click(toggleBtn!);
    });

    expect(passwordInput.type).toBe('text');
  });
});

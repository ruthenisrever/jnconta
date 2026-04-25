/**
 * apiFetch — Wrapper global para todas las llamadas HTTP del frontend de JnConta.
 * Agrega automáticamente el token JWT de sesión en el header Authorization.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('jnconta_token') || '';
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  return fetch(url, {
    ...options,
    headers,
  });
}

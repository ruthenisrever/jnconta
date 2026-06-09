/**
 * apiFetch — Wrapper global para todas las llamadas HTTP del frontend de JnConta.
 * Agrega automáticamente el token JWT de sesión en el header Authorization.
 */

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:3005' : '';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
};

export const API_BASE = getApiUrl();

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

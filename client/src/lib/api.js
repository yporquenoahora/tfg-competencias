export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Error HTTP ${response.status}`);
  }
  return response.json();
}

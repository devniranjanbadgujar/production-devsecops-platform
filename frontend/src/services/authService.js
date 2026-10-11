const API_URL = import.meta.env.VITE_API_BASE_URL;

export async function authenticateUser(mode, credentials) {
  const response = await fetch(`${API_URL}/api/auth/${mode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Authentication failed');
  }

  return result.data;
}
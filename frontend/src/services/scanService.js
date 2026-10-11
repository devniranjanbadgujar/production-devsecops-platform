const API_URL = import.meta.env.VITE_API_BASE_URL;

function authHeaders(extra = {}) {
  const token = sessionStorage.getItem('authToken');

  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getScans() {
  const response = await fetch(`${API_URL}/api/scans`, {
    headers: authHeaders(),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Unable to load scans');
  return result.data;
}

export async function createScan(scan) {
  const response = await fetch(`${API_URL}/api/scans`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(scan),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Unable to save scan');
  return result.data;
}
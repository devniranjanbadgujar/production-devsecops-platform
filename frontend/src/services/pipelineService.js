
const API_URL = import.meta.env.VITE_API_BASE_URL;

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${sessionStorage.getItem('authToken') || ''}`,
  };
}

async function handleResponse(response) {
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Pipeline request failed');
  }

  return result.data;
}

export async function getPipelines() {
  const response = await fetch(`${API_URL}/api/pipelines`, {
    headers: getHeaders(),
  });

  return handleResponse(response);
}

export async function createPipeline(pipeline) {
  const response = await fetch(`${API_URL}/api/pipelines`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(pipeline),
  });

  return handleResponse(response);
}

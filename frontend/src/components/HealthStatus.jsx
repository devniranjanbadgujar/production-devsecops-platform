
import { useEffect, useState } from 'react';
import { getBackendHealth } from '../services/healthService';

export default function HealthStatus() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkHealth() {
      try {
        const result = await getBackendHealth();

        if (active) {
          setHealth(result);
          setError('');
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to reach backend');
          setHealth(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    checkHealth();

    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p>Checking backend health....</p>;

  if (error) {
    return <p role="alert">Backend unavailable: {error}</p>;
  }

  return (
    <section aria-label="Backend health">
      <p>Backend status: {health.status}</p>
      <p>Service: {health.service}</p>
    </section>
  );
}
import { useState } from 'react';
import HealthStatus from '../components/HealthStatus';
import ScanDashboard from '../components/ScanDashboard';
import AuthPanel from '../components/AuthPanel';
import PipelineDashboard from '../components/PipelineDashboard'

function getSavedUser() {
  try {
    return JSON.parse(sessionStorage.getItem('authUser') || 'null');
  } catch {
    return null;
  }
}

export default function Home() {
  const [user, setUser] = useState(getSavedUser);

  function handleAuthenticated(authenticatedUser) {
    sessionStorage.setItem('authUser', JSON.stringify(authenticatedUser));
    setUser(authenticatedUser);
  }

  function logout() {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authUser');
    setUser(null);
  }

  return (
    <main>
      <h1>Production-Grade DevSecOps Platform</h1>
      <HealthStatus />

      {user ? (
        <>
          <p>
            Signed in as <strong>{user.name}</strong>
          </p>
          <button onClick={logout}>Sign out</button>
          <ScanDashboard />
          <pipelineDashboard />
        </>
      ) : (
        <AuthPanel onAuthenticated={handleAuthenticated} />
      )}
    </main>
  );
}
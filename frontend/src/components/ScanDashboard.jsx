import { useEffect, useState } from 'react';
import { createScan, getScans } from '../services/scanService';

const initialForm = {
  appName: 'production-devsecops-platform',
  branch: 'main',
  tool: 'Trivy',
  status: 'passed',
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
};

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: 18,
};

export default function ScanDashboard() {
  const [scans, setScans] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadScans() {
    try {
      setError('');
      setScans(await getScans());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadScans();
  }, []);

  const total = scans.length;
  const passed = scans.filter((scan) => scan.status === 'passed').length;
  const failed = scans.filter((scan) => scan.status === 'failed').length;
  const vulnerabilities = scans.reduce(
    (sum, scan) =>
      sum + scan.critical + scan.high + scan.medium + scan.low,
    0
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await createScan({
        ...form,
        critical: Number(form.critical),
        high: Number(form.high),
        medium: Number(form.medium),
        low: Number(form.low),
      });

      setForm(initialForm);
      await loadScans();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const metrics = [
    ['Total scans', total],
    ['Passed', passed],
    ['Failed', failed],
    ['Vulnerabilities', vulnerabilities],
  ];

  return (
    <section style={{ marginTop: 28, color: '#111827' }}>
      <h2>Security Scan Dashboard</h2>
      <p style={{ color: '#6b7280' }}>
        Track application security scan results in one place.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 14,
          margin: '20px 0 30px',
        }}
      >
        {metrics.map(([label, value]) => (
          <div key={label} style={cardStyle}>
            <div style={{ color: '#6b7280', fontSize: 14 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <h3>Record a scan result</h3>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}
        >
          <input
            aria-label="Application name"
            placeholder="Application name"
            value={form.appName}
            required
            onChange={(e) =>
              setForm({ ...form, appName: e.target.value })
            }
          />

          <input
            aria-label="Branch"
            placeholder="Branch"
            value={form.branch}
            required
            onChange={(e) => setForm({ ...form, branch: e.target.value })}
          />

          <select
            aria-label="Security tool"
            value={form.tool}
            onChange={(e) => setForm({ ...form, tool: e.target.value })}
          >
            <option>Trivy</option>
            <option>SonarQube</option>
            <option>OWASP Dependency-Check</option>
          </select>

          <select
            aria-label="Scan status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
          </select>

          {['critical', 'high', 'medium', 'low'].map((severity) => (
            <label key={severity} style={{ fontSize: 13 }}>
              {severity[0].toUpperCase() + severity.slice(1)}
              <input
                aria-label={`${severity} vulnerabilities`}
                type="number"
                min="0"
                value={form[severity]}
                style={{ display: 'block', width: '90%', marginTop: 5 }}
                onChange={(e) =>
                  setForm({ ...form, [severity]: e.target.value })
                }
              />
            </label>
          ))}

          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save scan'}
          </button>
        </form>

        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      </div>

      <div style={{ ...cardStyle, marginTop: 20, overflowX: 'auto' }}>
        <h3>Recent scans</h3>

        {loading ? (
          <p>Loading scans...</p>
        ) : scans.length === 0 ? (
          <p>No scans recorded yet. Add a scan result above.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Application', 'Branch', 'Tool', 'Status', 'Findings', 'Date'].map(
                  (heading) => (
                    <th
                      key={heading}
                      style={{
                        textAlign: 'left',
                        padding: 10,
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan._id}>
                  <td style={{ padding: 10 }}>{scan.appName}</td>
                  <td>{scan.branch}</td>
                  <td>{scan.tool}</td>
                  <td>{scan.status}</td>
                  <td>
                    {scan.critical + scan.high + scan.medium + scan.low}
                  </td>
                  <td>{new Date(scan.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
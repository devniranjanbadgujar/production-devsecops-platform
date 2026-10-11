
import { useEffect, useState } from 'react';
import { createPipeline, getPipelines } from '../services/pipelineService';

const initialForm = {
  projectName: 'production-devsecops-platform',
  branch: 'main',
  commitSha: '',
  status: 'success',
  durationSeconds: 60,
  logs: 'Pipeline completed successfully.',
};

const statuses = ['pending', 'running', 'success', 'failed', 'aborted'];

export default function PipelineDashboard() {
  const [pipelines, setPipelines] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedLogs, setSelectedLogs] = useState(null);

  async function loadPipelines() {
    try {
      setError('');
      setPipelines(await getPipelines());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPipelines();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await createPipeline({
        ...form,
        durationSeconds: Number(form.durationSeconds),
      });

      setForm(initialForm);
      await loadPipelines();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const successful = pipelines.filter((p) => p.status === 'success').length;
  const failed = pipelines.filter((p) => p.status === 'failed').length;
  const active = pipelines.filter(
    (p) => p.status === 'running' || p.status === 'pending'
  ).length;

  const inputStyle = {
    width: '100%',
    padding: 10,
    boxSizing: 'border-box',
  };

  const cardStyle = {
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 16,
  };

  return (
    <section style={{ marginTop: 32, color: '#111827' }}>
      <h2>CI/CD Pipeline Runs</h2>
      <p style={{ color: '#6b7280' }}>
        Track build and deployment executions.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          margin: '20px 0',
        }}
      >
        {[
          ['Total runs', pipelines.length],
          ['Successful', successful],
          ['Failed', failed],
          ['In progress', active],
        ].map(([label, value]) => (
          <div key={label} style={cardStyle}>
            <div style={{ color: '#6b7280', fontSize: 14 }}>{label}</div>
            <strong style={{ fontSize: 28 }}>{value}</strong>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          ...cardStyle,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        <h3 style={{ gridColumn: '1 / -1', margin: 0 }}>
          Record a pipeline run
        </h3>

        <input
          style={inputStyle}
          aria-label="Project name"
          placeholder="Project name"
          value={form.projectName}
          maxLength={100}
          required
          onChange={(e) => updateField('projectName', e.target.value)}
        />

        <input
          style={inputStyle}
          aria-label="Branch"
          placeholder="Branch"
          value={form.branch}
          maxLength={200}
          required
          onChange={(e) => updateField('branch', e.target.value)}
        />

        <input
          style={inputStyle}
          aria-label="Commit SHA"
          placeholder="Commit SHA (optional)"
          value={form.commitSha}
          maxLength={40}
          onChange={(e) => updateField('commitSha', e.target.value)}
        />

        <select
          style={inputStyle}
          aria-label="Pipeline status"
          value={form.status}
          onChange={(e) => updateField('status', e.target.value)}
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <input
          style={inputStyle}
          type="number"
          min="0"
          aria-label="Duration in seconds"
          value={form.durationSeconds}
          required
          onChange={(e) => updateField('durationSeconds', e.target.value)}
        />

        <textarea
          style={{ ...inputStyle, gridColumn: '1 / -1' }}
          aria-label="Pipeline logs"
          placeholder="Pipeline logs"
          rows={3}
          maxLength={20000}
          value={form.logs}
          onChange={(e) => updateField('logs', e.target.value)}
        />

        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save pipeline run'}
        </button>
      </form>

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      <div style={{ overflowX: 'auto', marginTop: 24 }}>
        <h3>Recent executions</h3>

        {loading ? (
          <p>Loading pipeline runs...</p>
        ) : pipelines.length === 0 ? (
          <p>No pipeline runs recorded yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Project', 'Branch', 'Commit', 'Status', 'Duration', 'Date', 'Logs'].map(
                  (heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: 10,
                        textAlign: 'left',
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
              {pipelines.map((pipeline) => (
                <tr key={pipeline._id}>
                  <td style={{ padding: 10 }}>{pipeline.projectName}</td>
                  <td>{pipeline.branch}</td>
                  <td>{pipeline.commitSha ? pipeline.commitSha.slice(0, 7) : '—'}</td>
                  <td>{pipeline.status}</td>
                  <td>{pipeline.durationSeconds}s</td>
                  <td>{new Date(pipeline.createdAt).toLocaleString()}</td>
                  <td>
                    <button onClick={() => setSelectedLogs(pipeline)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedLogs && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3>Logs — {selectedLogs.projectName}</h3>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {selectedLogs.logs || 'No logs recorded.'}
          </pre>
          <button onClick={() => setSelectedLogs(null)}>Close logs</button>
        </div>
      )}
    </section>
  );
}

import { useEffect, useState } from 'react';
import { Building2, Image, Save } from 'lucide-react';
import { tenantAPI } from '../../services/api';
import './Settings.css';

function TenantSettings() {
  const [formData, setFormData] = useState({ name: '', logo_url: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await tenantAPI.getSettings();
        setFormData({
          name: response.name || '',
          logo_url: response.logo_url || ''
        });
      } catch (err) {
        setError(err.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await tenantAPI.updateSettings(formData);
      setSuccess('Settings updated successfully');
    } catch (err) {
      setError(err.message || 'Failed to update settings');
    }
  };

  if (loading) return <div className="loading">Loading settings...</div>;

  return (
    <div className="tenant-settings-page">
      <div className="page-header">
        <h1>Tenant Settings</h1>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="card tenant-settings-card">
        <div className="form-group">
          <label className="form-label"><Building2 size={14} /> College Name</label>
          <input
            className="form-input"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label"><Image size={14} /> Logo URL</label>
          <input
            className="form-input"
            value={formData.logo_url}
            onChange={(e) => setFormData((prev) => ({ ...prev, logo_url: e.target.value }))}
            placeholder="https://..."
          />
        </div>

        <button className="btn btn-primary"><Save size={14} /> Save Settings</button>
      </form>
    </div>
  );
}

export default TenantSettings;

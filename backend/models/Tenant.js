const pool = require('../config/connection');

class Tenant {
  static async create(tenantData) {
    const { name, subdomain, logo_url } = tenantData;
    const [result] = await pool.execute(
      'INSERT INTO Tenants (name, subdomain, logo_url) VALUES (?, ?, ?)',
      [name, subdomain, logo_url || null]
    );

    return result.insertId;
  }

  static async findById(tenantId) {
    const [rows] = await pool.execute(
      'SELECT tenant_id, name, subdomain, logo_url, created_at FROM Tenants WHERE tenant_id = ?',
      [tenantId]
    );

    return rows[0];
  }

  static async findBySubdomain(subdomain) {
    const [rows] = await pool.execute(
      'SELECT tenant_id, name, subdomain, logo_url, created_at FROM Tenants WHERE subdomain = ?',
      [subdomain]
    );

    return rows[0];
  }

  static async updateBranding(tenantId, updates) {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.logo_url !== undefined) {
      fields.push('logo_url = ?');
      values.push(updates.logo_url);
    }

    if (fields.length === 0) return false;

    values.push(tenantId);

    const [result] = await pool.execute(
      `UPDATE Tenants SET ${fields.join(', ')} WHERE tenant_id = ?`,
      values
    );

    return result.affectedRows > 0;
  }
}

module.exports = Tenant;

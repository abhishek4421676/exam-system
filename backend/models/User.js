const pool = require('../config/connection');

class User {
  /**
   * Create new user
   */
  static async create(userData) {
    const { tenant_id, name, email, password_hash, role, google_id } = userData;
    const [result] = await pool.execute(
      'INSERT INTO Users (tenant_id, name, email, password_hash, role, google_id) VALUES (?, ?, ?, ?, ?, ?)',
      [tenant_id, name, email, password_hash, role, google_id || null]
    );
    return result.insertId;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email, tenantId) {
    const [rows] = await pool.execute(
      'SELECT * FROM Users WHERE email = ? AND tenant_id = ?',
      [email, tenantId]
    );
    return rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(userId, tenantId) {
    const [rows] = await pool.execute(
      'SELECT user_id, tenant_id, name, email, role, created_at FROM Users WHERE user_id = ? AND tenant_id = ?',
      [userId, tenantId]
    );
    return rows[0];
  }

  /**
   * Get all users
   */
  static async findAll(tenantId, filters = {}) {
    let query = 'SELECT user_id, tenant_id, name, email, role, created_at FROM Users WHERE tenant_id = ?';
    const params = [tenantId];

    if (filters.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  /**
   * Update user
   */
  static async update(userId, tenantId, updates) {
    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (['name', 'email', 'password_hash', 'role'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) return false;

    values.push(userId, tenantId);
    const query = `UPDATE Users SET ${fields.join(', ')} WHERE user_id = ? AND tenant_id = ?`;
    
    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  }

  /**
   * Delete user
   */
  static async delete(userId, tenantId) {
    const [result] = await pool.execute(
      'DELETE FROM Users WHERE user_id = ? AND tenant_id = ?',
      [userId, tenantId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Check if email exists
   */
  static async emailExists(email, tenantId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM Users WHERE email = ? AND tenant_id = ?',
      [email, tenantId]
    );
    return rows[0].count > 0;
  }
}

module.exports = User;

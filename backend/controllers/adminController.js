
import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

// ===============================
// Admin: Get all users (except password)
// ===============================
export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role FROM users');
    res.status(200).json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error while fetching users.' });
  }
};

// ===============================
// Admin: Update user's username and password
// ===============================
export const updateUserInfo = async (req, res) => {
  const { id } = req.params;
  const { username, password } = req.body;

  if (!username && !password) {
    return res.status(400).json({ message: 'Username or Password must be provided to update.' });
  }

  try {
    let updateFields = [];
    let values = [];
    let counter = 1;

    if (username) {
      updateFields.push(`username = $${counter++}`);
      values.push(username);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push(`password = $${counter++}`);
      values.push(hashedPassword);
    }

    values.push(id); // Last value for WHERE clause

    const updateQuery = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${counter}
      RETURNING id, username, role
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'User info updated successfully.', user: result.rows[0] });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error while updating user.' });
  }
};

// ===============================
// Admin: Change user's role
// ===============================
export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ message: 'Role must be provided.' });
  }

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Role must be either "user" or "admin".' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'User role updated successfully.', user: result.rows[0] });

  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ message: 'Server error while updating role.' });
  }
};

// ===============================
// Admin: Delete user
// ===============================
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, username', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'User deleted successfully.', user: result.rows[0] });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error while deleting user.' });
  }
};

// routes/usuarios.js

const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener detalles de un usuario por su ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [users] = await pool.query('SELECT id, nombre, email, rol FROM usuarios WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(users[0]);
  } catch (error) {
    console.error('Error al obtener el usuario:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
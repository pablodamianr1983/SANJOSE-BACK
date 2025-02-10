const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener la conversación entre el usuario autenticado y otro usuario
router.get('/conversacion/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;
  const usuarioActualId = req.user.id;

  try {
    const [mensajes] = await pool.query(
      `SELECT mensajes.*, remitente.nombre AS remitente_nombre, destinatario.nombre AS destinatario_nombre
       FROM mensajes
       JOIN usuarios AS remitente ON mensajes.remitente_id = remitente.id
       JOIN usuarios AS destinatario ON mensajes.destinatario_id = destinatario.id
       WHERE (mensajes.remitente_id = ? AND mensajes.destinatario_id = ?)
          OR (mensajes.remitente_id = ? AND mensajes.destinatario_id = ?)
       ORDER BY mensajes.fecha_envio ASC`,
      [usuarioActualId, usuarioId, usuarioId, usuarioActualId]
    );
    res.json(mensajes);
  } catch (error) {
    console.error('Error al obtener la conversación:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener mensajes agrupados por remitente
router.get('/grupos', async (req, res) => {
  try {
    const { id } = req.user; // ID del usuario actual
    const [grupos] = await pool.query(
      `SELECT remitente_id, remitente.nombre AS remitente_nombre, COUNT(*) AS total_mensajes
       FROM mensajes
       JOIN usuarios AS remitente ON mensajes.remitente_id = remitente.id
       WHERE destinatario_id = ?
       GROUP BY remitente_id, remitente.nombre
       ORDER BY total_mensajes DESC`,
      [id]
    );
    res.json(grupos);
  } catch (error) {
    console.error('Error al obtener mensajes agrupados:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener mensajes de un remitente específico
router.get('/remitente/:remitenteId', async (req, res) => {
  const { remitenteId } = req.params;
  const { id } = req.user; // ID del usuario actual

  try {
    const [mensajes] = await pool.query(
      `SELECT mensajes.*, remitente.nombre AS remitente_nombre, destinatario.nombre AS destinatario_nombre
       FROM mensajes
       JOIN usuarios AS remitente ON mensajes.remitente_id = remitente.id
       JOIN usuarios AS destinatario ON mensajes.destinatario_id = destinatario.id
       WHERE (mensajes.remitente_id = ? AND mensajes.destinatario_id = ?)
          OR (mensajes.remitente_id = ? AND mensajes.destinatario_id = ?)
       ORDER BY mensajes.fecha_envio ASC`,
      [remitenteId, id, id, remitenteId]
    );
    res.json(mensajes);
  } catch (error) {
    console.error('Error al obtener mensajes del remitente:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enviar un nuevo mensaje
router.post('/enviar', async (req, res) => {
  const { destinatario_id, contenido } = req.body;
  const remitente_id = req.user.id;

  try {
    // Verificar permisos
    const [remitenteRows] = await pool.query('SELECT rol FROM usuarios WHERE id = ?', [remitente_id]);
    const [destinatarioRows] = await pool.query('SELECT rol FROM usuarios WHERE id = ?', [destinatario_id]);

    if (remitenteRows.length === 0 || destinatarioRows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const remitenteRol = remitenteRows[0].rol;
    const destinatarioRol = destinatarioRows[0].rol;

    if (remitenteRol === 'administrador' && destinatarioRol !== 'profesor') {
      return res.status(403).json({ message: 'Los administradores solo pueden enviar mensajes a profesores' });
    }

    if (remitenteRol === 'profesor' && destinatarioRol !== 'administrador') {
      return res.status(403).json({ message: 'Los profesores solo pueden enviar mensajes a administradores' });
    }

    // Insertar el mensaje
    await pool.query(
      'INSERT INTO mensajes (remitente_id, destinatario_id, contenido) VALUES (?, ?, ?)',
      [remitente_id, destinatario_id, contenido]
    );

    res.json({ message: 'Mensaje enviado correctamente' });
  } catch (error) {
    console.error('Error al enviar el mensaje:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un mensaje específico
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Validar que el usuario sea administrador
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ message: 'No tienes permisos para realizar esta acción.' });
    }

    // Verificar si el mensaje existe
    const [mensaje] = await pool.query('SELECT * FROM mensajes WHERE id = ?', [id]);
    if (mensaje.length === 0) {
      return res.status(404).json({ message: 'Mensaje no encontrado.' });
    }

    // Eliminar el mensaje
    await pool.query('DELETE FROM mensajes WHERE id = ?', [id]);

    res.json({ message: 'Mensaje eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar el mensaje:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

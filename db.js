// db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'junction.proxy.rlwy.net',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'BqYeMVomTwespOPBxsQnryOGnrCMqPii', // Reemplázalo con la contraseña real
  database: process.env.DB_NAME || 'railway',
  port: process.env.DB_PORT || 21058,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Probar la conexión a la base de datos
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conectado a la base de datos en Railway.');
    connection.release(); // Liberar la conexión de prueba
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error.message);
  }
})();

module.exports = pool;

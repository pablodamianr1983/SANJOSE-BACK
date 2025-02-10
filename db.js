// db.js
const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Veintecero20',
  database: process.env.DB_NAME || 'horarios',
  port: process.env.DB_PORT || 3306,
});

// Probar la conexión a la base de datos
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos.');
    connection.release();  // Liberar la conexión de prueba
  }
});

module.exports = pool.promise();

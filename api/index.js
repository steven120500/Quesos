const express = require('express');
const cors = require('cors');
require('dotenv').config();
const conectarDB = require('./config/db');

// Importamos nuestras rutas
const rutasProductos = require('./routes/productoRoutes');
const rutasVentas = require('./routes/ventaRoutes');
const rutasUsuarios = require('./routes/usuarioRoutes');

const app = express();

// Conectar a la Base de Datos
conectarDB();

// --- CONFIGURACIÓN DE CORS (ABIERTA PARA DESPLIEGUE) ---
app.use(cors({
  origin: '*', // Esto permite que Vercel se conecte a Render sin problemas
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Conectamos las rutas
app.use('/api/productos', rutasProductos);
app.use('/api/ventas', rutasVentas);
app.use('/api/usuarios', rutasUsuarios);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API de Quesos funcionando 🧀');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
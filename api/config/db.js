const mongoose = require('mongoose');

const conectarDB = async () => {
  try {
    // Intentamos conectar usando la variable del .env
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 Base de datos MongoDB conectada con éxito');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1); // Detiene la app si falla la conexión
  }
};

module.exports = conectarDB;
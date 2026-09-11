const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  usuario: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol: { type: String, default: 'cajero', enum: ['superadmin', 'cajero'] },
  // Aquí guardaremos a qué pantallas tiene permiso de entrar
  permisos: { type: [String], default: ['pos'] } 
}, {
  timestamps: true
});

module.exports = mongoose.model('Usuario', usuarioSchema);
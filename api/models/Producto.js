const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  codigo: { type: String, required: true },
  nombre: { type: String, required: true },
  precioCosto: { type: Number, required: true },
  precioVenta: { type: Number, required: true },
  sucursal: { type: String, required: true },
  tipoVenta: { type: String, default: 'Peso' } // NUEVO: 'Peso' o 'Unidad'
}, {
  timestamps: true 
});

module.exports = mongoose.model('Producto', productoSchema);
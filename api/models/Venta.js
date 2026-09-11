const mongoose = require('mongoose');

const ventaSchema = new mongoose.Schema({
  sucursal: { type: String, required: true },
  productos: [{
    productoId: { type: String },
    nombre: { type: String, required: true },
    cantidad: { type: Number, required: true },
    precioVenta: { type: Number, required: true },
    precioCosto: { type: Number, required: true } // Súper importante para calcular ganancias
  }],
  totalVenta: { type: Number, required: true },
  totalCosto: { type: Number, required: true },
  metodoPago: { type: String, required: true, default: 'Efectivo' }
}, {
  timestamps: true // Esto nos dará automáticamente la fecha y hora exacta del ticket
});

module.exports = mongoose.model('Venta', ventaSchema);
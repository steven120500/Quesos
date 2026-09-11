const express = require('express');
const router = express.Router();
const Venta = require('../models/Venta');

// 1. RUTA POST: Guardar una nueva venta (ticket)
router.post('/', async (req, res) => {
  try {
    const nuevaVenta = new Venta(req.body);
    const ventaGuardada = await nuevaVenta.save();
    res.status(201).json(ventaGuardada);
  } catch (error) {
    console.error('Error guardando la venta:', error);
    res.status(500).json({ mensaje: 'Error al procesar la venta en el servidor' });
  }
});

// 2. RUTA GET: Obtener todas las ventas de una sucursal específica
router.get('/:sucursal', async (req, res) => {
  try {
    // Buscamos las ventas de la sucursal y las ordenamos de la más nueva a la más vieja
    const ventas = await Venta.find({ sucursal: req.params.sucursal }).sort({ createdAt: -1 });
    res.json(ventas);
  } catch (error) {
    console.error('Error obteniendo ventas:', error);
    res.status(500).json({ mensaje: 'Error al obtener el historial de finanzas' });
  }
});

// 3. RUTA DELETE: Eliminar una venta del historial
router.delete('/:id', async (req, res) => {
  try {
    await Venta.findByIdAndDelete(req.params.id);
    res.json({ mensaje: 'Venta eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando venta:', error);
    res.status(500).json({ mensaje: 'Error al eliminar la venta' });
  }
});

module.exports = router;
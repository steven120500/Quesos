const express = require('express');
const router = express.Router();
const Producto = require('../models/Producto');

// 1. RUTA POST: Guardar un nuevo producto en la base de datos
router.post('/', async (req, res) => {
  try {
    const nuevoProducto = new Producto(req.body);
    const productoGuardado = await nuevoProducto.save();
    res.status(201).json(productoGuardado); // Respondemos con el producto ya guardado
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al guardar el producto' });
  }
});

// 2. RUTA GET: Obtener los productos de una sucursal específica
router.get('/:sucursal', async (req, res) => {
  try {
    // Busca en la base de datos solo los que coincidan con la sucursal (Sarchí o Poás)
    const productos = await Producto.find({ sucursal: req.params.sucursal });
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener los productos' });
  }
});

// 3. RUTA DELETE: Eliminar un producto de la base de datos
router.delete('/:id', async (req, res) => {
  try {
    await Producto.findByIdAndDelete(req.params.id);
    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({ mensaje: 'Error al eliminar el producto' });
  }
});

module.exports = router;
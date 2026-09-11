const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');

// 1. RUTA LOGIN: Verifica credenciales
router.post('/login', async (req, res) => {
  try {
    // Buscamos si tu usuario Super Admin ya existe en la base de datos
    const adminExiste = await Usuario.findOne({ usuario: 'djest0524@icloud.com' });
    
    // Si no existe, lo creamos automáticamente con tus credenciales exactas
    if (!adminExiste) {
      const superAdminInicial = new Usuario({ 
        usuario: 'djest0524@icloud.com', 
        password: 'Chasca0524', 
        rol: 'superadmin',
        permisos: ['pos', 'agregar', 'finanzas'] // Tienes acceso a TODO
      });
      await superAdminInicial.save();
    }

    const { usuario, password } = req.body;
    const usuarioValido = await Usuario.findOne({ usuario, password });

    if (usuarioValido) {
      res.json({ exito: true, usuario: usuarioValido });
    } else {
      res.status(401).json({ exito: false, mensaje: 'Usuario o contraseña incorrectos' });
    }
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ exito: false, mensaje: 'Error en el servidor' });
  }
});

// 2. RUTA GET: Obtener todos los usuarios (Para que el Admin los gestione)
router.get('/', async (req, res) => {
  try {
    const usuarios = await Usuario.find().select('-password'); // Ocultamos las claves por seguridad
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener usuarios' });
  }
});

// 3. RUTA POST: Crear un nuevo usuario (Cajero)
router.post('/', async (req, res) => {
  try {
    const nuevoUsuario = new Usuario(req.body);
    await nuevoUsuario.save();
    res.status(201).json({ mensaje: 'Usuario creado con éxito' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear usuario (quizás el nombre ya existe)' });
  }
});

// 4. RUTA DELETE: Eliminar un usuario
router.delete('/:id', async (req, res) => {
  try {
    await Usuario.findByIdAndDelete(req.params.id);
    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar usuario' });
  }
});

module.exports = router;
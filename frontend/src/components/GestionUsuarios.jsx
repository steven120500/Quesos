import React, { useState, useEffect } from 'react';

function GestionUsuarios({ onVolver }) {
  const [usuarios, setUsuarios] = useState([]);
  const [nuevoUser, setNuevoUser] = useState('');
  const [nuevoPass, setNuevoPass] = useState('');
  const [permisos, setPermisos] = useState(['pos']); 
  const [cargando, setCargando] = useState(false);

  // --- NUEVOS ESTADOS PARA DISEÑO PROFESIONAL ---
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: '' });
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);

  const mostrarNotificacion = (mensaje, tipo) => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => { setNotificacion({ visible: false, mensaje: '', tipo: '' }); }, 3000);
  };

  const obtenerUsuarios = async () => {
    try {
      const res = await fetch('https://backend-quesos.onrender.com/api/usuarios');
      const data = await res.json();
      setUsuarios(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { obtenerUsuarios(); }, []);

  const manejarCheckbox = (permiso) => {
    if (permisos.includes(permiso)) {
      setPermisos(permisos.filter(p => p !== permiso));
    } else {
      setPermisos([...permisos, permiso]);
    }
  };

  const crearUsuario = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      const res = await fetch('https://backend-quesos.onrender.com/api/usuarios', {
         method: 'POST',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({ usuario: nuevoUser, password: nuevoPass, permisos, rol: 'cajero' })
      });
      
      if (res.ok) {
        setNuevoUser('');
        setNuevoPass('');
        setPermisos(['pos']);
        obtenerUsuarios();
        mostrarNotificacion('Usuario creado con éxito', 'exito');
      } else {
        mostrarNotificacion('Error: El nombre de usuario ya existe', 'error');
      }
    } catch (error) {
      mostrarNotificacion('Error de conexión con el servidor', 'error');
    } finally {
      setCargando(false);
    }
  };

  // --- NUEVA FUNCIÓN: Ejecuta el borrado real tras confirmar en el modal ---
  const confirmarEliminacionBD = async () => {
    if (!usuarioAEliminar) return;

    try {
      const res = await fetch(`https://backend-quesos.onrender.com/api/usuarios/${usuarioAEliminar._id}`, { 
        method: 'DELETE' 
      });
      
      if (res.ok) {
        obtenerUsuarios();
        mostrarNotificacion('Usuario eliminado permanentemente', 'exito');
      } else {
        mostrarNotificacion('Error al eliminar el usuario', 'error');
      }
    } catch (error) {
      mostrarNotificacion('Error de conexión', 'error');
    } finally {
      setUsuarioAEliminar(null); // Cierra el modal pase lo que pase
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center relative">
      
      {/* --- NOTIFICACIÓN FLOTANTE --- */}
      {notificacion.visible && (
        <div className={`fixed bottom-5 right-5 sm:bottom-10 sm:right-10 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 transition-all text-white font-bold text-lg
          ${notificacion.tipo === 'exito' ? 'bg-[#2E7D32]' : 'bg-red-600'}`}>
          {notificacion.mensaje}
        </div>
      )}

      {/* --- MODAL DE CONFIRMACIÓN DE ELIMINACIÓN --- */}
      {usuarioAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border-2 border-red-100">
            <div className="flex justify-center mb-4 text-red-500">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-800 mb-2">¿Eliminar Cajero?</h3>
            <p className="text-center text-gray-600 mb-6 font-medium">
              Estás a punto de borrar el acceso a:<br/>
              <span className="font-black text-[#8B5A2B] text-lg capitalize">{usuarioAEliminar.usuario}</span>
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setUsuarioAEliminar(null)} 
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarEliminacionBD} 
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors shadow-md cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-[#FFF0C2]">
        <div className="bg-[#4A2511] p-6 flex justify-between items-center text-[#FFB800]">
          <h2 className="text-3xl font-bold"> Gestión de Usuarios</h2>
          <button onClick={onVolver} className="bg-white/20 hover:bg-white/30 px-6 py-2 rounded-lg font-bold transition-colors text-white cursor-pointer">
            ← Volver a Sucursales
          </button>
        </div>
        
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Formulario de Creación */}
          <div className="col-span-1 bg-gray-50 p-6 rounded-2xl border border-gray-200">
            <h3 className="text-xl font-bold text-[#8B5A2B] mb-4">Crear Nuevo Cajero</h3>
            <form onSubmit={crearUsuario} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de Usuario</label>
                <input type="text" required value={nuevoUser} onChange={(e) => setNuevoUser(e.target.value)} className="w-full bg-white border-2 border-gray-300 focus:border-[#FFB800] rounded-lg px-3 py-2 font-bold outline-none" placeholder="Ej: maria" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
                <input type="text" required value={nuevoPass} onChange={(e) => setNuevoPass(e.target.value)} className="w-full bg-white border-2 border-gray-300 focus:border-[#FFB800] rounded-lg px-3 py-2 font-bold outline-none" placeholder="Ej: maria123" />
              </div>
              <div className="pt-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">Permisos (¿A qué puede entrar?)</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border shadow-sm">
                    <input type="checkbox" checked={permisos.includes('pos')} onChange={() => manejarCheckbox('pos')} className="w-5 h-5 accent-[#8B5A2B] cursor-pointer" />
                    <span className="font-bold text-gray-700 text-sm">Caja (Registrar Ventas)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border shadow-sm">
                    <input type="checkbox" checked={permisos.includes('agregar')} onChange={() => manejarCheckbox('agregar')} className="w-5 h-5 accent-[#8B5A2B] cursor-pointer" />
                    <span className="font-bold text-gray-700 text-sm">Inventario (Agregar Prod)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border shadow-sm">
                    <input type="checkbox" checked={permisos.includes('finanzas')} onChange={() => manejarCheckbox('finanzas')} className="w-5 h-5 accent-[#8B5A2B] cursor-pointer" />
                    <span className="font-bold text-gray-700 text-sm">Reportes (Finanzas)</span>
                  </label>
                </div>
              </div>
              <button type="submit" disabled={cargando} className="w-full bg-[#8B5A2B] hover:bg-[#4A2511] text-white font-bold py-3 rounded-xl mt-4 transition-colors cursor-pointer active:scale-95 shadow-md">
                {cargando ? 'Guardando...' : '+ Guardar Cajero'}
              </button>
            </form>
          </div>
          
          {/* Lista de Usuarios */}
          <div className="col-span-2">
            <h3 className="text-xl font-bold text-[#8B5A2B] mb-4">Usuarios Activos</h3>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-left">
                <thead className="bg-[#FFF0C2] text-[#8B5A2B]">
                  <tr>
                    <th className="px-6 py-3 text-sm font-bold">Usuario</th>
                    <th className="px-6 py-3 text-sm font-bold">Rol</th>
                    <th className="px-6 py-3 text-sm font-bold">Accesos</th>
                    <th className="px-6 py-3 text-sm font-bold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {usuarios.map(u => (
                    <tr key={u._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-bold text-gray-800 capitalize">{u.usuario}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.rol === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {u.rol}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {u.permisos.includes('pos') && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold">Caja</span>}
                          {u.permisos.includes('agregar') && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded font-bold">Prod</span>}
                          {u.permisos.includes('finanzas') && <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold">Finanz</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {u.rol !== 'superadmin' && (
                          <button 
                            onClick={() => setUsuarioAEliminar(u)} 
                            className="inline-flex items-center justify-center w-8 h-8 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-colors cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GestionUsuarios;
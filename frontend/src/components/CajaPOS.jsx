import React, { useState, useEffect } from 'react';

function CajaPOS({ sucursal }) {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [procesando, setProcesando] = useState(false);

  const [productoParaPesar, setProductoParaPesar] = useState(null);
  const [pesoGramos, setPesoGramos] = useState('');
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: '' });

  // NUEVO ESTADO: Para controlar la ventana de eliminar
  const [productoAEliminar, setProductoAEliminar] = useState(null);

  useEffect(() => {
    const obtenerProductos = async () => {
      setCargando(true);
      try {
        const respuesta = await fetch(`http://localhost:4000/api/productos/${sucursal}`);
        if (respuesta.ok) {
          const datos = await respuesta.json();
          setProductos(datos);
        }
      } catch (error) {
        console.error("Error al obtener los productos:", error);
      } finally {
        setCargando(false);
      }
    };
    obtenerProductos();
  }, [sucursal]);

  const mostrarNotificacion = (mensaje, tipo) => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => { setNotificacion({ visible: false, mensaje: '', tipo: '' }); }, 3000);
  };

  const manejarClickProducto = (producto) => {
    if (producto.tipoVenta === 'Unidad') {
      const itemExistente = carrito.find((item) => item._id === producto._id);
      if (itemExistente) {
        setCarrito(carrito.map((item) => item._id === producto._id ? { ...item, cantidad: item.cantidad + 1 } : item));
      } else {
        setCarrito([...carrito, { ...producto, cantidad: 1 }]);
      }
    } else {
      setProductoParaPesar(producto);
    }
  };

  // --- NUEVA FUNCIÓN: Solo abre la ventana bonita de confirmación ---
  const confirmarEliminacion = (e, producto) => {
    e.stopPropagation(); 
    setProductoAEliminar(producto);
  };

  // --- NUEVA FUNCIÓN: Ejecuta el borrado real en la BD ---
  const ejecutarEliminacionBD = async () => {
    if (!productoAEliminar) return;
    
    try {
      const respuesta = await fetch(`http://localhost:4000/api/productos/${productoAEliminar._id}`, {
        method: 'DELETE',
      });

      if (respuesta.ok) {
        setProductos(productos.filter((p) => p._id !== productoAEliminar._id));
        mostrarNotificacion('🗑️ Producto eliminado permanentemente', 'exito');
      } else {
        mostrarNotificacion('Error al eliminar el producto', 'error');
      }
    } catch (error) {
      mostrarNotificacion('Error de conexión', 'error');
    } finally {
      setProductoAEliminar(null); // Cerramos la ventana pase lo que pase
    }
  };

  const confirmarPeso = (e) => {
    e.preventDefault();
    const kilos = parseFloat(pesoGramos) / 1000;
    if (isNaN(kilos) || kilos <= 0) return;

    const itemExistente = carrito.find((item) => item._id === productoParaPesar._id);
    if (itemExistente) {
      setCarrito(carrito.map((item) => item._id === productoParaPesar._id ? { ...item, cantidad: item.cantidad + kilos } : item));
    } else {
      setCarrito([...carrito, { ...productoParaPesar, cantidad: kilos }]);
    }
    setProductoParaPesar(null);
    setPesoGramos('');
  };

  const eliminarDelCarrito = (idProducto) => {
    setCarrito(carrito.filter((item) => item._id !== idProducto));
  };

  const totalVenta = carrito.reduce((suma, item) => suma + (item.precioVenta * item.cantidad), 0);
  const totalCosto = carrito.reduce((suma, item) => suma + (item.precioCosto * item.cantidad), 0);

  const productosFiltrados = productos.filter(producto => 
    producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    producto.codigo.includes(busqueda)
  );

  const procesarVenta = async () => {
    setProcesando(true);
    try {
      const productosVenta = carrito.map(item => ({
        productoId: item._id,
        nombre: item.nombre,
        cantidad: item.cantidad, 
        precioVenta: item.precioVenta,
        precioCosto: item.precioCosto
      }));

      const datosVenta = {
        sucursal: sucursal,
        productos: productosVenta,
        totalVenta: totalVenta,
        totalCosto: totalCosto,
        metodoPago: metodoPago
      };

      const respuesta = await fetch('http://localhost:4000/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosVenta)
      });

      if (respuesta.ok) {
        mostrarNotificacion('¡Venta registrada con éxito!', 'exito');
        setCarrito([]); 
        setMetodoPago('Efectivo'); 
      } else {
        mostrarNotificacion('Hubo un error al registrar la venta.', 'error');
      }
    } catch (error) {
      mostrarNotificacion('Error de conexión con el servidor.', 'error');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full relative">
      
      {/* NOTIFICACIÓN FLOTANTE */}
      {notificacion.visible && (
        <div className={`fixed bottom-5 right-5 sm:bottom-10 sm:right-10 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 transition-all text-white font-bold text-lg
          ${notificacion.tipo === 'exito' ? 'bg-[#2E7D32]' : 'bg-red-600'}`}>
          {notificacion.mensaje}
        </div>
      )}

      {/* --- NUEVO: MODAL PARA CONFIRMAR ELIMINACIÓN --- */}
      {productoAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border-2 border-red-100">
            <div className="flex justify-center mb-4 text-red-500">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-800 mb-2">¿Eliminar Producto?</h3>
            <p className="text-center text-gray-600 mb-6 font-medium">
              Estás a punto de borrar del sistema:<br/>
              <span className="font-black text-[#8B5A2B] text-lg">"{productoAEliminar.nombre}"</span>
            </p>
            
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setProductoAEliminar(null)} 
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={ejecutarEliminacionBD}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer shadow-md"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE PESO --- */}
      {productoParaPesar && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-[#8B5A2B] mb-1">Ingresar Peso</h3>
            <p className="text-gray-600 mb-4 font-medium text-lg">{productoParaPesar.nombre}</p>
            
            <form onSubmit={confirmarPeso}>
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Tamaños frecuentes:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setPesoGramos('250')} className="bg-[#FFF0C2] text-[#8B5A2B] border border-[#FFB800] hover:bg-[#FFB800] hover:text-white font-bold py-2 rounded-lg transition-colors text-sm">250g</button>
                  <button type="button" onClick={() => setPesoGramos('500')} className="bg-[#FFF0C2] text-[#8B5A2B] border border-[#FFB800] hover:bg-[#FFB800] hover:text-white font-bold py-2 rounded-lg transition-colors text-sm">500g</button>
                  <button type="button" onClick={() => setPesoGramos('1000')} className="bg-[#FFF0C2] text-[#8B5A2B] border border-[#FFB800] hover:bg-[#FFB800] hover:text-white font-bold py-2 rounded-lg transition-colors text-sm">1 Kg</button>
                </div>
              </div>

              <label className="block text-sm font-bold text-gray-700 mb-2">Peso personalizado (gramos):</label>
              <div className="relative mb-6">
                <input type="number" autoFocus required min="1" value={pesoGramos} onChange={(e) => setPesoGramos(e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-gray-50 border-2 border-gray-300 focus:border-[#FFB800] rounded-xl px-4 py-3 text-2xl font-black text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="Ej: 350" />
                <span className="absolute right-4 top-4 text-gray-400 font-bold text-lg">gr</span>
              </div>
              
              <div className="flex gap-3">
                <button type="button" onClick={() => { setProductoParaPesar(null); setPesoGramos(''); }} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-colors cursor-pointer">Cancelar</button>
                <button type="submit" className="flex-1 bg-[#2E7D32] hover:bg-green-800 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer shadow-md">Agregar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="w-full lg:w-2/3 bg-white rounded-xl shadow-md border-2 border-[#FFF0C2] p-4 flex flex-col lg:h-[calc(100vh-140px)] min-h-[500px]">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-100 gap-4">
          <h2 className="text-[#8B5A2B] text-2xl font-bold whitespace-nowrap">Productos - {sucursal}</h2>
          <div className="relative w-full sm:w-1/2 md:w-2/3 lg:w-1/2">
            <input type="text" placeholder="Buscar por código o nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-[#FFB800] focus:bg-white focus:outline-none transition-colors text-gray-700 shadow-inner" />
          </div>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto pr-2 pb-4">
          {cargando ? (
            <div className="py-10 text-center text-gray-500 font-bold text-lg animate-pulse">Cargando inventario...</div>
          ) : productosFiltrados.length > 0 ? (
            productosFiltrados.map((producto) => (
              <div key={producto._id} className="w-full bg-gray-50 border-2 border-gray-200 hover:border-[#FFB800] rounded-xl p-3 flex items-center justify-between transition-all shadow-sm hover:shadow-md group">
                <div onClick={() => manejarClickProducto(producto)} className="flex items-center gap-3 sm:gap-4 flex-1 cursor-pointer">
                  <span className="bg-gray-200 text-gray-600 text-xs sm:text-sm font-bold px-2 py-1 rounded-md min-w-[45px] text-center">#{producto.codigo}</span>
                  <div className="w-10 h-10 bg-[#FFF0C2] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">{producto.tipoVenta === 'Unidad' ? '' : ''}</span>
                  </div>
                  <span className="font-bold text-gray-700 text-left text-sm sm:text-lg">{producto.nombre}</span>
                </div>
                
                <div className="flex items-center gap-3 sm:gap-4">
                  <span onClick={() => manejarClickProducto(producto)} className="text-[#2E7D32] font-black text-lg sm:text-xl cursor-pointer">
                    ₡{producto.precioVenta.toLocaleString()} <span className="text-sm font-medium text-gray-500">
                      {producto.tipoVenta === 'Unidad' ? '/ und' : '/ kg'}
                    </span>
                  </span>
                  
                  {/* BOTÓN BASURERO QUE ABRE LA NUEVA VENTANA */}
                  <button 
                    onClick={(e) => confirmarEliminacion(e, producto)}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                    title="Eliminar del sistema"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-gray-400 font-bold text-lg">No se encontraron productos.</div>
          )}
        </div>
      </section>

      <aside className="w-full lg:w-1/3 bg-white rounded-xl shadow-md border-2 border-[#FFF0C2] p-4 flex flex-col lg:h-[calc(100vh-140px)] min-h-[400px]">
        <h2 className="text-[#8B5A2B] text-2xl font-bold mb-4 border-b border-gray-100 pb-2">Ticket de Venta</h2>
        
        <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg border border-gray-200 p-2 mb-4">
          {carrito.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 font-medium">El carrito está vacío</div>
          ) : (
            <ul className="space-y-2">
              {carrito.map((item) => (
                <li key={item._id} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 shadow-sm">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-700 text-sm">{item.nombre}</span>
                    <span className="text-gray-500 text-xs">
                      {item.tipoVenta === 'Unidad' 
                        ? `${item.cantidad} und x ₡${item.precioVenta.toLocaleString()}` 
                        : `${item.cantidad.toFixed(3)} kg x ₡${item.precioVenta.toLocaleString()}`
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="font-black text-[#4A2511]">₡{Math.round(item.precioVenta * item.cantidad).toLocaleString()}</span>
                    <button onClick={() => eliminarDelCarrito(item._id)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors cursor-pointer" title="Quitar del carrito">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {carrito.length > 0 && (
          <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <label className="block text-[#4A2511] font-bold mb-2 text-sm">Método de Pago</label>
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-[#FFB800] focus:outline-none text-gray-700 font-medium shadow-sm cursor-pointer">
              <option value="Efectivo">Efectivo</option>
              <option value="SINPE">SINPE Móvil</option>
              <option value="Datáfono">Datáfono (Tarjeta)</option>
            </select>
          </div>
        )}

        <div className="bg-[#FFF0C2] rounded-lg p-4 mb-4 flex justify-between items-center border border-[#FFB800]">
          <span className="text-[#8B5A2B] font-bold text-xl">Total:</span>
          <span className="text-[#2E7D32] font-black text-2xl sm:text-3xl">₡{Math.round(totalVenta).toLocaleString()}</span>
        </div>

        <button onClick={procesarVenta} disabled={carrito.length === 0 || procesando} className={`font-bold py-4 px-4 rounded-xl shadow-lg transition-all text-xl w-full active:scale-95 flex justify-center items-center gap-2 ${carrito.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : procesando ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-[#2E7D32] hover:bg-green-800 text-white cursor-pointer'}`}>
          {procesando ? <span className="animate-pulse">Procesando...</span> : <>Cobrar Venta</>}
        </button>
      </aside>
    </div>
  );
}

export default CajaPOS;
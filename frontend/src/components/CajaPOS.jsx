import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

function CajaPOS({ sucursal, usuario }) {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [cargando, setCargando] = useState(true);
  
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [procesando, setProcesando] = useState(false);

  // Estados para peso y precio redondeado
  const [productoParaPesar, setProductoParaPesar] = useState(null);
  const [pesoGramos, setPesoGramos] = useState('');
  const [precioCobrar, setPrecioCobrar] = useState('');

  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: '' });
  const [productoAEliminar, setProductoAEliminar] = useState(null);

  // Estados para editar producto (lápiz)
  const [productoAEditar, setProductoAEditar] = useState(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const [precioCostoEdit, setPrecioCostoEdit] = useState('');
  const [precioVentaEdit, setPrecioVentaEdit] = useState('');
  const [stockEdit, setStockEdit] = useState('');
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  // Referencias para foco
  const inputBusquedaRef = useRef(null);
  const inputPesoRef = useRef(null);

  // Carga el catálogo y combina el stock de la sucursal actual
  useEffect(() => {
    const obtenerProductosEInventario = async () => {
      setCargando(true);
      try {
        // 1. Obtener lista de productos
        const { data: prods, error: errProds } = await supabase
          .from('productos')
          .select('*')
          .order('codigo', { ascending: true });

        // 2. Obtener inventario de la sucursal activa
        const { data: inv, error: errInv } = await supabase
          .from('inventario_sucursal')
          .select('producto_id, stock')
          .eq('sucursal', sucursal);

        if (prods) {
          const mapaStock = {};
          if (inv) {
            inv.forEach((item) => {
              mapaStock[item.producto_id] = item.stock;
            });
          }

          // Asignar el stock que corresponde a esta sucursal
          const prodsConStock = prods.map((p) => ({
            ...p,
            stock: p.tipoVenta === 'Unidad' ? (mapaStock[p._id] ?? 0) : null
          }));

          setProductos(prodsConStock);
        }
      } catch (error) {
        console.error("Error al obtener los productos:", error);
      } finally {
        setCargando(false);
      }
    };
    obtenerProductosEInventario();
  }, [sucursal]);

  useEffect(() => {
    if (!productoParaPesar && !productoAEliminar && !productoAEditar && inputBusquedaRef.current) {
      inputBusquedaRef.current.focus();
    }
  }, [productoParaPesar, productoAEliminar, productoAEditar]);

  useEffect(() => {
    const manejarAtajoGlobal = (e) => {
      if (e.key === 'Shift') {
        if (carrito.length > 0 && !procesando) {
          e.preventDefault();
          procesarVenta();
        }
      }
    };
    window.addEventListener('keydown', manejarAtajoGlobal);
    return () => window.removeEventListener('keydown', manejarAtajoGlobal);
  }, [carrito, procesando]);

  const mostrarNotificacion = (mensaje, tipo) => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => { setNotificacion({ visible: false, mensaje: '', tipo: '' }); }, 3000);
  };

  const manejarClickProducto = (producto, cant = cantidad) => {
    const cantidadASumar = Math.max(1, parseInt(cant, 10) || 1);

    if (producto.tipoVenta === 'Unidad') {
      const itemExistente = carrito.find((item) => item._id === producto._id);
      const cantidadEnCarrito = itemExistente ? itemExistente.cantidad : 0;
      const totalFinal = cantidadEnCarrito + cantidadASumar;

      if ((producto.stock || 0) < totalFinal) {
        mostrarNotificacion(`¡Aviso: Stock insuficiente en ${sucursal} para ${producto.nombre}! (Disponible: ${producto.stock || 0})`, 'error');
      }

      if (itemExistente) {
        setCarrito(carrito.map((item) => 
          item._id === producto._id 
            ? { ...item, cantidad: totalFinal, subtotal: totalFinal * item.precioVenta } 
            : item
        ));
      } else {
        setCarrito([...carrito, { ...producto, cantidad: cantidadASumar, subtotal: cantidadASumar * producto.precioVenta }]);
      }
      setBusqueda('');
      setCantidad(1);
      if (inputBusquedaRef.current) inputBusquedaRef.current.focus();
    } else {
      setProductoParaPesar(producto);
      setPesoGramos('');
      setPrecioCobrar('');
    }
  };

  const manejarKeyDownBusqueda = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const texto = busqueda.trim();
      if (!texto) return;

      let cant = cantidad;
      let textoLimpio = texto;

      if (texto.includes('*')) {
        const partes = texto.split('*');
        const multiplicador = parseInt(partes[0], 10);
        if (!isNaN(multiplicador) && multiplicador > 0) {
          cant = multiplicador;
          textoLimpio = partes.slice(1).join('*').trim();
        }
      }

      const productoPorCodigo = productos.find(
        (p) => p.codigo === textoLimpio || parseInt(p.codigo, 10) === parseInt(textoLimpio, 10)
      );

      if (productoPorCodigo) {
        manejarClickProducto(productoPorCodigo, cant);
        return;
      }

      const filtrados = productos.filter((p) => 
        p.nombre.toLowerCase().includes(textoLimpio.toLowerCase()) || 
        p.codigo.includes(textoLimpio)
      );

      if (filtrados.length === 1) {
        manejarClickProducto(filtrados[0], cant);
      }
    }
  };

  const modificarCantidadCarrito = (itemCartId, delta) => {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if ((item.cartId || item._id) === itemCartId && item.tipoVenta === 'Unidad') {
            const nuevaCantidad = item.cantidad + delta;
            if (nuevaCantidad <= 0) return null;
            if (delta > 0 && (item.stock || 0) < nuevaCantidad) {
              mostrarNotificacion(`¡Aviso: No queda más stock en ${sucursal} de ${item.nombre}!`, 'error');
            }
            return {
              ...item,
              cantidad: nuevaCantidad,
              subtotal: nuevaCantidad * item.precioVenta
            };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const actualizarCantidadDirecta = (itemCartId, valor) => {
    const nuevaCant = parseInt(valor, 10);
    if (isNaN(nuevaCant) || nuevaCant <= 0) return;
    setCarrito((prev) =>
      prev.map((item) => {
        if ((item.cartId || item._id) === itemCartId && item.tipoVenta === 'Unidad') {
          if ((item.stock || 0) < nuevaCant) {
            mostrarNotificacion(`¡Aviso: Stock en ${sucursal} de ${item.nombre}: ${item.stock || 0}!`, 'error');
          }
          return {
            ...item,
            cantidad: nuevaCant,
            subtotal: nuevaCant * item.precioVenta
          };
        }
        return item;
      })
    );
  };

  const manejarCambioGramos = (valor) => {
    setPesoGramos(valor);
    const gr = parseFloat(valor);
    if (!isNaN(gr) && gr > 0 && productoParaPesar) {
      const sugerido = Math.round((gr / 1000) * productoParaPesar.precioVenta);
      setPrecioCobrar(String(sugerido));
    } else {
      setPrecioCobrar('');
    }
  };

  const confirmarPeso = (e) => {
    e.preventDefault();
    const kilos = parseFloat(pesoGramos) / 1000;
    if (isNaN(kilos) || kilos <= 0) return;

    const montoCalculado = Math.round(kilos * productoParaPesar.precioVenta);
    const montoFinal = precioCobrar !== '' && !isNaN(Number(precioCobrar))
      ? Number(precioCobrar)
      : montoCalculado;

    const precioVentaEfectivo = kilos > 0 ? (montoFinal / kilos) : productoParaPesar.precioVenta;

    const nuevoItem = {
      ...productoParaPesar,
      cartId: Date.now() + Math.random(),
      cantidad: kilos,
      precioVenta: precioVentaEfectivo,
      subtotal: montoFinal,
      precioOriginalPorKg: productoParaPesar.precioVenta
    };

    setCarrito([...carrito, nuevoItem]);
    setProductoParaPesar(null);
    setPesoGramos('');
    setPrecioCobrar('');
    setBusqueda('');
  };

  const manejarKeyDownPeso = (e) => {
    if (e.key === 'Escape') {
      setProductoParaPesar(null);
      setPesoGramos('');
      setPrecioCobrar('');
    }
  };

  // --- EDICIÓN DE PRODUCTO Y STOCK POR SUCURSAL ---
  const abrirEdicion = (e, producto) => {
    e.stopPropagation();
    setProductoAEditar(producto);
    setNombreEdit(producto.nombre);
    setPrecioCostoEdit(producto.precioCosto);
    setPrecioVentaEdit(producto.precioVenta);
    setStockEdit(producto.stock !== undefined && producto.stock !== null ? producto.stock : 0);
  };

  const guardarEdicionBD = async (e) => {
    e.preventDefault();
    if (!productoAEditar) return;
    setGuardandoEdit(true);

    try {
      // 1. Actualizar datos generales del producto
      const camposActualizar = {
        nombre: nombreEdit.trim(),
        precioCosto: Number(precioCostoEdit),
        precioVenta: Number(precioVentaEdit)
      };

      const { error: errProd } = await supabase
        .from('productos')
        .update(camposActualizar)
        .eq('_id', productoAEditar._id);

      if (errProd) throw errProd;

      // 2. Si es por unidad, actualizar o insertar stock en inventario_sucursal para esta sucursal
      const stockNumero = parseInt(stockEdit, 10) || 0;
      if (productoAEditar.tipoVenta === 'Unidad') {
        const { error: errInv } = await supabase
          .from('inventario_sucursal')
          .upsert(
            {
              producto_id: productoAEditar._id,
              sucursal: sucursal,
              stock: stockNumero
            },
            { onConflict: 'producto_id, sucursal' }
          );

        if (errInv) throw errInv;
      }

      // 3. Actualizar estado local
      setProductos(productos.map((p) => 
        p._id === productoAEditar._id 
          ? { 
              ...p, 
              ...camposActualizar, 
              stock: p.tipoVenta === 'Unidad' ? stockNumero : null 
            } 
          : p
      ));

      mostrarNotificacion('¡Producto actualizado con éxito!', 'exito');
      setProductoAEditar(null);
    } catch (err) {
      console.error(err);
      mostrarNotificacion('Error al actualizar el producto', 'error');
    } finally {
      setGuardandoEdit(false);
    }
  };

  const confirmarEliminacion = (e, producto) => {
    e.stopPropagation(); 
    setProductoAEliminar(producto);
  };

  const ejecutarEliminacionBD = async () => {
    if (!productoAEliminar) return;
    try {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('_id', productoAEliminar._id);

      if (!error) {
        setProductos(productos.filter((p) => p._id !== productoAEliminar._id));
        mostrarNotificacion('Producto eliminado permanentemente', 'exito');
      } else {
        mostrarNotificacion('Error al eliminar el producto', 'error');
      }
    } catch (error) {
      mostrarNotificacion('Error de conexión', 'error');
    } finally {
      setProductoAEliminar(null);
    }
  };

  const eliminarDelCarrito = (itemCartId) => {
    setCarrito(carrito.filter((item) => (item.cartId || item._id) !== itemCartId));
  };

  const totalVenta = carrito.reduce((suma, item) => suma + (item.subtotal !== undefined ? item.subtotal : (item.precioVenta * item.cantidad)), 0);
  const totalCosto = carrito.reduce((suma, item) => suma + (item.precioCosto * item.cantidad), 0);

  const productosFiltrados = productos.filter((producto) => 
    producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    producto.codigo.includes(busqueda)
  );

  // --- PROCESAR VENTA DESCONTANDO DE LA SUCURSAL ACTUAL ---
  const procesarVenta = async () => {
    setProcesando(true);
    try {
      const productosVenta = carrito.map((item) => ({
        productoId: item._id,
        nombre: item.nombre,
        cantidad: item.cantidad, 
        precioVenta: item.subtotal !== undefined ? Math.round(item.subtotal) : item.precioVenta,
        precioCosto: item.precioCosto
      }));

      const datosVenta = {
        sucursal: sucursal,
        cajero: usuario || 'Cajero General',
        productos: productosVenta,
        totalVenta: Math.round(totalVenta),
        totalCosto: Math.round(totalCosto),
        metodoPago: metodoPago
      };

      const { error: errorVenta } = await supabase
        .from('ventas')
        .insert([datosVenta]);

      if (!errorVenta) {
        // Descontar inventario únicamente para la sucursal actual
        for (const item of carrito) {
          if (item.tipoVenta === 'Unidad') {
            await supabase.rpc('descontar_stock', {
              p_producto_id: item._id,
              p_sucursal: sucursal, // 👈 Se envía la sucursal
              p_cantidad: item.cantidad
            });
          }
        }

        // Actualizar visualmente el stock de la sucursal
        setProductos((prev) =>
          prev.map((p) => {
            if (p.tipoVenta === 'Unidad') {
              const itemVendido = carrito.find((c) => c._id === p._id);
              if (itemVendido) {
                return { ...p, stock: Math.max(0, (p.stock || 0) - itemVendido.cantidad) };
              }
            }
            return p;
          })
        );

        mostrarNotificacion('¡Venta registrada e inventario actualizado!', 'exito');
        setCarrito([]); 
        setMetodoPago('Efectivo'); 
        setCantidad(1);
        if (inputBusquedaRef.current) inputBusquedaRef.current.focus();
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
      {notificacion.visible && (
        <div className={`fixed bottom-5 right-5 sm:bottom-10 sm:right-10 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 transition-all text-white font-bold text-lg
          ${notificacion.tipo === 'exito' ? 'bg-[#2E7D32]' : 'bg-red-600'}`}>
          {notificacion.mensaje}
        </div>
      )}

      {/* --- MODAL PARA EDITAR PRODUCTO (LÁPIZ) --- */}
      {productoAEditar && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border-2 border-[#FFF0C2]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <h3 className="text-xl font-bold text-[#8B5A2B]">Editar Producto</h3>
              <span className="bg-[#FFF0C2] text-[#8B5A2B] font-black px-2.5 py-1 rounded-md text-sm border border-[#FFB800]">
                #{productoAEditar.codigo}
              </span>
            </div>

            <form onSubmit={guardarEdicionBD} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Producto</label>
                <input 
                  type="text" 
                  required 
                  value={nombreEdit} 
                  onChange={(e) => setNombreEdit(e.target.value)} 
                  className="w-full bg-gray-50 border-2 border-gray-200 focus:border-[#FFB800] focus:bg-white focus:outline-none rounded-xl px-3 py-2.5 font-bold text-gray-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Costo (₡)</label>
                  <input 
                    type="number" 
                    required 
                    value={precioCostoEdit} 
                    onChange={(e) => setPrecioCostoEdit(e.target.value)} 
                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-[#8B5A2B] focus:bg-white focus:outline-none rounded-xl px-3 py-2.5 font-bold text-gray-800"
                  />
                  <span className="text-[11px] text-gray-400">Por {productoAEditar.tipoVenta === 'Peso' ? 'Kilo' : 'Unidad'}</span>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Venta (₡)</label>
                  <input 
                    type="number" 
                    required 
                    value={precioVentaEdit} 
                    onChange={(e) => setPrecioVentaEdit(e.target.value)} 
                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-[#2E7D32] focus:bg-white focus:outline-none rounded-xl px-3 py-2.5 font-bold text-[#2E7D32]"
                  />
                  <span className="text-[11px] text-gray-400">Por {productoAEditar.tipoVenta === 'Peso' ? 'Kilo' : 'Unidad'}</span>
                </div>
              </div>

              {productoAEditar.tipoVenta === 'Unidad' && (
                <div className="bg-[#FFF9E6] p-3 rounded-xl border border-[#FFE082]">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-bold text-[#8B5A2B]">Stock en {sucursal}</label>
                    <span className="text-xs bg-[#FFB800] text-white font-bold px-2 py-0.5 rounded">Sucursal Actual</span>
                  </div>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    value={stockEdit} 
                    onChange={(e) => setStockEdit(e.target.value)} 
                    className="w-full bg-white border-2 border-[#FFB800] focus:outline-none rounded-xl px-3 py-2 font-black text-gray-800"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setProductoAEditar(null)} 
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={guardandoEdit}
                  className={`flex-1 bg-[#8B5A2B] hover:bg-[#4A2511] text-white font-bold py-3 rounded-xl transition-colors shadow-md cursor-pointer ${guardandoEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {guardandoEdit ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL PARA CONFIRMAR ELIMINACIÓN --- */}
      {productoAEliminar && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
              <button type="button" onClick={() => setProductoAEliminar(null)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-colors cursor-pointer">
                Cancelar
              </button>
              <button type="button" onClick={ejecutarEliminacionBD} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer shadow-md">
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE PESO (CON REDONDEO) --- */}
      {productoParaPesar && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onKeyDown={manejarKeyDownPeso}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border-2 border-[#FFF0C2]">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xl font-bold text-[#8B5A2B]">Ingresar Peso</h3>
              <span className="text-xs font-bold text-gray-500">₡{productoParaPesar.precioVenta.toLocaleString()}/kg</span>
            </div>
            <p className="text-gray-700 mb-4 font-bold text-lg">{productoParaPesar.nombre}</p>
            
            <form onSubmit={confirmarPeso}>
              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Tamaños frecuentes:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => manejarCambioGramos('250')} className="bg-[#FFF0C2] text-[#8B5A2B] border border-[#FFB800] hover:bg-[#FFB800] hover:text-white font-bold py-1.5 rounded-lg transition-colors text-xs cursor-pointer">250g</button>
                  <button type="button" onClick={() => manejarCambioGramos('500')} className="bg-[#FFF0C2] text-[#8B5A2B] border border-[#FFB800] hover:bg-[#FFB800] hover:text-white font-bold py-1.5 rounded-lg transition-colors text-xs cursor-pointer">500g</button>
                  <button type="button" onClick={() => manejarCambioGramos('1000')} className="bg-[#FFF0C2] text-[#8B5A2B] border border-[#FFB800] hover:bg-[#FFB800] hover:text-white font-bold py-1.5 rounded-lg transition-colors text-xs cursor-pointer">1 Kg</button>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-700 mb-1">1. Peso en gramos:</label>
                <div className="relative">
                  <input 
                    type="number" 
                    ref={inputPesoRef}
                    autoFocus 
                    required 
                    min="1" 
                    value={pesoGramos} 
                    onChange={(e) => manejarCambioGramos(e.target.value)} 
                    onWheel={(e) => e.currentTarget.blur()} 
                    className="w-full bg-gray-50 border-2 border-gray-300 focus:border-[#FFB800] rounded-xl px-4 py-2.5 text-xl font-black text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    placeholder="Ej: 300" 
                  />
                  <span className="absolute right-4 top-3 text-gray-400 font-bold text-sm">gr</span>
                </div>
              </div>

              <div className="mb-4 bg-[#FFF9E6] p-3 rounded-xl border border-[#FFE082]">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-[#8B5A2B]">2. Monto a cobrar (Editable):</label>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-[#2E7D32] font-black text-lg">₡</span>
                  <input 
                    type="number" 
                    required 
                    min="1" 
                    value={precioCobrar} 
                    onChange={(e) => setPrecioCobrar(e.target.value)} 
                    onWheel={(e) => e.currentTarget.blur()} 
                    className="w-full bg-white border-2 border-[#2E7D32] rounded-xl pl-8 pr-4 py-2 text-2xl font-black text-center text-[#2E7D32] focus:outline-none shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    placeholder="0" 
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1 text-center font-medium">
                  Monto final para cobrar cifras exactas.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button type="button" onClick={() => { setProductoParaPesar(null); setPesoGramos(''); setPrecioCobrar(''); }} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-colors cursor-pointer text-sm">
                  Cancelar (Esc)
                </button>
                <button type="submit" className="flex-1 bg-[#2E7D32] hover:bg-green-800 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer shadow-md text-base">
                  Agregar ↵
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SECCIÓN PRODUCTOS --- */}
      <section className="w-full lg:w-2/3 bg-white rounded-xl shadow-md border-2 border-[#FFF0C2] p-4 flex flex-col lg:h-[calc(100vh-140px)] min-h-[500px]">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-100 gap-4">
          <h2 className="text-[#8B5A2B] text-2xl font-bold whitespace-nowrap">Caja - {sucursal}</h2>
          
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 justify-end">
            <div className="flex items-center bg-gray-50 border-2 border-gray-200 rounded-xl px-2.5 py-1.5 shadow-inner">
              <label className="text-xs font-bold text-gray-500 mr-1.5">Cant:</label>
              <input
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-12 text-center bg-white border border-gray-300 rounded-lg text-sm font-bold py-1 focus:outline-none focus:border-[#FFB800] text-gray-800"
              />
            </div>

            <div className="relative flex-1 sm:w-64 md:w-80">
              <input 
                type="text" 
                ref={inputBusquedaRef}
                placeholder="Código o nombre (ej: 5*código)..." 
                value={busqueda} 
                onChange={(e) => setBusqueda(e.target.value)} 
                onKeyDown={manejarKeyDownBusqueda}
                className="w-full pl-4 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-[#FFB800] focus:bg-white focus:outline-none transition-colors text-gray-700 shadow-inner text-base font-medium" 
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto pr-2 pb-4">
          {cargando ? (
            <div className="py-10 text-center text-gray-500 font-bold text-lg animate-pulse">Cargando catálogo...</div>
          ) : productosFiltrados.length > 0 ? (
            productosFiltrados.map((producto) => (
              <div key={producto._id} className="w-full bg-gray-50 border-2 border-gray-200 hover:border-[#FFB800] rounded-xl p-3 flex items-center justify-between transition-all shadow-sm hover:shadow-md group">
                <div onClick={() => manejarClickProducto(producto)} className="flex items-center gap-3 sm:gap-4 flex-1 cursor-pointer">
                  <span className="bg-[#FFF0C2] text-[#8B5A2B] border border-[#FFB800] text-xs sm:text-sm font-black px-2.5 py-1 rounded-md min-w-[45px] text-center">
                    #{producto.codigo}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-700 text-left text-sm sm:text-lg">{producto.nombre}</span>
                    {producto.tipoVenta === 'Unidad' && (
                      <span className={`text-[11px] font-bold text-left ${producto.stock > 0 ? 'text-[#2E7D32]' : 'text-red-500 animate-pulse'}`}>
                        {producto.stock > 0 ? `Stock en ${sucursal}: ${producto.stock} und` : `Agotado en ${sucursal} (0 und)`}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3">
                  <span onClick={() => manejarClickProducto(producto)} className="text-[#2E7D32] font-black text-lg sm:text-xl cursor-pointer mr-1">
                    ₡{producto.precioVenta.toLocaleString()} <span className="text-sm font-medium text-gray-500">
                      {producto.tipoVenta === 'Unidad' ? '/ und' : '/ kg'}
                    </span>
                  </span>
                  
                  {/* BOTÓN LÁPIZ (EDITAR) */}
                  <button 
                    onClick={(e) => abrirEdicion(e, producto)}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                    title={`Editar producto o stock de ${sucursal}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>

                  {/* BOTÓN BASURERO (ELIMINAR) */}
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

      {/* --- PANEL DE TICKET / COBRO --- */}
      <aside className="w-full lg:w-1/3 bg-white rounded-xl shadow-md border-2 border-[#FFF0C2] p-4 flex flex-col lg:h-[calc(100vh-140px)] min-h-[400px]">
        <h2 className="text-[#8B5A2B] text-2xl font-bold mb-4 border-b border-gray-100 pb-2">Ticket de Venta ({sucursal})</h2>
        
        <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg border border-gray-200 p-2 mb-4">
          {carrito.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 font-medium">El carrito está vacío</div>
          ) : (
            <ul className="space-y-2">
              {carrito.map((item) => (
                <li key={item.cartId || item._id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-700 text-sm">{item.nombre}</span>
                    
                    {item.tipoVenta === 'Unidad' ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <button 
                          type="button" 
                          onClick={() => modificarCantidadCarrito(item.cartId || item._id, -1)}
                          className="w-5 h-5 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-bold text-xs cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => actualizarCantidadDirecta(item.cartId || item._id, e.target.value)}
                          className="w-10 text-center border border-gray-300 rounded text-xs font-bold py-0.5 focus:outline-none focus:border-[#FFB800] text-gray-800"
                        />
                        <button 
                          type="button" 
                          onClick={() => modificarCantidadCarrito(item.cartId || item._id, 1)}
                          className="w-5 h-5 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-bold text-xs cursor-pointer"
                        >
                          +
                        </button>
                        <span className="text-gray-500 text-xs ml-1">x ₡{item.precioVenta.toLocaleString()}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-xs">
                        {`${item.cantidad.toFixed(3)} kg (Cobrado: ₡${Math.round(item.subtotal).toLocaleString()})`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="font-black text-[#4A2511] text-base">
                      ₡{Math.round(item.subtotal !== undefined ? item.subtotal : (item.precioVenta * item.cantidad)).toLocaleString()}
                    </span>
                    <button onClick={() => eliminarDelCarrito(item.cartId || item._id)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors cursor-pointer" title="Quitar del carrito">
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
          {procesando ? <span className="animate-pulse">Procesando...</span> : <>Cobrar Venta (Shift)</>}
        </button>
      </aside>
    </div>
  );
}

export default CajaPOS;
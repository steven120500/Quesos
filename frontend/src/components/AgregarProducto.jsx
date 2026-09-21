import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function AgregarProducto({ sucursal }) {
  const [nombre, setNombre] = useState('');
  const [precioCosto, setPrecioCosto] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [tipoVenta, setTipoVenta] = useState('Peso');
  const [stock, setStock] = useState(''); // 👈 NUEVO: Stock para productos por unidad
  
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' }); 
  const [cargando, setCargando] = useState(false); 
  const [codigoEstimado, setCodigoEstimado] = useState('...');

  const refrescarCodigoPreview = async () => {
    try {
      const { data } = await supabase.from('productos').select('codigo');
      const numeros = (data || []).map(p => parseInt(p.codigo, 10)).filter(n => !isNaN(n));
      const siguiente = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
      setCodigoEstimado(String(siguiente).padStart(3, '0'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refrescarCodigoPreview();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setCargando(true); 

    try {
      let guardado = false;
      let intentos = 0;
      let codigoAsignado = '';

      while (!guardado && intentos < 3) {
        intentos++;

        const { data: productosActuales } = await supabase
          .from('productos')
          .select('codigo');

        const numeros = (productosActuales || [])
          .map(p => parseInt(p.codigo, 10))
          .filter(n => !isNaN(n));

        const siguienteNumero = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
        codigoAsignado = String(siguienteNumero).padStart(3, '0');

        const { error } = await supabase
          .from('productos')
          .insert([{
            codigo: codigoAsignado,
            nombre: nombre.trim(),
            precioCosto: Number(precioCosto),
            precioVenta: Number(precioVenta),
            sucursal: 'General',
            tipoVenta: tipoVenta,
            stock: tipoVenta === 'Unidad' ? (parseInt(stock, 10) || 0) : 0 // 👈 Guarda el stock solo si es Unidad
          }]);

        if (!error) {
          guardado = true;
        }
      }

      if (guardado) {
        setMensaje({ 
          texto: `¡Producto #${codigoAsignado} - "${nombre}" guardado con éxito!`, 
          tipo: 'exito' 
        });
        setNombre('');
        setPrecioCosto('');
        setPrecioVenta('');
        setTipoVenta('Peso');
        setStock('');
        refrescarCodigoPreview();
      } else {
        setMensaje({ texto: 'Error al registrar el producto. Inténtalo de nuevo.', tipo: 'error' });
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      setMensaje({ texto: 'Error de conexión con la base de datos.', tipo: 'error' });
    } finally {
      setCargando(false); 
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-[#FFF0C2] p-8 max-w-2xl mx-auto mt-4">
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-[#8B5A2B] text-2xl font-bold">Crear Nuevo Producto</h2>
          <p className="text-gray-500 font-medium">
            Catálogo: <span className="text-[#2E7D32] font-bold">Compartido (Sarchí y Mercado)</span>
          </p>
        </div>
      </div>

      {mensaje.texto && (
        <div className={`border-l-4 p-4 rounded mb-6 flex items-center gap-3 font-bold
          ${mensaje.tipo === 'exito' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-red-100 border-red-500 text-red-700'}`}>
          <span>{mensaje.texto}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <label className="block text-[#4A2511] font-bold mb-3 text-lg">¿Cómo se vende este producto?</label>
          <div className="flex gap-4">
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${tipoVenta === 'Peso' ? 'border-[#8B5A2B] bg-[#FFF0C2] text-[#8B5A2B]' : 'border-gray-200 bg-white text-gray-500'}`}>
              <input type="radio" name="tipoVenta" value="Peso" checked={tipoVenta === 'Peso'} onChange={(e) => setTipoVenta(e.target.value)} className="hidden" />
              <span className="font-bold">Por Peso (Gramos)</span>
            </label>
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${tipoVenta === 'Unidad' ? 'border-[#8B5A2B] bg-[#FFF0C2] text-[#8B5A2B]' : 'border-gray-200 bg-white text-gray-500'}`}>
              <input type="radio" name="tipoVenta" value="Unidad" checked={tipoVenta === 'Unidad'} onChange={(e) => setTipoVenta(e.target.value)} className="hidden" />
              <span className="font-bold">Por Unidad Entera</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <label className="block text-[#4A2511] font-bold mb-2 text-lg">Código</label>
            <input 
              type="text" 
              disabled 
              value={`#${codigoEstimado}`} 
              className="w-full bg-gray-200 border-2 border-gray-300 text-[#8B5A2B] font-black rounded-xl px-4 py-4 text-center text-xl cursor-not-allowed shadow-inner transition-all" 
              title="El código correlativo final se confirma automáticamente al guardar"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-[#4A2511] font-bold mb-2 text-lg">Nombre del Producto</label>
            <input 
              type="text" 
              required 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-[#FFB800] focus:bg-white focus:outline-none rounded-xl px-4 py-4 transition-colors text-lg shadow-inner" 
              placeholder={tipoVenta === 'Peso' ? "Ej. Queso Maduro Ahumado" : "Ej. Natilla 500g"} 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[#4A2511] font-bold mb-2 text-lg">Precio de Costo (₡)</label>
            <input 
              type="number" 
              required 
              value={precioCosto} 
              onChange={(e) => setPrecioCosto(e.target.value)} 
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-[#8B5A2B] focus:bg-white focus:outline-none rounded-xl px-4 py-4 transition-colors text-lg shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
              placeholder="Ej. 3000" 
            />
            <p className="text-sm text-gray-500 mt-2 font-medium">Costo por {tipoVenta === 'Peso' ? '1 Kilo' : '1 Unidad'}.</p>
          </div>
          <div>
            <label className="block text-[#4A2511] font-bold mb-2 text-lg">Precio de Venta (₡)</label>
            <input 
              type="number" 
              required 
              value={precioVenta} 
              onChange={(e) => setPrecioVenta(e.target.value)} 
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-[#2E7D32] focus:bg-white focus:outline-none rounded-xl px-4 py-4 transition-colors text-lg shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
              placeholder="Ej. 4500" 
            />
            <p className="text-sm text-gray-500 mt-2 font-medium">Precio final por {tipoVenta === 'Peso' ? '1 Kilo' : '1 Unidad'}.</p>
          </div>
        </div>

        {/* 👈 NUEVO: Campo de Stock que solo aparece cuando se vende por Unidad */}
        {tipoVenta === 'Unidad' && (
          <div className="bg-[#FFF9E6] p-4 rounded-xl border border-[#FFE082] animate-fadeIn">
            <label className="block text-[#8B5A2B] font-bold mb-1 text-base">Cantidad en Inventario (Unidades iniciales)</label>
            <input 
              type="number" 
              required 
              min="0"
              value={stock} 
              onChange={(e) => setStock(e.target.value)} 
              className="w-full bg-white border-2 border-[#FFB800] focus:outline-none rounded-xl px-4 py-3 text-lg font-black text-gray-800 shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
              placeholder="Ej. 24" 
            />
            <p className="text-xs text-gray-500 mt-1.5 font-medium">
              Este número se irá descontando automáticamente en caja cada vez que se venda una unidad.
            </p>
          </div>
        )}

        <div className="pt-6 mt-6 border-t border-gray-100">
          <button 
            type="submit" 
            disabled={cargando} 
            className={`font-bold py-4 px-4 rounded-xl shadow-lg transition-colors text-xl w-full active:scale-95 flex justify-center items-center gap-3 ${cargando ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-[#8B5A2B] hover:bg-[#4A2511] text-white cursor-pointer'}`}
          >
            {cargando ? <span className="animate-pulse">Guardando en Base de Datos...</span> : <>Guardar Producto</>}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AgregarProducto;
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function AgregarProducto({ sucursal }) {
  const [nombre, setNombre] = useState('');
  const [precioCosto, setPrecioCosto] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [tipoVenta, setTipoVenta] = useState('Peso');
  
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' }); 
  const [cargando, setCargando] = useState(false); 

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setCargando(true); 
    
    // El código se envía como 'AUTO' para que Supabase le asigne el correlativo exacto
    const datosProducto = {
      codigo: 'AUTO',
      nombre: nombre.trim(),
      precioCosto: Number(precioCosto), 
      precioVenta: Number(precioVenta), 
      sucursal: 'General', // Queda disponible para Sarchí y Mercado simultáneamente
      tipoVenta: tipoVenta 
    };

    try {
      const { data, error } = await supabase
        .from('productos')
        .insert([datosProducto])
        .select()
        .single();

      if (!error && data) {
        const codigoAsignado = data.codigo || 'OK';
        setMensaje({ 
          texto: `¡Producto #${codigoAsignado} - "${nombre}" guardado para ambas sucursales!`, 
          tipo: 'exito' 
        });
        setNombre('');
        setPrecioCosto('');
        setPrecioVenta('');
        setTipoVenta('Peso');
      } else {
        setMensaje({ texto: 'Error al guardar el producto en la base de datos.', tipo: 'error' });
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
            <div className="w-full bg-gray-100 border-2 border-dashed border-gray-300 text-[#8B5A2B] font-black rounded-xl px-4 py-4 text-center text-lg shadow-inner flex items-center justify-center">
              AUTO
            </div>
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
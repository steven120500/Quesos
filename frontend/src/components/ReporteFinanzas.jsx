import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function ReporteFinanzas({ sucursal }) {
  // --- ESTADOS PARA FILTROS DE FECHA ---
  const hoy = new Date();
  const formatoMesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const formatoDiaActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  const [tipoFiltro, setTipoFiltro] = useState('dia'); // 'dia' o 'mes'
  const [fechaFiltro, setFechaFiltro] = useState(formatoDiaActual);
  const [mesFiltro, setMesFiltro] = useState(formatoMesActual);

  // --- ESTADOS DE DATOS Y UI ---
  const [ventasBD, setVentasBD] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: '' });
  const [ventaAEliminar, setVentaAEliminar] = useState(null);

  useEffect(() => {
    const obtenerVentas = async () => {
      setCargando(true);
      try {
        const respuesta = await fetch(`(https://backend-quesos.onrender.com/api/ventas/${sucursal}`);
        if (respuesta.ok) {
          const datos = await respuesta.json();
          setVentasBD(datos);
        }
      } catch (error) {
        console.error("Error al cargar finanzas:", error);
      } finally {
        setCargando(false);
      }
    };
    obtenerVentas();
  }, [sucursal]);

  const mostrarNotificacion = (mensaje, tipo) => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => { setNotificacion({ visible: false, mensaje: '', tipo: '' }); }, 3000);
  };

  // --- FUNCIÓN: ELIMINAR VENTA ---
  const ejecutarEliminacionBD = async () => {
    if (!ventaAEliminar) return;
    try {
      const respuesta = await fetch(`https://backend-quesos.onrender.com/api/ventas/${ventaAEliminar._id}`, {
        method: 'DELETE',
      });
      if (respuesta.ok) {
        // Actualizamos la pantalla sin recargar
        setVentasBD(ventasBD.filter((v) => v._id !== ventaAEliminar._id));
        mostrarNotificacion('🗑️ Venta anulada permanentemente', 'exito');
      } else {
        mostrarNotificacion('Error al anular la venta', 'error');
      }
    } catch (error) {
      mostrarNotificacion('Error de conexión', 'error');
    } finally {
      setVentaAEliminar(null);
    }
  };

  // --- FILTRO INTELIGENTE DE FECHAS ---
  const ventasFiltradas = ventasBD.filter(venta => {
    const fechaVenta = new Date(venta.createdAt);
    
    if (tipoFiltro === 'dia') {
      const [y, m, d] = fechaFiltro.split('-');
      return fechaVenta.getFullYear() === parseInt(y) &&
             fechaVenta.getMonth() === parseInt(m) - 1 &&
             fechaVenta.getDate() === parseInt(d);
    } else {
      const [y, m] = mesFiltro.split('-');
      return fechaVenta.getFullYear() === parseInt(y) &&
             fechaVenta.getMonth() === parseInt(m) - 1;
    }
  });

  // --- MATEMÁTICAS ---
  const ventasTotales = ventasFiltradas.reduce((suma, v) => suma + v.totalVenta, 0);
  const costosTotales = ventasFiltradas.reduce((suma, v) => suma + v.totalCosto, 0);
  const gananciaNeta = ventasTotales - costosTotales;
  const cantidadVentas = ventasFiltradas.length;

  // --- GENERADOR DE PDF ---
  const generarPDF = () => {
    const doc = new jsPDF();
    const titulo = tipoFiltro === 'dia' ? `Cierre de Caja - ${fechaFiltro}` : `Reporte Mensual - ${mesFiltro}`;
    const fechaImpresion = new Date().toLocaleString();

    const totalEfectivo = ventasFiltradas.filter(v => v.metodoPago === 'Efectivo').reduce((sum, v) => sum + v.totalVenta, 0);
    const totalSinpe = ventasFiltradas.filter(v => v.metodoPago === 'SINPE').reduce((sum, v) => sum + v.totalVenta, 0);
    const totalDatafono = ventasFiltradas.filter(v => v.metodoPago === 'Datáfono').reduce((sum, v) => sum + v.totalVenta, 0);

    doc.setFontSize(22);
    doc.setTextColor(139, 90, 43); 
    doc.setFont("helvetica", "bold");
    doc.text('Quesos El Carretón', 14, 20);
    
    doc.setFontSize(16);
    doc.setTextColor(74, 37, 17);
    doc.setFont("helvetica", "normal");
    doc.text(titulo, 14, 28);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Sucursal: ${sucursal}   |   Emitido: ${fechaImpresion}`, 14, 35);

    doc.setDrawColor(255, 184, 0); 
    doc.setFillColor(255, 240, 194); 
    doc.roundedRect(14, 42, 182, 45, 3, 3, 'FD'); 

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen General", 20, 50);
    doc.setFont("helvetica", "normal");
    doc.text(`Transacciones: ${cantidadVentas}`, 20, 58);
    doc.text(`Ingresos Brutos: CRC ${ventasTotales.toLocaleString()}`, 20, 66);
    doc.text(`Costos de Prod.: CRC ${costosTotales.toLocaleString()}`, 20, 74);
    
    doc.setFont("helvetica", "bold");
    doc.text("Desglose de Ingresos", 80, 50);
    doc.setFont("helvetica", "normal");
    doc.text(`Efectivo: CRC ${totalEfectivo.toLocaleString()}`, 80, 58);
    doc.text(`SINPE: CRC ${totalSinpe.toLocaleString()}`, 80, 66);
    doc.text(`Datáfono: CRC ${totalDatafono.toLocaleString()}`, 80, 74);

    doc.setFontSize(12);
    doc.setTextColor(46, 125, 50); 
    doc.setFont("helvetica", "bold");
    doc.text(`GANANCIA NETA`, 140, 58);
    doc.setFontSize(14);
    doc.text(`CRC ${gananciaNeta.toLocaleString()}`, 140, 68);

    const columnasTabla = ["Nº Transaccion", "Fecha y Hora", "Metodo", "Total Cobrado"];
    const filasTabla = [];

    ventasFiltradas.forEach(venta => {
      const fecha = new Date(venta.createdAt);
      filasTabla.push([
        `TRX-${venta._id.slice(-5).toUpperCase()}`,
        `${fecha.toLocaleDateString()} - ${fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
        venta.metodoPago,
        `CRC ${venta.totalVenta.toLocaleString()}`
      ]);
    });

    autoTable(doc, {
      startY: 95,
      head: [columnasTabla],
      body: filasTabla,
      theme: 'striped',
      headStyles: { fillColor: [74, 37, 17], textColor: [255, 184, 0] }, 
      alternateRowStyles: { fillColor: [249, 250, 251] },
      styles: { fontSize: 10, cellPadding: 4 },
    });

    doc.save(`Finanzas_${tipoFiltro}_${sucursal}_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-[#FFF0C2] p-8 max-w-6xl mx-auto mt-4 relative">
      
      {/* NOTIFICACIÓN FLOTANTE */}
      {notificacion.visible && (
        <div className={`fixed bottom-5 right-5 sm:bottom-10 sm:right-10 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 transition-all text-white font-bold text-lg
          ${notificacion.tipo === 'exito' ? 'bg-[#2E7D32]' : 'bg-red-600'}`}>
          {notificacion.mensaje}
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      {ventaAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border-2 border-red-100">
            <div className="flex justify-center mb-4 text-red-500">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-800 mb-2">¿Anular Venta?</h3>
            <p className="text-center text-gray-600 mb-6 font-medium">
              Estás a punto de borrar la transacción:<br/>
              <span className="font-black text-[#8B5A2B] text-lg">TRX-{ventaAEliminar._id.slice(-5).toUpperCase()}</span><br/>
              Monto: ₡{ventaAEliminar.totalVenta.toLocaleString()}
            </p>
            
            <div className="flex gap-3">
              <button onClick={() => setVentaAEliminar(null)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={ejecutarEliminacionBD} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors shadow-md">
                Sí, Anular
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ENCABEZADO Y CONTROLES DE FECHA */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 pb-6 border-b border-gray-100 gap-6">
        <div className="flex items-center gap-4">
         
          <div>
            <h2 className="text-[#8B5A2B] text-3xl font-bold">Reporte de Finanzas</h2>
            <p className="text-gray-500 font-medium text-lg">Sucursal: <span className="text-[#FFB800] font-bold">{sucursal}</span></p>
          </div>
        </div>
        
        {/* BARRA DE FILTROS MODERNIZADA */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto bg-gray-50 p-2 rounded-xl border border-gray-200 shadow-sm">
          
          <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm w-full sm:w-auto">
            <button 
              onClick={() => setTipoFiltro('dia')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md font-bold transition-all text-sm ${tipoFiltro === 'dia' ? 'bg-[#FFF0C2] text-[#8B5A2B]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Por Día
            </button>
            <button 
              onClick={() => setTipoFiltro('mes')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md font-bold transition-all text-sm ${tipoFiltro === 'mes' ? 'bg-[#FFF0C2] text-[#8B5A2B]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Por Mes
            </button>
          </div>

          <div className="w-full sm:w-auto">
            {tipoFiltro === 'dia' ? (
              <input 
                type="date" 
                value={fechaFiltro}
                onChange={(e) => setFechaFiltro(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#FFB800] focus:outline-none font-bold text-gray-700 cursor-pointer"
              />
            ) : (
              <input 
                type="month" 
                value={mesFiltro}
                onChange={(e) => setMesFiltro(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#FFB800] focus:outline-none font-bold text-gray-700 cursor-pointer"
              />
            )}
          </div>

          <button onClick={generarPDF} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-bold transition-colors shadow-sm active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Exportar PDF
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="py-20 text-center text-[#8B5A2B] font-bold text-xl animate-pulse">
          Calculando finanzas desde la base de datos...
        </div>
      ) : (
        <>
          {/* TARJETAS DE RESUMEN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
              <h3 className="text-gray-500 font-bold mb-1 uppercase text-sm tracking-wider">Ingresos Totales</h3>
              <p className="text-3xl lg:text-4xl font-black text-[#4A2511]">₡{ventasTotales.toLocaleString()}</p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
              <h3 className="text-gray-500 font-bold mb-1 uppercase text-sm tracking-wider">Costos de Producción</h3>
              <p className="text-3xl lg:text-4xl font-black text-red-600">₡{costosTotales.toLocaleString()}</p>
            </div>
            
            <div className="bg-[#FFF0C2] p-6 rounded-xl border-2 border-[#FFB800] shadow-md transform hover:scale-105 transition-transform flex flex-col justify-center relative overflow-hidden">
              <h3 className="text-[#8B5A2B] font-bold mb-1 uppercase text-sm tracking-wider relative z-10">Ganancia Neta</h3>
              <p className="text-4xl lg:text-5xl font-black text-[#2E7D32] relative z-10">₡{gananciaNeta.toLocaleString()}</p>
            </div>
          </div>

          {/* TABLA DE VENTAS CON BOTÓN DE BORRAR */}
          <div>
            <h3 className="text-[#8B5A2B] text-xl font-bold mb-4">Registro de Ventas ({cantidadVentas} comprobantes)</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-left">
                <thead className="bg-[#4A2511] text-[#FFB800]">
                  <tr>
                    <th className="px-6 py-4 text-sm font-bold tracking-wider">Nº Transacción</th>
                    <th className="px-6 py-4 text-sm font-bold tracking-wider">Fecha / Hora</th>
                    <th className="px-6 py-4 text-sm font-bold tracking-wider">Método de Pago</th>
                    <th className="px-6 py-4 text-sm font-bold tracking-wider text-right">Monto</th>
                    <th className="px-4 py-4 text-sm font-bold tracking-wider text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ventasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500 font-medium text-lg">
                        No hay ventas registradas en esta fecha.
                      </td>
                    </tr>
                  ) : (
                    ventasFiltradas.map((venta) => (
                      <tr key={venta._id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
                          TRX-{venta._id.slice(-5).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(venta.createdAt).toLocaleDateString()} - {new Date(venta.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-3 py-1 rounded-full font-bold text-xs
                            ${venta.metodoPago === 'SINPE' ? 'bg-purple-100 text-purple-700' : 
                              venta.metodoPago === 'Efectivo' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}
                          >
                            {venta.metodoPago}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-[#4A2511] text-right">
                          ₡{venta.totalVenta.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <button 
                            onClick={() => setVentaAEliminar(venta)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                            title="Anular venta"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ReporteFinanzas;
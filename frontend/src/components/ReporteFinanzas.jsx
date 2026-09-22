import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function ReporteFinanzas({ sucursal }) {
  const hoy = new Date();
  const formatoMesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const formatoDiaActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  const [tipoFiltro, setTipoFiltro] = useState('dia');
  const [fechaFiltro, setFechaFiltro] = useState(formatoDiaActual);
  const [mesFiltro, setMesFiltro] = useState(formatoMesActual);

  const [ventasBD, setVentasBD] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: '' });
  const [ventaAEliminar, setVentaAEliminar] = useState(null);

  useEffect(() => {
    const obtenerVentas = async () => {
      setCargando(true);
      try {
        const { data, error } = await supabase
          .from('ventas')
          .select('*')
          .eq('sucursal', sucursal)
          .order('createdAt', { ascending: false });

        if (data) setVentasBD(data);
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

  const ejecutarEliminacionBD = async () => {
    if (!ventaAEliminar) return;
    try {
      const { error } = await supabase
        .from('ventas')
        .delete()
        .eq('_id', ventaAEliminar._id);

      if (!error) {
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

  // Filtro de ventas por día o por mes
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

  // --- CÁLCULOS GENERALES ---
  const totalEfectivo = ventasFiltradas.filter(v => v.metodoPago === 'Efectivo').reduce((sum, v) => sum + v.totalVenta, 0);
  const totalSinpe = ventasFiltradas.filter(v => v.metodoPago === 'SINPE').reduce((sum, v) => sum + v.totalVenta, 0);
  const totalDatafono = ventasFiltradas.filter(v => v.metodoPago === 'Datáfono').reduce((sum, v) => sum + v.totalVenta, 0);

  const ventasTotales = ventasFiltradas.reduce((suma, v) => suma + v.totalVenta, 0);
  const costosTotales = ventasFiltradas.reduce((suma, v) => suma + v.totalCosto, 0);
  const gananciaNeta = ventasTotales - costosTotales;
  const cantidadVentas = ventasFiltradas.length;

  // --- 👈 DESGLOSE INDIVIDUAL POR CAJERO (EFECTIVO, SINPE, DATÁFONO) ---
  const ventasPorCajero = {};
  ventasFiltradas.forEach((v) => {
    const cajero = v.cajero || 'Cajero';
    if (!ventasPorCajero[cajero]) {
      ventasPorCajero[cajero] = {
        total: 0,
        cantidad: 0,
        efectivo: 0,
        sinpe: 0,
        datafono: 0
      };
    }
    ventasPorCajero[cajero].total += v.totalVenta;
    ventasPorCajero[cajero].cantidad += 1;

    if (v.metodoPago === 'Efectivo') {
      ventasPorCajero[cajero].efectivo += v.totalVenta;
    } else if (v.metodoPago === 'SINPE') {
      ventasPorCajero[cajero].sinpe += v.totalVenta;
    } else if (v.metodoPago === 'Datáfono') {
      ventasPorCajero[cajero].datafono += v.totalVenta;
    }
  });

  // --- GENERADOR DE PDF ---
  const generarPDF = () => {
    const doc = new jsPDF();
    const titulo = tipoFiltro === 'dia' ? `Cierre de Caja Diario - ${fechaFiltro}` : `Reporte Financiero Mensual - ${mesFiltro}`;
    const fechaImpresion = new Date().toLocaleString();

    // ENCABEZADO
    doc.setFontSize(20);
    doc.setTextColor(74, 37, 17);
    doc.setFont("helvetica", "bold");
    doc.text(`Quesos - Sucursal ${sucursal}`, 14, 18);

    doc.setFontSize(13);
    doc.setTextColor(139, 90, 43);
    doc.setFont("helvetica", "normal");
    doc.text(titulo, 14, 26);

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Emitido: ${fechaImpresion}   |   Comprobantes emitidos: ${cantidadVentas}`, 14, 33);

    doc.setDrawColor(225, 225, 225);
    doc.line(14, 37, 196, 37);

    // FILA 1: DESGLOSE GENERAL DE PAGOS
    const yFila1 = 41;
    const altoCaja1 = 25;
    const anchoCaja = 57;

    // Efectivo
    doc.setDrawColor(180, 220, 195);
    doc.setFillColor(244, 251, 247);
    doc.roundedRect(14, yFila1, anchoCaja, altoCaja1, 2.5, 2.5, 'FD');
    doc.setFontSize(8.5);
    doc.setTextColor(46, 125, 50);
    doc.setFont("helvetica", "bold");
    doc.text("VENTAS EFECTIVO", 18, yFila1 + 7);
    doc.setFontSize(12.5);
    doc.setTextColor(30, 70, 32);
    doc.text(`CRC ${totalEfectivo.toLocaleString()}`, 18, yFila1 + 17);

    // SINPE Móvil
    doc.setDrawColor(210, 195, 235);
    doc.setFillColor(248, 245, 252);
    doc.roundedRect(76.5, yFila1, anchoCaja, altoCaja1, 2.5, 2.5, 'FD');
    doc.setFontSize(8.5);
    doc.setTextColor(106, 27, 154);
    doc.setFont("helvetica", "bold");
    doc.text("VENTAS SINPE MÓVIL", 80.5, yFila1 + 7);
    doc.setFontSize(12.5);
    doc.setTextColor(74, 20, 140);
    doc.text(`CRC ${totalSinpe.toLocaleString()}`, 80.5, yFila1 + 17);

    // Datáfono
    doc.setDrawColor(190, 215, 245);
    doc.setFillColor(243, 247, 254);
    doc.roundedRect(139, yFila1, anchoCaja, altoCaja1, 2.5, 2.5, 'FD');
    doc.setFontSize(8.5);
    doc.setTextColor(21, 101, 192);
    doc.setFont("helvetica", "bold");
    doc.text("VENTAS DATÁFONO", 143, yFila1 + 7);
    doc.setFontSize(12.5);
    doc.setTextColor(13, 71, 161);
    doc.text(`CRC ${totalDatafono.toLocaleString()}`, 143, yFila1 + 17);

    // FILA 2: BALANCE FINANCIERO
    const yFila2 = 70;
    const altoCaja2 = 27;

    // Total Ingresos
    doc.setDrawColor(255, 184, 0);
    doc.setFillColor(255, 252, 242);
    doc.roundedRect(14, yFila2, anchoCaja, altoCaja2, 2.5, 2.5, 'FD');
    doc.setFontSize(8.5);
    doc.setTextColor(139, 90, 43);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL INGRESOS", 18, yFila2 + 7);
    doc.setFontSize(13.5);
    doc.setTextColor(74, 37, 17);
    doc.text(`CRC ${ventasTotales.toLocaleString()}`, 18, yFila2 + 16);
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    doc.text("Suma total recaudada", 18, yFila2 + 22);

    // Total Costos
    doc.setDrawColor(239, 154, 154);
    doc.setFillColor(255, 245, 245);
    doc.roundedRect(76.5, yFila2, anchoCaja, altoCaja2, 2.5, 2.5, 'FD');
    doc.setFontSize(8.5);
    doc.setTextColor(198, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL COSTOS", 80.5, yFila2 + 7);
    doc.setFontSize(13.5);
    doc.setTextColor(183, 28, 28);
    doc.text(`CRC ${costosTotales.toLocaleString()}`, 80.5, yFila2 + 16);
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    doc.text("Costos de productos", 80.5, yFila2 + 22);

    // Ganancia Neta
    doc.setDrawColor(46, 125, 50);
    doc.setFillColor(232, 245, 233);
    doc.roundedRect(139, yFila2, anchoCaja, altoCaja2, 2.5, 2.5, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(27, 94, 32);
    doc.setFont("helvetica", "bold");
    doc.text("GANANCIA NETA", 143, yFila2 + 7);
    doc.setFontSize(14.5);
    doc.setTextColor(27, 94, 32);
    doc.text(`CRC ${gananciaNeta.toLocaleString()}`, 143, yFila2 + 16);
    doc.setFontSize(7.5);
    doc.setTextColor(46, 125, 50);
    doc.setFont("helvetica", "bold");
    doc.text("Margen neto libre", 143, yFila2 + 22);

    // TABLA 1: CUADRE POR CAJERO EN PDF
    const cajerosRows = Object.entries(ventasPorCajero).map(([cajero, d]) => [
      cajero,
      `CRC ${d.efectivo.toLocaleString()}`,
      `CRC ${d.sinpe.toLocaleString()}`,
      `CRC ${d.datafono.toLocaleString()}`,
      `CRC ${d.total.toLocaleString()} (${d.cantidad})`
    ]);

    autoTable(doc, {
      startY: 103,
      head: [["Cajero / Usuario", "Efectivo", "SINPE", "Datáfono", "Total Recaudado"]],
      body: cajerosRows,
      theme: 'grid',
      headStyles: { fillColor: '#8B5A2B', textColor: '#FFFFFF', fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' }
      }
    });

    // TABLA 2: DETALLE DE TICKETS INDIVIDUALES
    const ultY = doc.lastAutoTable.finalY || 135;
    const columnasTabla = ["Nº Transacción", "Fecha / Hora", "Cajero", "Método", "Total Cobrado"];
    const filasTabla = [];

    ventasFiltradas.forEach(venta => {
      const fecha = new Date(venta.createdAt);
      filasTabla.push([
        `TRX-${venta._id.slice(-5).toUpperCase()}`,
        `${fecha.toLocaleDateString()} - ${fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
        venta.cajero || 'Cajero',
        venta.metodoPago,
        `CRC ${venta.totalVenta.toLocaleString()}`
      ]);
    });

    autoTable(doc, {
      startY: ultY + 8,
      head: [columnasTabla],
      body: filasTabla,
      theme: 'striped',
      headStyles: { 
        fillColor: '#4A2511', 
        textColor: [255, 184, 0], 
        fontStyle: 'bold',
        fontSize: 8.5
      },
      alternateRowStyles: { fillColor: [250, 250, 251] },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 46 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { halign: 'right', fontStyle: 'bold' }
      },
      didDrawPage: function () {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('BeeSoft POS - Sistema de Gestión Comercial | Soporte: +506 8802-8216', 14, 290);
      }
    });

    doc.save(`Finanzas_${tipoFiltro}_${sucursal}_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-[#FFF0C2] p-6 lg:p-8 max-w-6xl mx-auto mt-4 relative">
      {notificacion.visible && (
        <div className={`fixed bottom-5 right-5 sm:bottom-10 sm:right-10 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 transition-all text-white font-bold text-lg
          ${notificacion.tipo === 'exito' ? 'bg-[#2E7D32]' : 'bg-red-600'}`}>
          {notificacion.mensaje}
        </div>
      )}

      {ventaAEliminar && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
              <button onClick={() => setVentaAEliminar(null)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-colors cursor-pointer">
                Cancelar
              </button>
              <button onClick={ejecutarEliminacionBD} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors shadow-md cursor-pointer">
                Sí, Anular
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 pb-6 border-b border-gray-100 gap-6">
        <div>
          <h2 className="text-[#8B5A2B] text-3xl font-bold">Reporte de Finanzas</h2>
          <p className="text-gray-500 font-medium text-lg">Sucursal: <span className="text-[#FFB800] font-bold">{sucursal}</span></p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto bg-gray-50 p-2 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm w-full sm:w-auto">
            <button 
              onClick={() => setTipoFiltro('dia')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md font-bold transition-all text-sm cursor-pointer ${tipoFiltro === 'dia' ? 'bg-[#FFF0C2] text-[#8B5A2B]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Por Día
            </button>
            <button 
              onClick={() => setTipoFiltro('mes')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md font-bold transition-all text-sm cursor-pointer ${tipoFiltro === 'mes' ? 'bg-[#FFF0C2] text-[#8B5A2B]' : 'text-gray-500 hover:text-gray-700'}`}
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

          <button onClick={generarPDF} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-bold transition-colors shadow-sm active:scale-95 cursor-pointer">
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
          {/* CUADROS DE RESUMEN FINANCIERO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            
            {/* TARJETA 1: INGRESOS GENERALES */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-gray-500 font-bold mb-2 uppercase text-xs tracking-wider">Ingresos Generales</h3>
                <div className="space-y-1 text-xs font-medium text-gray-600 pb-2">
                  <div className="flex justify-between"><span>Datáfono:</span><span className="font-bold text-gray-800">₡{totalDatafono.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>SINPE:</span><span className="font-bold text-gray-800">₡{totalSinpe.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Efectivo:</span><span className="font-bold text-gray-800">₡{totalEfectivo.toLocaleString()}</span></div>
                </div>
              </div>
              <div className="border-t-2 border-gray-200 pt-2 flex justify-between items-baseline mt-1">
                <span className="text-[11px] uppercase font-black text-gray-500">Total:</span>
                <span className="text-xl font-black text-[#4A2511]">₡{ventasTotales.toLocaleString()}</span>
              </div>
            </div>

            {/* TARJETA 2: COSTOS */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-gray-500 font-bold mb-1 uppercase text-xs tracking-wider">Costos de Prod.</h3>
                <p className="text-2xl font-black text-red-600">₡{costosTotales.toLocaleString()}</p>
              </div>
              <p className="text-xs text-gray-400 mt-2 font-medium border-t-2 border-gray-200 pt-2">
                Inversión en productos
              </p>
            </div>
            
            {/* TARJETA 3: GANANCIA NETA */}
            <div className="bg-[#FFF0C2] p-5 rounded-xl border-2 border-[#FFB800] shadow-md flex flex-col justify-between relative overflow-hidden">
              <div>
                <h3 className="text-[#8B5A2B] font-bold mb-1 uppercase text-xs tracking-wider relative z-10">Ganancia Neta</h3>
                <p className="text-3xl font-black text-[#2E7D32] relative z-10">₡{gananciaNeta.toLocaleString()}</p>
              </div>
              <p className="text-xs text-[#8B5A2B] mt-2 font-bold relative z-10 border-t-2 border-[#FFE082] pt-2">
                Margen neto libre
              </p>
            </div>

            {/* TARJETA 4: ACTIVIDAD */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-gray-500 font-bold mb-1 uppercase text-xs tracking-wider">Comprobantes</h3>
                <p className="text-3xl font-black text-[#8B5A2B]">{cantidadVentas}</p>
              </div>
              <p className="text-xs text-gray-400 mt-2 font-medium border-t-2 border-gray-200 pt-2">
                Tickets procesados
              </p>
            </div>
          </div>

          {/* 👈 NUEVA SECCIÓN DESTACADA: CUADRE POR CAJERO CON DESGLOSE */}
          <div className="mb-8">
            <h3 className="text-[#8B5A2B] text-lg font-bold mb-3"> Cuadre de Caja por Usuario</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.keys(ventasPorCajero).length === 0 ? (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-400 text-sm italic col-span-full">
                  No hay ventas de usuarios en este periodo.
                </div>
              ) : (
                Object.entries(ventasPorCajero).map(([cajero, d]) => (
                  <div key={cajero} className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm flex flex-col justify-between hover:border-[#FFB800] transition-colors">
                    <div>
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                        <span className="font-bold text-gray-800 capitalize text-base flex items-center gap-1.5">
                           {cajero}
                        </span>
                        <span className="text-xs font-bold bg-amber-50 text-[#8B5A2B] px-2 py-0.5 rounded border border-amber-200">
                          {d.cantidad} {d.cantidad === 1 ? 'ticket' : 'tickets'}
                        </span>
                      </div>

                      {/* Desglose individual de métodos */}
                      <div className="space-y-1.5 text-xs text-gray-600 font-medium">
                        <div className="flex justify-between items-center bg-gray-50 px-2.5 py-1.5 rounded-lg">
                          <span>Efectivo:</span>
                          <span className="font-black text-gray-800">₡{d.efectivo.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center bg-gray--50 px-2.5 py-1.5 rounded-lg">
                          <span className="text-gray-600">SINPE Móvil:</span>
                          <span className="font-black text-gray-800">₡{d.sinpe.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center bg-gray-50 px-2.5 py-1.5 rounded-lg">
                          <span className="text-gray-700">Datáfono:</span>
                          <span className="font-black text-gray-800">₡{d.datafono.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Total individual del cajero */}
                    <div className="border-t-2 border-gray-100 pt-2.5 mt-3 flex justify-between items-baseline">
                      <span className="text-xs font-bold text-gray-500 uppercase">Total Cajero:</span>
                      <span className="text-lg font-black text-[#2E7D32]">₡{d.total.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TABLA DE VENTAS CON COLUMNA CAJERO */}
          <div>
            <h3 className="text-[#8B5A2B] text-lg font-bold mb-3">Historial Detallado de Transacciones</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-left">
                <thead className="bg-[#4A2511] text-[#FFB800]">
                  <tr>
                    <th className="px-5 py-4 text-xs font-bold tracking-wider uppercase">Nº Transacción</th>
                    <th className="px-5 py-4 text-xs font-bold tracking-wider uppercase">Fecha / Hora</th>
                    <th className="px-5 py-4 text-xs font-bold tracking-wider uppercase">Cajero</th>
                    <th className="px-5 py-4 text-xs font-bold tracking-wider uppercase">Método de Pago</th>
                    <th className="px-5 py-4 text-xs font-bold tracking-wider uppercase text-right">Monto</th>
                    <th className="px-4 py-4 text-xs font-bold tracking-wider uppercase text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ventasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500 font-medium text-lg">
                        No hay ventas registradas en esta fecha.
                      </td>
                    </tr>
                  ) : (
                    ventasFiltradas.map((venta) => (
                      <tr key={venta._id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-5 py-4 whitespace-nowrap text-xs font-black text-gray-700">
                          TRX-{venta._id.slice(-5).toUpperCase()}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-500">
                          {new Date(venta.createdAt).toLocaleDateString()} - {new Date(venta.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-gray-800 capitalize">
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md border border-gray-200">
                             {venta.cajero || 'Cajero'}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-xs
                            ${venta.metodoPago === 'SINPE' ? 'bg-purple-100 text-purple-700' : 
                              venta.metodoPago === 'Efectivo' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}
                          >
                            {venta.metodoPago}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-black text-[#4A2511] text-right">
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
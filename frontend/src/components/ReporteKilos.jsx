import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function ReporteKilos({ sucursal }) {
  const hoy = new Date();
  const formatoMesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const formatoDiaActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  // Filtros de fecha
  const [tipoFiltro, setTipoFiltro] = useState('mes'); // 'mes' o 'rango'
  const [mesSeleccionado, setMesSeleccionado] = useState(formatoMesActual);
  const [fechaDesde, setFechaDesde] = useState(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`);
  const [fechaHasta, setFechaHasta] = useState(formatoDiaActual);

  const [ventas, setVentas] = useState([]);
  const [productosCatalogo, setProductosCatalogo] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      try {
        const { data: dataVentas } = await supabase
          .from('ventas')
          .select('*')
          .eq('sucursal', sucursal)
          .order('createdAt', { ascending: false });

        const { data: dataProductos } = await supabase
          .from('productos')
          .select('*');

        if (dataVentas) setVentas(dataVentas);
        if (dataProductos) setProductosCatalogo(dataProductos);
      } catch (error) {
        console.error('Error al cargar datos:', error);
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, [sucursal]);

  // Filtrar ventas por el periodo seleccionado
  const ventasPeriodo = ventas.filter((v) => {
    const f = new Date(v.createdAt);
    if (tipoFiltro === 'mes') {
      const [y, m] = mesSeleccionado.split('-');
      return f.getFullYear() === parseInt(y) && f.getMonth() === parseInt(m) - 1;
    } else {
      const inicio = new Date(`${fechaDesde}T00:00:00`);
      const fin = new Date(`${fechaHasta}T23:59:59`);
      return f >= inicio && f <= fin;
    }
  });

  // Agrupar los quesos vendidos sumando estrictamente sus kilos
  const mapaProductos = {};

  ventasPeriodo.forEach((venta) => {
    const items = Array.isArray(venta.productos) ? venta.productos : [];
    items.forEach((item) => {
      const infoProd = productosCatalogo.find((p) => p.nombre === item.nombre || p._id === item.productoId);
      const tipoVenta = infoProd?.tipoVenta || (item.cantidad % 1 !== 0 ? 'Peso' : 'Unidad');

      if (tipoVenta === 'Peso') {
        const codigo = infoProd?.codigo || '---';

        if (!mapaProductos[item.nombre]) {
          mapaProductos[item.nombre] = {
            nombre: item.nombre,
            codigo: codigo,
            totalKilos: 0
          };
        }

        mapaProductos[item.nombre].totalKilos += Number(item.cantidad) || 0;
      }
    });
  });

  // Ordenar de mayor a menor cantidad de kilos vendidos
  const listaQuesos = Object.values(mapaProductos).sort((a, b) => b.totalKilos - a.totalKilos);

  // Totales
  const totalKilos = listaQuesos.reduce((sum, p) => sum + p.totalKilos, 0);
  const quesoMasVendido = listaQuesos.length > 0 ? listaQuesos[0] : null;

  // Generador de PDF
  const exportarPDF = () => {
    const doc = new jsPDF();
    const tituloPeriodo = tipoFiltro === 'mes' ? `Mes: ${mesSeleccionado}` : `Periodo: ${fechaDesde} al ${fechaHasta}`;
    const fechaImpresion = new Date().toLocaleString();

    // Encabezado
    doc.setFontSize(20);
    doc.setTextColor(74, 37, 17);
    doc.setFont('helvetica', 'bold');
    doc.text(`Reporte de Kilos de Queso - ${sucursal}`, 14, 18);

    doc.setFontSize(13);
    doc.setTextColor(139, 90, 43);
    doc.setFont('helvetica', 'normal');
    doc.text(tituloPeriodo, 14, 26);

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Emitido: ${fechaImpresion}   |   Ventas analizadas: ${ventasPeriodo.length}`, 14, 33);

    // Línea divisoria
    doc.setDrawColor(225, 225, 225);
    doc.line(14, 36, 196, 36);

    // Cuadros resumen de volumen
    doc.setDrawColor(255, 184, 0);
    doc.setFillColor(255, 240, 194);
    doc.roundedRect(14, 40, 88, 26, 2.5, 2.5, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(139, 90, 43);
    doc.setFont('helvetica', 'bold');
    doc.text('VOLUMEN TOTAL DESPACHADO', 18, 47);
    doc.setFontSize(16);
    doc.setTextColor(74, 37, 17);
    doc.text(`${totalKilos.toFixed(3)} Kg`, 18, 58);

    doc.setDrawColor(180, 220, 195);
    doc.setFillColor(244, 251, 247);
    doc.roundedRect(108, 40, 88, 26, 2.5, 2.5, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(46, 125, 50);
    doc.setFont('helvetica', 'bold');
    doc.text('QUESO MÁS VENDIDO', 112, 47);
    doc.setFontSize(13);
    doc.setTextColor(30, 70, 32);
    doc.text(quesoMasVendido ? `${quesoMasVendido.nombre} (${quesoMasVendido.totalKilos.toFixed(3)} kg)` : 'Sin ventas', 112, 58);

    // Tabla de kilos
    const columnas = ['Código', 'Queso / Variedad', 'Kilos Vendidos', '% del Volumen'];
    const filas = listaQuesos.map((p) => [
      `#${p.codigo}`,
      p.nombre,
      `${p.totalKilos.toFixed(3)} kg`,
      totalKilos > 0 ? `${((p.totalKilos / totalKilos) * 100).toFixed(1)}%` : '0%'
    ]);

    autoTable(doc, {
      startY: 72,
      head: [columnas],
      body: filas,
      theme: 'striped',
      headStyles: {
        fillColor: '#4A2511',
        textColor: '#FFB800',
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 85 },
        2: { halign: 'right', fontStyle: 'bold', cellWidth: 40 },
        3: { halign: 'right', cellWidth: 30 }
      },
      didDrawPage: function () {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('BeeSoft POS - Control de Producción y Despacho | Soporte: +506 8802-8216', 14, 290);
      }
    });

    doc.save(`Kilos_Vendidos_${sucursal}_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-[#FFF0C2] p-6 lg:p-8 max-w-6xl mx-auto mt-2">
      
      {/* ENCABEZADO Y CONTROLES */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 pb-6 border-b border-gray-100 gap-4">
        <div>
          <h2 className="text-[#8B5A2B] text-2xl lg:text-3xl font-bold">Kilos de Queso Vendidos</h2>
          <p className="text-gray-500 font-medium">
            Sucursal: <span className="text-[#FFB800] font-bold">{sucursal}</span>
          </p>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto bg-gray-50 p-2.5 rounded-xl border border-gray-200">
          
          <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
            <button
              onClick={() => setTipoFiltro('mes')}
              className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${tipoFiltro === 'mes' ? 'bg-[#FFF0C2] text-[#8B5A2B]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Por Mes
            </button>
            <button
              onClick={() => setTipoFiltro('rango')}
              className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${tipoFiltro === 'rango' ? 'bg-[#FFF0C2] text-[#8B5A2B]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Rango de Fechas
            </button>
          </div>

          {tipoFiltro === 'mes' ? (
            <input
              type="month"
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              className="px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:border-[#FFB800] font-bold text-xs text-gray-700 cursor-pointer bg-white"
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="px-2.5 py-1.5 border-2 border-gray-200 rounded-lg focus:border-[#FFB800] font-bold text-xs text-gray-700 cursor-pointer bg-white"
              />
              <span className="text-gray-400 font-bold text-xs">a</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="px-2.5 py-1.5 border-2 border-gray-200 rounded-lg focus:border-[#FFB800] font-bold text-xs text-gray-700 cursor-pointer bg-white"
              />
            </div>
          )}

          <button
            onClick={exportarPDF}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm transition-colors cursor-pointer ml-auto lg:ml-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar PDF
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="py-16 text-center text-[#8B5A2B] font-bold text-lg animate-pulse">
          Calculando kilos de queso desde las ventas...
        </div>
      ) : (
        <>
          {/* TARJETAS RESUMEN (SOLO KILOS) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#FFF0C2] p-5 rounded-xl border-2 border-[#FFB800] shadow-sm flex flex-col justify-center">
              <h3 className="text-[#8B5A2B] font-bold uppercase text-xs tracking-wider mb-1">Total Kilos de Queso</h3>
              <p className="text-3xl font-black text-[#4A2511]">{totalKilos.toFixed(3)} <span className="text-lg font-bold">Kg</span></p>
              <p className="text-xs text-gray-500 mt-1 font-medium">Volumen total despachado</p>
            </div>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
              <h3 className="text-gray-500 font-bold uppercase text-xs tracking-wider mb-1">Queso Más Vendido</h3>
              <p className="text-xl font-black text-[#8B5A2B] truncate">{quesoMasVendido ? quesoMasVendido.nombre : 'Sin ventas'}</p>
              <p className="text-xs text-[#2E7D32] font-bold mt-1">
                {quesoMasVendido ? `${quesoMasVendido.totalKilos.toFixed(3)} kg despachados` : '---'}
              </p>
            </div>

          </div>

          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[#8B5A2B] text-lg font-bold">Detalle de Kilos por Variedad</h3>
            <span className="text-xs font-bold text-gray-500">
              {listaQuesos.length} tipos de queso
            </span>
          </div>

          {/* TABLA DE KILOS */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-[#4A2511] text-[#FFB800]">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase">Código</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase">Nombre del Queso</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-right">Kilos Vendidos</th>
                 
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {listaQuesos.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400 font-medium">
                      No se registraron ventas de quesos por peso en este periodo.
                    </td>
                  </tr>
                ) : (
                  listaQuesos.map((item, idx) => {
                    const porcentaje = totalKilos > 0 ? ((item.totalKilos / totalKilos) * 100).toFixed(1) : 0;
                    return (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-black text-[#8B5A2B]">
                          #{item.codigo}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-800">
                          {item.nombre}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-base font-black text-[#4A2511] text-right">
                          {item.totalKilos.toFixed(3)} kg
                        </td>
                       
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default ReporteKilos;
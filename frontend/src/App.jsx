import React, { useState, useEffect } from 'react';

// Importamos todos nuestros componentes modulares
import Login from './components/Login';
import GestionUsuarios from './components/GestionUsuarios';
import CajaPOS from './components/CajaPOS';
import AgregarProducto from './components/AgregarProducto';
import ReporteFinanzas from './components/ReporteFinanzas';

function App() {
  const [usuarioLogueado, setUsuarioLogueado] = useState(null);
  const [sucursal, setSucursal] = useState(null);
  const [vistaActiva, setVistaActiva] = useState('inicio'); 

  // Escuchar el botón Atrás
  useEffect(() => {
    const manejarBotonAtras = () => { setSucursal(null); setVistaActiva('inicio'); };
    window.addEventListener('popstate', manejarBotonAtras);
    return () => window.removeEventListener('popstate', manejarBotonAtras);
  }, []);

  const tienePermiso = (pantalla) => {
    if (!usuarioLogueado) return false;
    if (usuarioLogueado.rol === 'superadmin') return true; 
    return usuarioLogueado.permisos.includes(pantalla);
  };

  const elegirSucursal = (nombre) => {
    setSucursal(nombre);
    if (tienePermiso('pos')) setVistaActiva('pos');
    else if (tienePermiso('agregar')) setVistaActiva('agregar');
    else if (tienePermiso('finanzas')) setVistaActiva('finanzas');
    
    window.history.pushState({ vista: 'caja' }, '', '');
  };

  const volverInicio = () => {
    setSucursal(null);
    setVistaActiva('inicio');
    if (window.history.state && window.history.state.vista === 'caja') {
      window.history.back(); 
    }
  };

  const cerrarSesion = () => {
    setUsuarioLogueado(null);
    setSucursal(null);
  };

  const premiumBackground = {
    backgroundColor: '#3E1D0C',
    backgroundImage: `radial-gradient(circle at center, rgba(139, 90, 43, 0.5) 0%, rgba(0, 0, 0, 0.7) 100%), url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%23ffffff' fill-opacity='0.04'/%3E%3C/svg%3E")`,
  };

  // --- TRUCO DE PRESENTACIÓN: Muestra "Esteban" si es el correo del admin ---
  const nombreMostrar = usuarioLogueado?.usuario === 'djest0524@icloud.com' 
    ? 'Esteban' 
    : usuarioLogueado?.usuario;

  // --- 1. RENDER DE LOGIN ---
  if (!usuarioLogueado) {
    return <Login onLoginSuccess={(user) => setUsuarioLogueado(user)} />;
  }

  // --- 2. RENDER DE GESTIÓN DE USUARIOS ---
  if (vistaActiva === 'usuarios') {
    return <GestionUsuarios onVolver={() => setVistaActiva('inicio')} />;
  }

  // --- 3. RENDER DE SELECCIÓN DE SUCURSAL ---
  if (!sucursal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative" style={premiumBackground}>
        <div className="absolute top-6 right-6 flex gap-4">
          {usuarioLogueado.rol === 'superadmin' && (
            <button onClick={() => setVistaActiva('usuarios')} className="bg-[#FFB800] text-[#4A2511] hover:bg-yellow-400 px-5 py-2 rounded-xl font-bold shadow-lg transition-transform active:scale-95">
              Gestión de Usuarios
            </button>
          )}
          <button onClick={cerrarSesion} className="bg-red-500 text-white hover:bg-red-600 px-5 py-2 rounded-xl font-bold shadow-lg transition-transform active:scale-95">
            Cerrar Sesión
          </button>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-[#FFB800] mb-4 drop-shadow-xl tracking-wider text-center">
          Seleccione la Sucursal
        </h1>
        <p className="text-white/80 font-medium mb-12 text-lg text-center">
          {/* AQUI USAMOS EL NOMBRE PERSONALIZADO */}
          ¡Hola, <span className="font-bold text-white capitalize">{nombreMostrar}</span>! 
        </p>

        <div className="flex flex-col sm:flex-row gap-10">
          <button onClick={() => elegirSucursal('Sarchí')} className="bg-white border-4 border-[#FFF0C2] hover:border-[#FFB800] rounded-3xl shadow-2xl p-8 flex flex-col items-center transition-all duration-300 hover:-translate-y-2 active:scale-95 cursor-pointer w-80 group">
            <img src="/LogoSarchi.png" alt="Sarchí" className="w-full h-auto object-contain mb-6 transition-transform duration-500 group-hover:scale-110" />
            <h2 className="text-2xl font-bold text-[#8B5A2B]">Sarchí</h2>
            <p className="text-gray-500 font-medium mt-2">Quesos el Carretón</p>
          </button>
          <button onClick={() => elegirSucursal('Poás')} className="bg-white border-4 border-[#FFF0C2] hover:border-[#FFB800] rounded-3xl shadow-2xl p-8 flex flex-col items-center transition-all duration-300 hover:-translate-y-2 active:scale-95 cursor-pointer w-80 group">
            <img src="/LogoPoas.png" alt="Poás" className="w-full h-auto object-contain mb-6 transition-transform duration-500 group-hover:scale-110" />
            <h2 className="text-2xl font-bold text-[#8B5A2B]">Poás</h2>
            <p className="text-gray-500 font-medium mt-2">Quesos del Poás</p>
          </button>
        </div>
      </div>
    );
  }

  // --- 4. RENDER DEL SISTEMA PRINCIPAL ---
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-[#4A2511] text-[#FFB800] p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <img src={sucursal === 'Sarchí' ? '/LogoSarchi.png' : '/LogoPoas.png'} alt="Logo" className="h-12 w-auto object-contain bg-white rounded-full p-1" />
          <h1 className="text-2xl font-bold hidden sm:block">
            Caja - {sucursal === 'Sarchí' ? 'El Carretón' : 'Volcán Poás'}
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-sm font-semibold hidden md:block border-r border-white/20 pr-6">
            {/* Y TAMBIÉN LO USAMOS AQUÍ EN LA BARRA SUPERIOR */}
            Cajero: <span className="text-white text-lg ml-1 capitalize">{nombreMostrar}</span>
          </div>
          <button onClick={volverInicio} className="text-sm font-bold bg-white/10 hover:bg-[#D32F2F] text-white py-2 px-4 rounded-lg transition-colors duration-300 cursor-pointer">
            ← Cambiar Local
          </button>
        </div>
      </header>

      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex gap-4 overflow-x-auto">
        {tienePermiso('pos') && (
          <button onClick={() => setVistaActiva('pos')} className={`px-6 py-2 rounded-lg font-bold transition-colors cursor-pointer flex-shrink-0 ${vistaActiva === 'pos' ? 'bg-[#FFB800] text-[#4A2511]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            Registrar Ventas
          </button>
        )}
        {tienePermiso('agregar') && (
          <button onClick={() => setVistaActiva('agregar')} className={`px-6 py-2 rounded-lg font-bold transition-colors cursor-pointer flex-shrink-0 ${vistaActiva === 'agregar' ? 'bg-[#FFB800] text-[#4A2511]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            Agregar Productos
          </button>
        )}
        {tienePermiso('finanzas') && (
          <button onClick={() => setVistaActiva('finanzas')} className={`px-6 py-2 rounded-lg font-bold transition-colors cursor-pointer flex-shrink-0 ${vistaActiva === 'finanzas' ? 'bg-[#FFB800] text-[#4A2511]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            Finanzas del Día
          </button>
        )}
      </div>

      <main className="flex-1 p-4 overflow-hidden">
        {vistaActiva === 'pos' && tienePermiso('pos') && <CajaPOS sucursal={sucursal} />}
        {vistaActiva === 'agregar' && tienePermiso('agregar') && <AgregarProducto sucursal={sucursal} />}
        {vistaActiva === 'finanzas' && tienePermiso('finanzas') && <ReporteFinanzas sucursal={sucursal} />}
      </main>
    </div>
  );
}

export default App;
import React, { useState } from 'react';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorLogin, setErrorLogin] = useState(false);
  const [procesandoLogin, setProcesandoLogin] = useState(false);

  const manejarLogin = async (e) => {
    e.preventDefault();
    setProcesandoLogin(true);
    try {
      const res = await fetch('https://backend-quesos.onrender.com/api/usuarios/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: username, password })
      });
      const data = await res.json();
      if (data.exito) {
        onLoginSuccess(data.usuario); // Le avisa a App.jsx que el login fue exitoso
      } else {
        setErrorLogin(true);
        setPassword('');
      }
    } catch (error) {
      console.error(error);
      setErrorLogin(true);
    } finally {
      setProcesandoLogin(false);
    }
  };

  const premiumBackground = {
    backgroundColor: '#3E1D0C',
    backgroundImage: `radial-gradient(circle at center, rgba(139, 90, 43, 0.5) 0%, rgba(0, 0, 0, 0.7) 100%), url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%23ffffff' fill-opacity='0.04'/%3E%3C/svg%3E")`,
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={premiumBackground}>
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border-4 border-[#FFF0C2] transform transition-all">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-[#FFF0C2] rounded-full flex items-center justify-center text-4xl shadow-inner">🔒</div>
        </div>
        <h2 className="text-3xl font-bold text-center text-[#8B5A2B] mb-2">Acceso al Sistema</h2>
        <p className="text-center text-gray-500 font-medium mb-8">Quesos El Carretón POS</p>
        
        <form onSubmit={manejarLogin} className="space-y-4">
          <div>
            <label className="block text-[#4A2511] font-bold mb-1 text-sm uppercase">Usuario</label>
            <input type="text" autoFocus required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-gray-50 border-2 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-[#FFB800]" placeholder="Ej: admin" />
          </div>
          <div>
            <label className="block text-[#4A2511] font-bold mb-1 text-sm uppercase">Contraseña</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`w-full bg-gray-50 border-2 rounded-xl px-4 py-3 tracking-widest font-black focus:outline-none ${errorLogin ? 'border-red-400 focus:border-red-500 text-red-600 bg-red-50' : 'border-gray-200 focus:border-[#FFB800] text-gray-700'}`} placeholder="••••••••" />
            {errorLogin && <p className="text-red-500 text-sm font-bold mt-2 text-center animate-pulse">Credenciales incorrectas.</p>}
          </div>
          <button type="submit" disabled={procesandoLogin} className="w-full bg-[#8B5A2B] hover:bg-[#4A2511] text-white font-bold py-4 rounded-xl text-xl mt-4 transition-all shadow-lg active:scale-95">
            {procesandoLogin ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
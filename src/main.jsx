import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  const [status, setStatus] = useState('loading');
  const [details, setDetails] = useState('');

  async function checkConnection() {
    setStatus('loading');
    setDetails('');
    try {
      const response = await fetch('/api/health', {
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.status !== 'ok') throw new Error('Respuesta de salud inesperada');
      setStatus('success');
      setDetails(JSON.stringify(data, null, 2));
    } catch (error) {
      setStatus('error');
      setDetails(error.message);
    }
  }

  useEffect(() => { checkConnection(); }, []);

  return (
    <main>
      <p className="eyebrow">FINTECH · DESARROLLO LOCAL</p>
      <h1>El punto de partida del equipo.</h1>
      <p>React y FastAPI, conectados a través de Docker Compose.</p>
      <section aria-labelledby="connection-title">
        <h2 id="connection-title">Conexión con la API</h2>
        <p role="status" className={status}>
          {status === 'loading' && 'Comprobando conexión…'}
          {status === 'success' && 'Conexión correcta con el backend'}
          {status === 'error' && 'No se ha podido conectar con el backend'}
        </p>
        {details && <pre>{details}</pre>}
        <button onClick={checkConnection} disabled={status === 'loading'}>
          Volver a comprobar
        </button>
      </section>
      <p className="note">Pantalla de comprobación del entorno. Las funcionalidades del producto se desarrollarán aquí.</p>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

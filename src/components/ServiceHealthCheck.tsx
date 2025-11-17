import { useState, useEffect } from 'react';
import AppBadge from './AppBadge';
import AppButton from './AppButton';
import './ServiceHealthCheck.css';

type HealthStatus = 'checking' | 'ok' | 'error' | 'not_set';

type ServiceHealthCheckProps = {
  serviceName: string;
  endpoint: string | null;
  autoCheck?: boolean;
};

export default function ServiceHealthCheck({ serviceName, endpoint, autoCheck = false }: ServiceHealthCheckProps) {
  const [status, setStatus] = useState<HealthStatus>('not_set');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (autoCheck) {
      checkHealth();
    }
  }, []);

  const checkHealth = async () => {
    setChecking(true);
    setStatus('checking');
    setError(null);

    try {
      if (!endpoint) {
        setStatus('not_set');
        setError('Endpoint no configurado');
        return;
      }

      // Construct health URL
      let healthUrl: string | null = null;
      if (endpoint.endsWith('/infer') || endpoint.endsWith('/search') || endpoint.endsWith('/playlist')) {
        healthUrl = endpoint.replace(/\/(infer|search|playlist)$/, '/health');
      } else {
        try {
          const u = new URL(endpoint);
          healthUrl = `${u.origin}/health`;
        } catch {
          healthUrl = null;
        }
      }

      if (!healthUrl) {
        setStatus('error');
        setError('URL inválida');
        return;
      }

      // Check for mixed content
      if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && healthUrl.startsWith('http://')) {
        setError('Posible bloqueo por contenido mixto (https → http)');
      }

      const res = await fetch(healthUrl, { method: 'GET' });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        setStatus('error');
        setError(`${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
        return;
      }

      const data = await res.json().catch(() => ({} as any));

      if ((data as any)?.status === 'ok' || (data as any)?.status === 'healthy') {
        setStatus('ok');
        setError(null);
      } else {
        setStatus('error');
        setError('Respuesta inválida del health endpoint');
      }
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'Error de red');
    } finally {
      setChecking(false);
    }
  };

  return (
    <article className="service-health" data-status={status}>
      <header className="service-health__header">
        <h3 className="service-health__title">{serviceName}</h3>
        <div className="service-health__controls">
          <AppBadge
            tone={
              status === 'ok' ? 'success' :
              status === 'not_set' ? 'neutral' :
              status === 'checking' ? 'neutral' : 'error'
            }
            title={
              status === 'ok'
                ? 'Servicio operativo'
                : status === 'not_set'
                ? 'No configurado'
                : status === 'checking'
                ? 'Comprobando servicio'
                : 'Servicio no disponible'
            }
          >
            {status === 'checking' ? 'Comprobando...' : status === 'ok' ? 'Activo' : status === 'not_set' ? 'No configurado' : 'No disponible'}
          </AppBadge>

          <AppButton variant="ghost" onClick={checkHealth} disabled={checking} loading={checking}>
            {checking ? 'Comprobando...' : 'Actualizar estado'}
          </AppButton>
        </div>
      </header>

      <section
        className={`service-health__info ${error ? 'service-health__info--error' : ''}`}
        aria-live="polite"
      >
        <div className="service-health__endpoint">
          <strong>Endpoint:</strong> {endpoint || 'no definido'}
        </div>
        {error && (
          <div className="service-health__error">
            <strong>Error:</strong> {error}
          </div>
        )}
      </section>
    </article>
  );
}

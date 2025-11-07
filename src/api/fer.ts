export type FerEmotion = 'joy' | 'sadness' | 'anger';
export interface FerResponse { emotion: FerEmotion; confidence: number; model_version?: string }

// Endpoints de FER
const RAW_ENDPOINT: string | undefined = import.meta.env.VITE_FER_ENDPOINT_URL as any;

function getEndpoint(): string | null {
  if (RAW_ENDPOINT) return RAW_ENDPOINT;
  // En desarrollo, usar el proxy si no hay variable definida
  if (import.meta.env.DEV) return '/fer-proxy/infer';
  return null;
}

function getHealthUrl(): string | null {
  const ep = getEndpoint();
  if (!ep) return null;
  if (ep.endsWith('/infer')) return ep.replace(/\/infer$/, '/health');
  try {
    const u = new URL(ep, typeof window !== 'undefined' ? window.location.origin : undefined);
    return `${u.origin}/health`;
  } catch {
    return null;
  }
}

export const ferApi = {
  isConfigured(): boolean {
    return !!getEndpoint();
  },

  effectiveEndpoint(): string | null {
    return getEndpoint();
  },

  async infer(file: File, signal?: AbortSignal): Promise<FerResponse> {
    const endpoint = getEndpoint();
    if (!endpoint) throw new Error('FER endpoint no configurado');
    const form = new FormData();
    form.append('image', file, file.name);
    const res = await fetch(endpoint, { method: 'POST', body: form, signal });
    if (!res.ok) {
      const msg = await res.text().catch(() => `${res.status} ${res.statusText}`);
      throw new Error(msg || `${res.status}`);
    }
    return await res.json();
  },

  async health(): Promise<'ok' | 'error'> {
    const url = getHealthUrl();
    if (!url) return 'error';
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) return 'error';
      const data = await res.json().catch(() => ({} as any));
      return data?.status === 'ok' ? 'ok' : 'error';
    } catch {
      return 'error';
    }
  },
};

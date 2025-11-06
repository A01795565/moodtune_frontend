export type FerEmotion = 'joy' | 'sadness' | 'anger';
export interface FerResponse { emotion: FerEmotion; confidence: number; model_version?: string }

const ENDPOINT = (import.meta as any).env?.VITE_FER_ENDPOINT_URL as string | undefined;

function getHealthUrl(): string | null {
  if (!ENDPOINT) return null;
  if (ENDPOINT.endsWith('/infer')) return ENDPOINT.replace(/\/infer$/, '/health');
  try {
    const u = new URL(ENDPOINT);
    return `${u.origin}/health`;
  } catch {
    return null;
  }
}

export const ferApi = {
  isConfigured(): boolean {
    return !!ENDPOINT;
  },

  async infer(file: File, signal?: AbortSignal): Promise<FerResponse> {
    if (!ENDPOINT) throw new Error('FER endpoint no configurado');
    const form = new FormData();
    form.append('image', file, file.name);
    const res = await fetch(ENDPOINT, { method: 'POST', body: form, signal });
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


if (typeof window !== 'undefined') {
  const CACHE_KEY = '__vibe_watermark__';
  const CACHE_TTL = 10 * 60 * 1000;
  const DEFAULT_LINK = 'https://coding.tuya.ai';

  type WatermarkConfig = { show: boolean; link?: string };

  const readCache = (): WatermarkConfig | null => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { config, ts } = JSON.parse(raw) as { config: WatermarkConfig; ts: number };
      return Date.now() - ts < CACHE_TTL ? config : null;
    } catch {
      return null;
    }
  };

  const writeCache = (config: WatermarkConfig) => {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ config, ts: Date.now() }));
    } catch {
    }
  };

  const useCache = process.env.NODE_ENV !== 'development';

  const fetchConfig = async (): Promise<WatermarkConfig> => {
    if (useCache) {
      const cached = readCache();
      if (cached) return cached;
    }
    const resp = await fetch('/api/watermark');
    if (!resp.ok) return { show: true };
    const config = (await resp.json()) as WatermarkConfig;
    if (useCache) writeCache(config);
    return config;
  };

  const mount = (link: string) => {
    if (document.getElementById('__vibe-watermark-host')) return;

    const host = document.createElement('div');
    host.id = '__vibe-watermark-host';
    const shadow = host.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `
      <style>
        @keyframes vibe-wm-in {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        a {
          position: fixed;
          right: 16px;
          bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          z-index: 2147483647;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 13px 7px 10px;
          border-radius: 9999px;
          background: rgba(20, 20, 24, 0.82);
          -webkit-backdrop-filter: blur(10px) saturate(1.4);
          backdrop-filter: blur(10px) saturate(1.4);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: rgba(255, 255, 255, 0.95);
          font: 500 12px/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
          letter-spacing: 0.01em;
          text-decoration: none;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.16), 0 8px 24px rgba(0, 0, 0, 0.22);
          animation: vibe-wm-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        a:hover {
          transform: translateY(-2px);
          background: rgba(20, 20, 24, 0.94);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.18), 0 12px 32px rgba(0, 0, 0, 0.28);
        }
        a:active { transform: translateY(0); }
        svg { display: block; }
        b { font-weight: 650; }
        @media (prefers-reduced-motion: reduce) {
          a { animation: none; transition: none; }
        }
      </style>
    `;
    const anchor = document.createElement('a');
    anchor.href = link;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="wm-spark" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FFB25E"/>
            <stop offset="1" stop-color="#FF4800"/>
          </linearGradient>
        </defs>
        <path d="M12 2.6c.3 0 .55.2.62.48l1.06 4.13a4 4 0 0 0 2.87 2.87l4.13 1.06a.64.64 0 0 1 0 1.24l-4.13 1.06a4 4 0 0 0-2.87 2.87l-1.06 4.13a.64.64 0 0 1-1.24 0l-1.06-4.13a4 4 0 0 0-2.87-2.87L3.32 12.4a.64.64 0 0 1 0-1.24l4.13-1.06a4 4 0 0 0 2.87-2.87l1.06-4.13A.64.64 0 0 1 12 2.6Z" fill="url(#wm-spark)"/>
        <path d="M19 2.2c.14 0 .26.09.3.22l.37 1.45c.13.5.52.89 1.02 1.02l1.45.37a.31.31 0 0 1 0 .6l-1.45.37c-.5.13-.89.52-1.02 1.02l-.37 1.45a.31.31 0 0 1-.6 0l-.37-1.45a1.5 1.5 0 0 0-1.02-1.02l-1.45-.37a.31.31 0 0 1 0-.6l1.45-.37c.5-.13.89-.52 1.02-1.02l.37-1.45a.31.31 0 0 1 .3-.22Z" fill="url(#wm-spark)"/>
      </svg>
      <span>Built with&nbsp;<b>Tuya AI</b></span>
    `;
    shadow.appendChild(anchor);
    document.documentElement.appendChild(host);
  };

  const init = async () => {
    try {
      const config = await fetchConfig();
      if (config.show) {
        mount(config.link || DEFAULT_LINK);
      }
    } catch {
      mount(DEFAULT_LINK);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void init());
  } else {
    void init();
  }
}

import { domToPng } from 'modern-screenshot';

type CoverCaptureRequest = {
  type: 'APP_COVER_CAPTURE_REQUEST';
  requestId?: string;
  payload?: {
    width?: number;
    height?: number;
    scale?: number;
  };
};

const RESPONSE_TYPE = 'APP_COVER_CAPTURE_RESPONSE';

function waitForPaint(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => resolve(), 3000);
  });
}

function waitForFonts(): Promise<void> {
  return document.fonts?.ready?.then(() => undefined).catch(() => undefined) ?? Promise.resolve();
}

function waitForImages(): Promise<void> {
  const images = Array.from(document.images).filter(image => !image.complete);
  if (images.length === 0) return Promise.resolve();

  return Promise.all(images.map(image => new Promise<void>(resolve => {
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => resolve(), { once: true });
  }))).then(() => undefined);
}

async function waitForPageStable(): Promise<void> {
  await waitForFonts();
  await waitForImages();
  await waitForPaint();
}

function getPageSize(): { width: number; height: number } {
  const doc = document.documentElement;
  const body = document.body;

  return {
    width: Math.max(
      doc.clientWidth,
      doc.scrollWidth,
      doc.offsetWidth,
      body?.scrollWidth ?? 0,
      body?.offsetWidth ?? 0,
    ),
    height: Math.max(
      doc.clientHeight,
      doc.scrollHeight,
      doc.offsetHeight,
      body?.scrollHeight ?? 0,
      body?.offsetHeight ?? 0,
    ),
  };
}

function cropViewport(sourceDataUrl: string, left: number, top: number, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(image, -left, -top);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => reject(new Error('Failed to load screenshot image'));
    image.src = sourceDataUrl;
  });
}

if (typeof window !== 'undefined' && window !== window.parent) {
  window.addEventListener('message', async (event: MessageEvent<CoverCaptureRequest>) => {
    if (event.data?.type !== 'APP_COVER_CAPTURE_REQUEST') return;

    const { requestId, payload } = event.data;
    try {
      await waitForPageStable();
      const pageSize = getPageSize();
      const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft || 0;
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop || 0;
      const screenshot = await domToPng(document.body, {
        width: pageSize.width,
        height: pageSize.height,
        scale: payload?.scale ?? 1,
        backgroundColor: 'transparent',
        fetch: {
          requestInit: { cache: 'force-cache' },
        },
        style: {
          transform: 'none',
        },
      });
      const captureWidth = payload?.width ?? window.innerWidth;
      const captureHeight = payload?.height ?? window.innerHeight;
      const imageDataUrl = await cropViewport(screenshot, scrollLeft, scrollTop, captureWidth, captureHeight);

      window.parent.postMessage({
        type: RESPONSE_TYPE,
        requestId,
        payload: { imageDataUrl },
      }, '*');
    } catch (error) {
      window.parent.postMessage({
        type: RESPONSE_TYPE,
        requestId,
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
      }, '*');
    }
  });
}

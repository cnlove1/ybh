/**
 * 开发环境下，将页面错误通过 postMessage 发送给父级 iframe。
 * 错误会缓冲 200ms 后批量发送。
 * 消息格式: { type: 'APP_ERROR', payload: Array<{ message, stack?, source? }> }
 *
 * 使用方式: 在 src/instrumentation-client.ts 中 import '@/extension/dev-error-report'
 */

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && window !== window.parent) {
  type ErrorInfo = { message: string; stack?: string; source?: string };

  const buffer: ErrorInfo[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (buffer.length === 0) return;
    window.parent.postMessage({ type: 'APP_ERROR', payload: [...buffer] }, '*');
    buffer.length = 0;
    timer = null;
  };

  const collect = (error: ErrorInfo) => {
    buffer.push(error);
    if (!timer) {
      timer = setTimeout(flush, 200);
    }
  };

  window.addEventListener('error', (event: ErrorEvent) => {
    collect({
      message: event.message,
      stack: event.error?.stack,
      source: `${event.filename}:${event.lineno}:${event.colno}`,
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    collect({
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      source: 'unhandledrejection',
    });
  });
}

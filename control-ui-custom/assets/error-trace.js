(function () {
  window.addEventListener('error', (event) => {
    console.error('[OpenClaw bootstrap error]', event.error?.stack || event.message || event);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[OpenClaw bootstrap rejection]', event.reason?.stack || event.reason || event);
  });
})();
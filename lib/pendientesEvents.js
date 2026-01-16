export const emitPendientesUpdated = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('pendientes-updated'));
  try {
    const channel = new BroadcastChannel('pendientes-updated');
    channel.postMessage('updated');
    channel.close();
  } catch (e) {
    // noop
  }
};

export const subscribePendientesUpdated = (callback) => {
  if (typeof window === 'undefined') return () => {};

  const handler = () => callback();
  const onFocus = () => callback();
  const onVisibility = () => {
    if (document.visibilityState === 'visible') callback();
  };

  window.addEventListener('pendientes-updated', handler);
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);

  let channel;
  try {
    channel = new BroadcastChannel('pendientes-updated');
    channel.onmessage = handler;
  } catch (e) {
    // noop
  }

  return () => {
    window.removeEventListener('pendientes-updated', handler);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
    if (channel) channel.close();
  };
};

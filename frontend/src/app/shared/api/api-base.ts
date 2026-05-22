export function resolveApiBase(): string {
  if (typeof window === 'undefined') {
    return '/api';
  }

  const { hostname, port, protocol } = window.location;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isBackendPort = port === '3001';
  const isFrontendDevPort = port === '4200';

  if (isLocalHost && !isBackendPort && !isFrontendDevPort) {
    return `${protocol}//${hostname}:3001/api`;
  }

  return '/api';
}
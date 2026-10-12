/**
 * Absolute URL of an in-app route, honouring the deploy base path (e.g.
 * GitHub Pages serves the app under `/<repo>/`; Vercel/Netlify under `/`).
 * `import.meta.env.BASE_URL` comes from Vite's `base` option.
 */
export function appPath(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Same as {@link appPath}, prefixed with the current origin. */
export function appUrl(path: string): string {
  return `${window.location.origin}${appPath(path)}`;
}

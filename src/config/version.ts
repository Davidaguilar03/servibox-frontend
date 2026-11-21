// Version de la app: la inyecta vite.config.ts desde package.json. Ver docs/ai-context/02-CONVENTIONS.md.
declare const __APP_VERSION__: string

export const APP_VERSION = __APP_VERSION__

/** Como se muestra en la interfaz: v1.1.0. */
export const APP_VERSION_LABEL = `v${APP_VERSION}`

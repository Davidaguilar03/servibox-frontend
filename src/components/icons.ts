/**
 * Tamanos de icono Lucide del sistema (tokens --icon-sm, --icon-md e --icon-lg de tokens.css)
 * con un solo grosor de trazo. Se esparcen en el icono: `<X {...iconSm} aria-hidden />`.
 * Ningun icono lleva tamano en px suelto. Ver docs/ai-context/05-DESIGN-SYSTEM.md.
 */
export const ICON_STROKE = 1.5

/** 16 px: en linea con texto y dentro de botones. */
export const iconSm = { size: 16, strokeWidth: ICON_STROKE }

/** 20 px: menu y acciones de fila. */
export const iconMd = { size: 20, strokeWidth: ICON_STROKE }

/** 24 px: estados vacios y encabezados. */
export const iconLg = { size: 24, strokeWidth: ICON_STROKE }

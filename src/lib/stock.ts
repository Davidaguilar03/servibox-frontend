/**
 * Estado de stock replicado de Autollantas (StockAlertsController.analizarProducto e
 * InventoryService.getStockAlertBreakdown). Regla en docs/ai-context/03-DECISIONS.md.
 */
export type StockStatus = 'NORMAL' | 'BAJO' | 'CRITICO'

/** Umbrales por defecto de Autollantas cuando la categoria no trae los suyos. */
export const DEFAULT_YELLOW_STOCK_MIN = 5
export const DEFAULT_RED_STOCK_MIN = 2

export interface StockThresholds {
  yellowStockMin: number | null
  redStockMin: number | null
}

/** Critico si stock <= rojo; bajo si stock <= amarillo; normal en otro caso. */
export function stockStatus(quantity: number | null, thresholds?: StockThresholds): StockStatus {
  const stock = quantity ?? 0
  const red = thresholds?.redStockMin ?? DEFAULT_RED_STOCK_MIN
  const yellow = thresholds?.yellowStockMin ?? DEFAULT_YELLOW_STOCK_MIN
  if (stock <= red) return 'CRITICO'
  if (stock <= yellow) return 'BAJO'
  return 'NORMAL'
}

interface StockProduct {
  quantity: number | null
  categoryId: number | null
}

interface StockCategory extends StockThresholds {
  id: number
}

/** Productos bajos o criticos, de menor a mayor stock, con su estado. */
export function lowStockProducts<P extends StockProduct>(
  products: P[],
  categories: StockCategory[],
  limit: number,
): Array<P & { status: StockStatus }> {
  const byId = new Map(categories.map((category) => [category.id, category]))
  return products
    .map((product) => ({
      ...product,
      status: stockStatus(product.quantity, product.categoryId === null ? undefined : byId.get(product.categoryId)),
    }))
    .filter((product) => product.status !== 'NORMAL')
    .sort((a, b) => (a.quantity ?? 0) - (b.quantity ?? 0))
    .slice(0, limit)
}

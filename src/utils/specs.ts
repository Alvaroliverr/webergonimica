import type { Product } from "../data/products";

// Tamaño del tablero (ancho × fondo, en cm) tal y como consta en la ficha del escritorio.
export function deskSize(p: Product): { width: number; depth: number; label: string } | null {
  const m = `${p.ajuste} ${p.materiales} ${p.nombre} ${p.id}`.match(/(\d{2,3})\s*[×x]\s*(\d{2,3})/);
  if (!m) return null;
  const width = Number(m[1]);
  const depth = Number(m[2]);
  return { width, depth, label: `${width}×${depth} cm` };
}

export const eur = (n: number) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export const isAccessory = (p: Product) => /brazo|soporte/i.test(p.nombre);

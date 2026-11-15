// Capa de acceso a la base de datos central de afiliados (src/data/products.json).
// Los componentes y páginas NUNCA deben importar products.json directamente:
// siempre a través de estas funciones, para que un cambio de forma en el JSON
// solo se tenga que arreglar en un sitio.
import raw from "./products.json";

export interface Faq {
  pregunta: string;
  respuesta: string;
}

export interface Product {
  id: string;
  categoria: string;
  nombre: string;
  marca: string;
  asin: string;
  imagen: string;
  precio_aproximado: string;
  precio_raw: string;
  precio_anterior?: string;
  en_oferta?: boolean;
  badge_oferta?: string;
  amazon_affiliate_link: string;
  insignia: string;
  capacidad_carga: string;
  ajuste: string;
  garantia: string;
  puntuacion_setuppro: number;
  valoracion_amazon: number;
  num_opiniones: number;
  introduccion: string;
  materiales: string;
  pros: string[];
  contras: string[];
  preguntas_frecuentes: Faq[];
  comprala_si?: string[];
  evitala_si?: string[];
}

const products = (raw as { products: Product[] }).products;

export function getAllProducts(): Product[] {
  return products;
}

export function getProductsByCategory(categoria: string): Product[] {
  return products.filter((p) => p.categoria === categoria);
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

/** Enlace de afiliado listo para usar en un CTA — siempre desde el JSON central. */
export function getAffiliateLink(productId: string): string {
  const p = getProductById(productId);
  return p ? p.amazon_affiliate_link : "https://www.amazon.es/?tag=eldeskops-21";
}

/**
 * Puntos de decisión rápida ("Cómprala si..." / "Evítala si...")
 * inspirados en los mejores patrones de conversión técnica.
 */
export function getDecisionPoints(product: Product): { buyIf: string[]; avoidIf: string[] } {
  if (product.comprala_si && product.evitala_si && product.comprala_si.length > 0) {
    return { buyIf: product.comprala_si, avoidIf: product.evitala_si };
  }

  const buyIf: string[] = [];
  const avoidIf: string[] = [];

  if (product.categoria === "sillas-ergonomicas") {
    buyIf.push(`Pasas más de 5-6 horas diarias sentado y priorizas la salud lumbar activa.`);
    if (product.pros && product.pros.length > 0) {
      buyIf.push(product.pros[0]);
      if (product.pros[1]) buyIf.push(product.pros[1]);
    }
    if (product.contras && product.contras.length > 0) {
      avoidIf.push(`Te preocupa especialmente: ${product.contras[0].toLowerCase()}`);
      if (product.contras[1]) avoidIf.push(product.contras[1]);
    }
  } else if (product.categoria === "escritorios-elevables") {
    buyIf.push(`Quieres alternar entre trabajar de pie y sentado para reactivar la circulación.`);
    if (product.pros && product.pros.length > 0) {
      buyIf.push(product.pros[0]);
      if (product.pros[1]) buyIf.push(product.pros[1]);
    }
    if (product.contras && product.contras.length > 0) {
      avoidIf.push(`Limitación de uso: ${product.contras[0].toLowerCase()}`);
      if (product.contras[1]) avoidIf.push(product.contras[1]);
    }
  } else {
    buyIf.push(`Buscas mejorar tu postura y ángulo de visión para evitar tensión cervical.`);
    if (product.pros && product.pros.length > 0) {
      buyIf.push(product.pros[0]);
      if (product.pros[1]) buyIf.push(product.pros[1]);
    }
    if (product.contras && product.contras.length > 0) {
      avoidIf.push(`Punto a revisar: ${product.contras[0].toLowerCase()}`);
      if (product.contras[1]) avoidIf.push(product.contras[1]);
    }
  }

  return { buyIf, avoidIf };
}

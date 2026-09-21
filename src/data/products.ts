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
export function getAffiliateLink(id: string): string {
  const product = getProductById(id);
  if (!product) throw new Error(`Producto "${id}" no encontrado en products.json`);
  return product.amazon_affiliate_link;
}

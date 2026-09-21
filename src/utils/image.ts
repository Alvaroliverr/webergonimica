// Pide al CDN de Amazon un recorte más pequeño de la imagen en vez de servir
// siempre la versión de 1500px, incluso en miniaturas de 40-44px.
export function resizeAmazonImage(url: string, size: number): string {
  return url.replace(/\._AC_SL\d+_\./, `._AC_SL${size}_.`);
}

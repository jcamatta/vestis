/** "https://www.adidas.com.ar/..." → "adidas.com.ar" */
export const siteFromUrl = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

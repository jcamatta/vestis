// Vestis extension — content script.
// Remembers where the user right-clicked, finds the best product image there, and shows small toasts.
// On the Vestis app it passes "find where to buy" requests to the worker; on a Google Lens results page it reads the products.

(() => {
  if (window.__vestisLoaded) return;
  window.__vestisLoaded = true;

  /** Attributes shops use for the full-size image behind a thumbnail or zoom. */
  const ZOOM_ATTRIBUTES = ['data-zoom-image', 'data-zoom', 'data-large_image', 'data-old-hires', 'data-full', 'data-src-large', 'data-src'];

  let lastPoint = null;

  document.addEventListener('contextmenu', (event) => {
    lastPoint = { x: event.clientX, y: event.clientY };
  }, true);

  const absolute = (url) => {
    try {
      return new URL(url, document.baseURI).href;
    } catch {
      return '';
    }
  };

  /** Largest candidate of a srcset: by width descriptor, else density, else the last one. */
  const largestFromSrcset = (srcset) => {
    const candidates = srcset
      .split(/,\s+(?=\S)/)
      .map((part) => part.trim().split(/\s+/))
      .filter((bits) => bits[0])
      .map((bits) => {
        const descriptor = bits[1] || '1x';
        return { url: bits[0], size: parseFloat(descriptor) * (descriptor.endsWith('x') ? 1000 : 1) };
      });
    if (candidates.length === 0) return '';
    return candidates.reduce((a, b) => (b.size >= a.size ? b : a)).url;
  };

  const fromImg = (img) => {
    const zoom = ZOOM_ATTRIBUTES.map((name) => img.getAttribute(name)).find((v) => v && /^(https?:|\/)/.test(v));
    if (zoom) return absolute(zoom);
    const picture = img.closest('picture');
    const sources = picture ? Array.from(picture.querySelectorAll('source[srcset]')).map((s) => s.getAttribute('srcset')) : [];
    const srcset = [img.getAttribute('srcset'), ...sources].filter(Boolean).map(largestFromSrcset).find(Boolean);
    return absolute(srcset || img.currentSrc || img.src);
  };

  const fromBackground = (element) => {
    const match = /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(element).backgroundImage || '');
    return match ? absolute(match[1]) : '';
  };

  /** Topmost image under the point, looking through overlays such as zoom lenses. */
  const imageAt = (point) => {
    const stack = document.elementsFromPoint(point.x, point.y);
    for (const element of stack) {
      if (element instanceof HTMLImageElement && element.naturalWidth >= 200) return fromImg(element);
      const inner = element.querySelector && element.querySelector(':scope > img, :scope > picture > img');
      if (inner instanceof HTMLImageElement && inner.naturalWidth >= 200) {
        const r = inner.getBoundingClientRect();
        if (point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom) return fromImg(inner);
      }
    }
    for (const element of stack) {
      const background = fromBackground(element);
      if (background) return background;
    }
    return '';
  };

  const pageTitle = () => {
    const og = document.querySelector('meta[property="og:title"]');
    const h1 = document.querySelector('h1');
    return ((og && og.content) || (h1 && h1.textContent) || document.title || '').trim().slice(0, 200);
  };

  const toBase64 = async (url) => {
    const blob = await (await fetch(url)).blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  };

  const target = async () => {
    const imageUrl = lastPoint ? imageAt(lastPoint) : '';
    const local = /^(blob|data):/.test(imageUrl);
    return {
      imageUrl,
      imageBase64: local ? await toBase64(imageUrl) : undefined,
      pageUrl: location.href,
      pageTitle: pageTitle(),
    };
  };

  let toastHost = null;

  const showToast = (input) => {
    if (window.top !== window) return;
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;';
      toastHost.attachShadow({ mode: 'open' });
      document.documentElement.appendChild(toastHost);
    }
    const box = document.createElement('div');
    const colors = input.kind === 'error' ? 'background:#fff;color:#000;border:1px solid #000;' : 'background:#000;color:#fff;border:1px solid #000;';
    box.style.cssText = `${colors}font:12px/1.4 ui-monospace,monospace;padding:8px 12px;margin-top:8px;max-width:360px;border-radius:0;box-shadow:none;`;
    box.textContent = `VESTIS — ${input.text}`;
    toastHost.shadowRoot.replaceChildren(box);
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => box.remove(), input.kind === 'info' ? 8000 : 5000);
  };

  /** The Vestis web app (dev server or served by the local server). */
  const APP_ORIGINS = ['http://127.0.0.1:5174', 'http://localhost:5174', 'http://127.0.0.1:3100', 'http://localhost:3100'];

  if (window.top === window && APP_ORIGINS.includes(location.origin)) {
    document.documentElement.dataset.vestisExtension = chrome.runtime.getManifest().version;
    window.addEventListener('message', (event) => {
      if (event.source !== window || !event.data || event.data.type !== 'vestis:lens') return;
      chrome.runtime.sendMessage({ type: 'vestis:lens', extractionId: event.data.extractionId, items: event.data.items });
    });
  }

  /** "$" alone is the local currency: the user is in Argentina. */
  const LOCAL_CURRENCY = 'ARS';
  const PRICE = /(US\$|U\$S|R\$|ARS|USD|EUR|€|£|\$)\s?(\d[\d.,\u00a0 ]*\d|\d)/;
  const CURRENCIES = { 'US$': 'USD', U$S: 'USD', USD: 'USD', R$: 'BRL', ARS: 'ARS', EUR: 'EUR', '€': 'EUR', '£': 'GBP', $: LOCAL_CURRENCY };

  /** "74.999,00" → 74999, "1,299.50" → 1299.5, "189.999" → 189999. */
  const amount = (text) => {
    const digits = text.replace(/[\s\u00a0]/g, '');
    const last = Math.max(digits.lastIndexOf('.'), digits.lastIndexOf(','));
    const decimals = last >= 0 && /^\d{1,2}$/.test(digits.slice(last + 1));
    const whole = decimals ? digits.slice(0, last) : digits;
    const value = Number(whole.replace(/[.,]/g, '') + (decimals ? `.${digits.slice(last + 1)}` : ''));
    return Number.isFinite(value) ? value : null;
  };

  const isGoogle = (url) => /(^|\.)(google\.[a-z.]+|gstatic\.com|googleusercontent\.com)$/.test(url.hostname);

  /** The shop page behind a link: Google redirects are unwrapped when they carry the target, other Google links kept as they are. */
  const shopUrl = (href) => {
    try {
      const url = new URL(href);
      if (!/^https?:$/.test(url.protocol)) return '';
      if (!isGoogle(url)) return url.href;
      const target = url.searchParams.get('url') || url.searchParams.get('q') || url.searchParams.get('adurl');
      return target && /^https?:/.test(target) ? target : url.href;
    } catch {
      return '';
    }
  };

  /** "6x ARS 31,667.00" is an instalment, not the price. */
  const INSTALMENT = /^\s*\d+\s*x\s/i;

  /** Elements whose own text is a price, in page order. */
  const priceElements = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const found = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent || '';
      if (PRICE.test(text) && !INSTALMENT.test(text) && node.parentElement) found.push(node.parentElement);
    }
    return found;
  };

  /** The product card around a price: the smallest box above it that also holds an image, if it stays card-sized. */
  const cardAround = (element) => {
    for (let box = element, depth = 0; box && box !== document.body && depth < 10; box = box.parentElement, depth += 1) {
      if ((box.innerText || '').length > 500) return null;
      if (box.querySelector('img')) return box;
    }
    return null;
  };

  /** The card's link: a shop site first, then Google's redirect or product page. */
  const cardUrl = (card) => {
    const urls = [card.closest('a[href]'), ...card.querySelectorAll('a[href]')].filter(Boolean).map((a) => shopUrl(a.href)).filter(Boolean);
    return urls.find((u) => !isGoogle(new URL(u))) || urls[0] || '';
  };

  /** Every product card with a price on a Lens results page, in page order; `prices` says how many prices the page shows at all. */
  const readLens = () => {
    const cards = new Set();
    const seen = new Set();
    const offers = [];
    const prices = priceElements();
    for (const element of prices) {
      const card = cardAround(element);
      if (!card || cards.has(card)) continue;
      cards.add(card);
      const url = cardUrl(card);
      if (!url || seen.has(url)) continue;
      const lines = card.innerText.split('\n').map((line) => line.trim()).filter(Boolean);
      const at = lines.findIndex((line) => PRICE.test(line) && !INSTALMENT.test(line));
      if (at < 0) continue;
      const match = PRICE.exec(lines[at]);
      const longest = (list) => list.filter((line) => line.length > 3 && !PRICE.test(line)).sort((x, y) => y.length - x.length)[0];
      // Above the price the product name is the longest line (shorter ones are the source, e.g. "Nike Argentina").
      const title = longest(lines.slice(0, at)) || longest(lines.slice(at + 1)) || '';
      if (!title) continue;
      const site = new URL(url);
      // The card names the shop on the line after the price ("Moov", "Dexter"); else the link's site.
      const named = lines.slice(at + 1).find((line) => !PRICE.test(line) && !/[·\d★]/.test(line) && line.length <= 40);
      const shop = named || (isGoogle(site) ? 'Google' : site.hostname.replace(/^www\./, ''));
      seen.add(url);
      const price = amount(match[2]);
      offers.push({ shop: shop.slice(0, 200), title: title.slice(0, 400), url, price, currency: price === null ? null : CURRENCIES[match[1]] || null });
    }
    return { offers: offers.slice(0, 50), prices: prices.length };
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === 'vestis:get-target') {
      target().then(sendResponse);
      return true;
    }
    if (message && message.type === 'vestis:read-lens') {
      sendResponse(window.top === window ? { ...readLens(), url: location.href } : { offers: [], prices: 0, url: location.href });
      return false;
    }
    if (message && message.type === 'vestis:toast') {
      showToast(message);
      sendResponse(true);
    }
    return false;
  });
})();

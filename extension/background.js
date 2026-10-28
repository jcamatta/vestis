// Vestis extension — service worker.
// Right-click → "Add to Vestis" → section, or "Extract outfit (Vestis)" for a photo of a dressed person. Asks the page for the best image under the pointer,
// fetches its bytes (this worker has host permissions, so no CORS), and posts them to the local server.
// "Find where to buy" in the app: opens one Google Lens tab per cut-out, reads the products there, and posts them to the server.

const SERVER = 'http://127.0.0.1:3100';
const APP = 'http://127.0.0.1:5174';

const MENU = [
  { id: 'auto', title: 'Let Claude decide the section' },
  { id: 'head', title: 'Head (hat, cap, beanie)' },
  { id: 'eyewear', title: 'Glasses' },
  { id: 'top', title: 'Top' },
  { id: 'bottom', title: 'Pants' },
  { id: 'shoes', title: 'Shoes' },
];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'vestis', title: 'Add to Vestis', contexts: ['all'] });
    MENU.forEach((item) => chrome.contextMenus.create({ id: item.id, parentId: 'vestis', title: item.title, contexts: ['all'] }));
    chrome.contextMenus.create({ id: 'extract', title: 'Extract outfit (Vestis)', contexts: ['all'] });
  });
});

// The dev web server when it runs (npm run dev), otherwise the built app served by the server (Start Vestis).
chrome.action.onClicked.addListener(async () => {
  const devUp = await fetch(APP, { method: 'HEAD' }).then((response) => response.ok, () => false);
  chrome.tabs.create({ url: devUp ? APP : SERVER });
});

/** Sends a message to one frame of a tab; resolves undefined when nothing answers. */
const ask = (input) =>
  new Promise((resolve) => {
    chrome.tabs.sendMessage(input.tabId, input.message, { frameId: input.frameId }, (response) => {
      resolve(chrome.runtime.lastError ? undefined : response);
    });
  });

const toast = (input) => ask({ tabId: input.tabId, frameId: 0, message: { type: 'vestis:toast', text: input.text, kind: input.kind } });

const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

/** Image bytes as base64, or undefined if the shop refuses (the server then tries the URL itself). */
const fetchImage = async (url) => {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return undefined;
    return toBase64(await response.arrayBuffer());
  } catch {
    return undefined;
  }
};

/** Finds the photo under the pointer and posts it with the page info; `extra` goes into the body as-is. */
const send = async (input) => {
  const { info, tab, path, extra, words } = input;
  const target = (await ask({ tabId: tab.id, frameId: info.frameId ?? 0, message: { type: 'vestis:get-target' } })) ?? {};
  const imageUrl = target.imageUrl || info.srcUrl;
  if (!imageUrl) {
    await toast({ tabId: tab.id, text: 'No photo under the pointer. Right-click the photo itself.', kind: 'error' });
    return;
  }
  await toast({ tabId: tab.id, text: words.sending, kind: 'info' });
  const imageBase64 = target.imageBase64 || (await fetchImage(imageUrl));
  try {
    const response = await fetch(`${SERVER}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl,
        imageBase64,
        pageUrl: target.pageUrl || tab.url || '',
        pageTitle: target.pageTitle || tab.title || '',
        ...extra,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `${response.status}`);
    await toast({ tabId: tab.id, text: words.done(body), kind: 'ok' });
  } catch (error) {
    const reason = error instanceof TypeError ? 'Vestis is not running: open Start Vestis (or npm run dev in the vestis folder).' : String(error.message || error);
    await toast({ tabId: tab.id, text: `${words.failed}: ${reason}`, kind: 'error' });
  }
};

const addGarment = (input) =>
  send({
    ...input,
    path: '/api/garments',
    extra: { slot: input.info.menuItemId === 'auto' ? null : input.info.menuItemId },
    words: { sending: 'Adding to Vestis…', done: (body) => `Added: ${body.name || 'garment'}. Claude is reading it.`, failed: 'Not added' },
  });

const extractOutfit = (input) =>
  send({
    ...input,
    path: '/api/extractions',
    extra: {},
    words: { sending: 'Sending the outfit to Vestis…', done: () => 'Sent to the Extract tab. Claude is listing the items.', failed: 'Not sent' },
  });

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || tab.id === undefined || info.menuItemId === 'vestis') return;
  if (info.menuItemId === 'extract') extractOutfit({ info, tab });
  else addGarment({ info, tab });
});

// ——— Find where to buy: Google Lens ———

/** Waits after a Lens page loads, then reads it again until products show up (results render late). */
const READ_DELAY_MS = 2500;
const READ_TRIES = 8;
/** An item whose Lens page never loads gives up after this. */
const ITEM_TIMEOUT_MS = 90_000;

/** Cut-outs waiting for their lens.html page to ask for them: key → { base64, name }. */
const images = new Map();
/** Open Lens tabs: tabId → { job, index, reading }. */
const lensTabs = new Map();

const isAppSender = (sender) => {
  try {
    return ['http://127.0.0.1:5174', 'http://localhost:5174', 'http://127.0.0.1:3100', 'http://localhost:3100'].includes(new URL(sender.url).origin);
  } catch {
    return false;
  }
};

const postResults = async (job) => {
  try {
    await fetch(`${SERVER}/api/extractions/${job.extractionId}/shop-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [...job.results.values()] }),
    });
  } catch {
    // The server times the search out by itself.
  }
};

/** Records one item's result; when every item has one, sends them all. */
const finishItem = (input) => {
  const { job, index, offers, error } = input;
  if (job.results.has(index)) return;
  job.results.set(index, { index, offers, error });
  if (job.results.size === job.expected) void postResults(job);
};

const readTab = async (tabId) => {
  const entry = lensTabs.get(tabId);
  if (!entry || entry.reading) return;
  entry.reading = true;
  let answer;
  for (let attempt = 0; attempt < READ_TRIES && !(answer && answer.offers.length > 0); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, READ_DELAY_MS));
    answer = (await ask({ tabId, frameId: 0, message: { type: 'vestis:read-lens' } })) || answer;
  }
  lensTabs.delete(tabId);
  const offers = (answer && answer.offers) || [];
  // Prices on the page but no product read: the layout is one the reader does not know, which is not "nothing found".
  const error = !answer
    ? 'the Lens page did not answer'
    : offers.length === 0 && answer.prices > 0
      ? `the page shows ${answer.prices} prices but no product could be read`
      : null;
  finishItem({ job: entry.job, index: entry.index, offers, error });
};

chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.status !== 'complete' || !lensTabs.has(tabId) || !tab.url || !/^https:\/\/(lens|www)\.google\./.test(tab.url)) return;
  void readTab(tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const entry = lensTabs.get(tabId);
  if (!entry) return;
  lensTabs.delete(tabId);
  finishItem({ job: entry.job, index: entry.index, offers: [], error: 'the Lens tab was closed' });
});

const imageBase64 = async (path) => {
  const response = await fetch(`${SERVER}${path}`);
  if (!response.ok) throw new Error(`${response.status}`);
  return toBase64(await response.arrayBuffer());
};

/** One Lens tab per item, opened in the background; the results come back from the tabs as they load. */
const startLens = async (input) => {
  const job = { extractionId: input.extractionId, expected: input.items.length, results: new Map() };
  for (const item of input.items) {
    try {
      const key = crypto.randomUUID();
      images.set(key, { base64: await imageBase64(item.imageUrl), name: item.name });
      const tab = await chrome.tabs.create({ url: chrome.runtime.getURL(`lens.html#${key}`), active: false });
      lensTabs.set(tab.id, { job, index: item.index, reading: false });
      setTimeout(() => {
        if (!lensTabs.has(tab.id)) return;
        lensTabs.delete(tab.id);
        finishItem({ job, index: item.index, offers: [], error: 'the Lens page did not load in time' });
      }, ITEM_TIMEOUT_MS);
    } catch (error) {
      finishItem({ job, index: item.index, offers: [], error: `could not open Lens (${error.message || error})` });
    }
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'vestis:lens' && isAppSender(sender) && Array.isArray(message.items)) {
    void startLens(message);
    return false;
  }
  if (message && message.type === 'vestis:lens-image' && sender.url && sender.url.startsWith(chrome.runtime.getURL('lens.html'))) {
    const image = images.get(message.key);
    images.delete(message.key);
    sendResponse(image);
    return false;
  }
  return false;
});

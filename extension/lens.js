// Vestis extension — Lens upload page.
// Opened by the worker with #<key>; gets that cut-out from the worker and sends it to Google Lens the way
// Chrome's "Search image with Google" does: a form POST of the file to lens.google.com/v3/upload.

const UPLOAD = 'https://lens.google.com/v3/upload';

const fromBase64 = (base64) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

const say = (text) => {
  document.getElementById('status').textContent = `Vestis — ${text}`;
};

chrome.runtime.sendMessage({ type: 'vestis:lens-image', key: location.hash.slice(1) }, (image) => {
  if (chrome.runtime.lastError || !image) {
    say('this Lens search has expired. Press Find where to buy again.');
    return;
  }
  const input = document.createElement('input');
  input.type = 'file';
  input.name = 'encoded_image';
  const files = new DataTransfer();
  files.items.add(new File([fromBase64(image.base64)], 'item.jpg', { type: 'image/jpeg' }));
  input.files = files.files;
  const form = document.createElement('form');
  form.method = 'POST';
  form.enctype = 'multipart/form-data';
  form.action = `${UPLOAD}?ep=ccm&s=&st=${Date.now()}`;
  form.hidden = true;
  form.appendChild(input);
  document.body.appendChild(form);
  say(`searching ${image.name}…`);
  form.submit();
});

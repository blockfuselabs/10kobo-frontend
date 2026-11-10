/*
 * The 10kobo checkout button.
 *
 * 1. The shop's server makes an invoice with its secret merchant key (POST /v1/merchant/invoices) and gets its id.
 * 2. The shop's page loads this script and opens the checkout with that id:
 *
 *   <script src="https://<10kobo>/checkout.js"></script>
 *   <script>
 *     TenKobo.open(invoiceId, { onPaid: function () { ... }, onClose: function () { ... } });
 *   </script>
 *
 *   or, with the id already in the page: <script src="https://<10kobo>/checkout.js" data-invoice="<invoice id>"></script>
 *
 * No server or key: a seller's reusable payment link opens the same checkout. Each customer gets their own invoice.
 *
 *   <script src="https://<10kobo>/checkout.js"></script>
 *   <button data-10kobo-link="<payment link id>">Pay ₦3,500</button>
 *
 *   or from code: TenKobo.openLink(linkId, { onPaid: function () { ... } });
 *
 * The checkout opens over the shop's page. Pass { mode: 'tab' } to open it in a new tab instead.
 * The invoice id is not a secret. The merchant key must stay on the shop's server and never be put here.
 * onPaid is a convenience for the page: before handing over goods, the shop's server should confirm with 10kobo,
 * from a signed notice or by asking for the invoice.
 */
(function () {
  var script = document.currentScript;
  var base = script && script.src ? new URL(script.src).origin : window.location.origin;
  var ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  var current = null;

  function openTab(url) {
    var opened = window.open(url, '_blank');
    // The checkout must not be able to reach back into the shop's page.
    if (opened) opened.opener = null;
    else window.location.href = url;
  }

  function close() {
    if (!current) return;
    var closing = current;
    current = null;
    window.removeEventListener('message', closing.onMessage);
    document.removeEventListener('keydown', closing.onKey);
    closing.overlay.remove();
    document.body.style.overflow = closing.overflow;
    if (closing.options.onClose) closing.options.onClose({ invoiceId: closing.invoiceId, paid: closing.paid });
  }

  function open(invoiceId, options) {
    if (!ID.test(String(invoiceId))) throw new Error('10kobo: that is not an invoice id');
    return show(base + '/pay/' + invoiceId, { invoiceId: invoiceId }, options || {});
  }

  /** A seller's payment link. The customer's own invoice is only made once they press Pay inside the checkout. */
  function openLink(linkId, options) {
    if (!ID.test(String(linkId))) throw new Error('10kobo: that is not a payment link id');
    return show(base + '/p/' + linkId, { linkId: linkId }, options || {});
  }

  function show(url, ids, options) {
    var invoiceId = ids.invoiceId || null;
    if (options.mode === 'tab') return openTab(url);
    close();

    var overlay = document.createElement('div');
    overlay.setAttribute('data-10kobo-overlay', '');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '10kobo checkout');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(17,17,17,.6);padding:16px;box-sizing:border-box;';
    var small = window.matchMedia('(max-width: 520px)').matches;
    if (small) overlay.style.padding = '0';

    var frame = document.createElement('iframe');
    frame.src = url + '?embed=1';
    frame.title = '10kobo checkout';
    frame.setAttribute('allow', 'clipboard-write');
    frame.style.cssText =
      'border:0;background:#f5f3ee;width:' + (small ? '100%' : 'min(560px, 100%)') + ';height:' + (small ? '100%' : 'min(640px, 100%)') + ';' +
      'transition:height .15s ease;' +
      'border-radius:' + (small ? '0' : '24px') + ';box-shadow:0 20px 60px rgba(0,0,0,.35);';

    var shut = document.createElement('button');
    shut.type = 'button';
    shut.setAttribute('aria-label', 'Close checkout');
    shut.textContent = '×';
    shut.style.cssText =
      'position:absolute;top:12px;right:12px;width:40px;height:40px;border-radius:999px;border:0;background:#fff;color:#111;' +
      'font:400 26px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25);';
    shut.addEventListener('click', close);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) close();
    });

    var state = { overlay: overlay, options: options, invoiceId: invoiceId, paid: false, overflow: document.body.style.overflow };
    // Only messages from the 10kobo page inside this box count.
    state.onMessage = function (event) {
      if (event.origin !== base || event.source !== frame.contentWindow || !event.data || event.data.source !== '10kobo') return;
      var data = event.data;
      if (ids.linkId) {
        // A payment link learns its invoice from the checkout, once the customer has pressed Pay.
        if (!state.invoiceId && data.invoice && ID.test(String(data.invoice))) state.invoiceId = data.invoice;
        if (data.link === ids.linkId && data.type === 'height') data = { type: 'height', height: data.height, invoice: state.invoiceId };
      }
      if (data.invoice !== state.invoiceId) return;
      invoiceId = state.invoiceId;
      if (data.type === 'status') {
        if (options.onStatus) options.onStatus({ invoiceId: invoiceId, status: data.status });
        if (data.status === 'paid' && !state.paid) {
          state.paid = true;
          if (options.onPaid) options.onPaid({ invoiceId: invoiceId });
        }
      }
      if (data.type === 'close') close();
      // The checkout says how tall it is, so the box fits it. A phone keeps the full screen.
      if (data.type === 'height' && !small && typeof data.height === 'number') {
        frame.style.height = 'min(' + Math.max(320, Math.round(data.height)) + 'px, 100%)';
      }
    };
    state.onKey = function (event) {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('message', state.onMessage);
    document.addEventListener('keydown', state.onKey);

    overlay.appendChild(frame);
    overlay.appendChild(shut);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    current = state;
    frame.focus();
  }

  function button(invoiceId, label, options) {
    var element = document.createElement('button');
    element.type = 'button';
    element.setAttribute('data-10kobo-checkout', '');
    element.style.cssText =
      'display:inline-flex;flex-direction:column;align-items:center;gap:2px;padding:12px 22px;border:0;border-radius:14px;' +
      'background:#111;color:#fff;font:600 16px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer;';
    var title = document.createElement('span');
    title.textContent = label || 'Pay with crypto';
    var note = document.createElement('span');
    note.textContent = 'USDC or USDT from any chain, by 10kobo';
    note.style.cssText = 'font-weight:400;font-size:12px;opacity:.75';
    element.appendChild(title);
    element.appendChild(note);
    element.addEventListener('click', function () {
      open(invoiceId, options);
    });
    return element;
  }

  window.TenKobo = { open: open, openLink: openLink, close: close, button: button };
  if (script && script.dataset && script.dataset.invoice) {
    script.insertAdjacentElement('afterend', button(script.dataset.invoice, script.dataset.label, script.dataset.mode ? { mode: script.dataset.mode } : undefined));
  }
  // Any element with data-10kobo-link opens that payment link, including ones added to the page later.
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('[data-10kobo-link]') : null;
    if (!target) return;
    event.preventDefault();
    openLink(target.getAttribute('data-10kobo-link'));
  });
})();

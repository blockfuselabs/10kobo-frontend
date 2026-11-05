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
    options = options || {};
    if (!ID.test(String(invoiceId))) throw new Error('10kobo: that is not an invoice id');
    var url = base + '/pay/' + invoiceId;
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
      'border:0;background:#f5f3ee;width:' + (small ? '100%' : '480px') + ';height:' + (small ? '100%' : 'min(860px, 100%)') + ';' +
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
      if (event.data.invoice !== invoiceId) return;
      if (event.data.type === 'status') {
        if (options.onStatus) options.onStatus({ invoiceId: invoiceId, status: event.data.status });
        if (event.data.status === 'paid' && !state.paid) {
          state.paid = true;
          if (options.onPaid) options.onPaid({ invoiceId: invoiceId });
        }
      }
      if (event.data.type === 'close') close();
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

  window.TenKobo = { open: open, close: close, button: button };
  if (script && script.dataset && script.dataset.invoice) {
    script.insertAdjacentElement('afterend', button(script.dataset.invoice, script.dataset.label, script.dataset.mode ? { mode: script.dataset.mode } : undefined));
  }
})();

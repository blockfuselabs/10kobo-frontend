/*
 * The 10kobo checkout button. A shop adds it to any web page:
 *
 *   <script src="https://<10kobo>/checkout.js" data-invoice="<invoice id>"></script>
 *
 * or calls TenKobo.open(invoiceId) itself, for example after its server makes the invoice.
 * The invoice id is not a secret. The shop's merchant key must stay on the shop's server and never be put here.
 * Payment happens on 10kobo's own page, so this script never touches wallets, addresses or money.
 */
(function () {
  var script = document.currentScript;
  var base = script && script.src ? new URL(script.src).origin : window.location.origin;
  var ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  function open(invoiceId) {
    if (!ID.test(String(invoiceId))) throw new Error('10kobo: that is not an invoice id');
    var url = base + '/pay/' + invoiceId;
    var opened = window.open(url, '_blank');
    // The checkout must not be able to reach back into the shop's page.
    if (opened) opened.opener = null;
    else window.location.href = url;
  }

  function button(invoiceId, label) {
    var element = document.createElement('button');
    element.type = 'button';
    element.setAttribute('data-10kobo-checkout', '');
    element.style.cssText =
      'display:inline-flex;flex-direction:column;align-items:center;gap:2px;padding:12px 22px;border:0;border-radius:14px;' +
      'background:#111;color:#fff;font:600 16px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer;';
    var title = document.createElement('span');
    title.textContent = label || 'Pay with crypto';
    var small = document.createElement('span');
    small.textContent = 'USDC or USDT from any chain, by 10kobo';
    small.style.cssText = 'font-weight:400;font-size:12px;opacity:.75';
    element.appendChild(title);
    element.appendChild(small);
    element.addEventListener('click', function () {
      open(invoiceId);
    });
    return element;
  }

  window.TenKobo = { open: open, button: button };
  if (script && script.dataset && script.dataset.invoice) script.insertAdjacentElement('afterend', button(script.dataset.invoice, script.dataset.label));
})();

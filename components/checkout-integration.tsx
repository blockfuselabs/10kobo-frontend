'use client';
import { useState } from 'react';
import styles from './storefront.module.css';
import { CodeEditor } from './code-editor';

const examples = [
  { title: '1. Create an invoice', file: 'create-invoice.ts', where: 'YOUR SERVER', note: 'Get a merchant key yourself in the 10kobo app: Invoices, then Get a merchant key. Register your website with it, because return_url must be on that website. Calculate prices on your server and save the returned invoice ID with your order.', code: `// Server only. Never expose the merchant key in the browser.
const response = await fetch(API_URL + '/v1/merchant/invoices', {
  method: 'POST',
  headers: {
    authorization: 'Bearer ' + MERCHANT_KEY,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    reference: order.id,
    line_items: [{ description: 'Studio headphones', amount_naira: 900 }],
    return_url: SHOP_URL + '/orders/' + order.id,
  }),
});
if (!response.ok) throw new Error('Invoice creation failed');
const invoice = await response.json();
// Save invoice.id with your order. Return only that ID to the browser.` },
  { title: '2. Open checkout', file: 'checkout.html', where: 'YOUR WEBSITE', note: 'Load checkout.js from your 10kobo deployment. Your own order endpoint creates the invoice. Checkout opens over your shop; the customer stays in the purchase flow.', code: `<script src="https://YOUR_10KOBO_HOST/checkout.js"></script>
<button id="pay">Pay with 10kobo</button>
<script>
  document.getElementById('pay').onclick = async () => {
    // Your server validates the basket and creates the invoice.
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: basket }),
    });
    if (!response.ok) throw new Error('Could not create order');
    const { invoice_id } = await response.json();
    window.TenKobo.open(invoice_id, {
      onPaid: () => refreshOrderFromYourServer(),
      onClose: ({ paid }) => { if (!paid) showResumeCheckout(); },
    });
  };
</script>` },
  { title: '3. Confirm the payment', file: 'confirm-payment.ts', where: 'YOUR SERVER', note: 'Treat the browser callback as a prompt to refresh, not proof of payment. Verify the invoice on your server. Signed webhook notices can also trigger this check; validate the signature and timestamp before processing them.', code: `// Look up invoiceId from your saved order, not a browser-supplied amount.
const response = await fetch(API_URL + '/v1/merchant/invoices/' + invoiceId, {
  headers: { authorization: 'Bearer ' + MERCHANT_KEY },
  cache: 'no-store',
});
if (!response.ok) throw new Error('Payment verification unavailable');
const invoice = await response.json();

if (invoice.status === 'paid'
    && invoice.reference === order.id
    && invoice.amount_naira === order.total_naira) {
  // In a database transaction, fulfil only if not already fulfilled.
  await fulfilOrderOnce(order.id);
}
// This demo also receives signed notices at /shop/api/notices.
// Store orders and processed notices durably in production.` },
];
export function CheckoutIntegration() {
  const [tab, setTab] = useState(0);
  const [message, setMessage] = useState('');
  const example = examples[tab];
  return <section id="integration" className={styles.integration} aria-labelledby="integration-title">
    <div className={styles.integrationIntro}><span className={styles.eyebrow}>FOR MERCHANTS & DEVELOPERS</span><h2>Add 10kobo.<br />Keep your storefront.</h2><p>Connect your store in three steps. Keep your products and orders where they are, and let customers pay through 10kobo.</p><ol><li><span>01</span><div><strong>Create the invoice</strong><p>Your server sets the price and links the invoice to an order.</p></div></li><li><span>02</span><div><strong>Open checkout</strong><p>Your customer chooses a payment method without leaving your store.</p></div></li><li><span>03</span><div><strong>Confirm and fulfil</strong><p>Verify the paid invoice on your server before releasing the order.</p></div></li></ol><p className={styles.setupNote}>Get your merchant key and webhook secret yourself in the 10kobo app, under Invoices. The examples use placeholders; they do not execute payments.</p></div>
    <div className={styles.editorPanel}><CodeEditor files={examples.map((item) => ({ name: item.file, code: item.code }))} active={tab} onSelect={(index) => { setTab(index); setMessage(''); }} /><p className={styles.editorNote}><strong>{example.title.replace(/^\d\. /, '')}</strong> · runs on {example.where.toLowerCase()}. {example.note}</p></div>
  </section>;
}

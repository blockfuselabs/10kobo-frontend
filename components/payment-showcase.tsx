'use client';

import { BankIcon, CalendarIcon, CheckIcon, InvoiceIcon, NetworksIcon, PhoneIcon } from './icons';
import styles from './payment-showcase.module.css';

export function PaymentShowcase({ onSignIn }: { onSignIn: () => void }) {
  return <div className={styles.showcase}>
    <article className={styles.agent}>
      <div className={styles.copy}><span className={styles.label}>01 / AGENT PAYMENTS</span><h3>Software meets<br />the real world.</h3><p>Your agent pays in USDC. A Nigerian bank account receives naira. Connected by x402 and NEAR Intents.</p><a href="/agent">Build with x402 <span aria-hidden>→</span></a></div>
      <div className={styles.agentScene} aria-label="Example: an AI agent pays a Nigerian bank using x402">
        <div className={styles.agentNode}><NetworksIcon /><span>AI agent<small>Pays in USDC</small></span></div>
        <div className={styles.bridge}><i /><b>x402</b><i /><span aria-hidden>↓</span></div>
        <div className={styles.bankNode}><BankIcon /><span>Nigerian bank<small>Receives naira</small></span><CheckIcon /></div>
        <span className={styles.sceneNote}>Digital instructions. Everyday payments.</span>
      </div>
    </article>
    <article className={styles.merchant}>
      <span className={styles.label}>02 / FOR YOUR BUSINESS</span><h3>Your work.<br />Your way to get paid.</h3><p>One invoice or checkout. Naira or crypto.</p>
      <div className={styles.receiptScene} aria-label="Example invoice with naira and crypto payment options">
        <div className={styles.receipt}><InvoiceIcon /><small>DESIGN SERVICES</small><strong>₦25,000</strong><div><span>Bank transfer</span><span>Crypto</span></div><footer>10kobo <span>INVOICE / 1042</span></footer></div>
        <span className={styles.paid}><CheckIcon /> Payment received</span>
      </div>
      <a href="/shop">Explore checkout <span aria-hidden>→</span></a>
    </article>
    <div className={styles.daily}>
      <article><div className={`${styles.mini} ${styles.chat}`} aria-hidden><span>Send ₦5,000 to Mum</span><span><CheckIcon /> Ready for your approval</span></div><h3>Just say it.</h3><p>Ask 10kobo. Review the details. Approve.</p><button onClick={onSignIn}>Pay by chat <span aria-hidden>→</span></button></article>
      <article><div className={`${styles.mini} ${styles.transfer}`} aria-hidden><span>$</span><span>→</span><span>₦</span></div><h3>Make their day.</h3><p>Send naira to a Nigerian bank account.</p><button onClick={onSignIn}>Send money <span aria-hidden>→</span></button></article>
      <article><div className={`${styles.mini} ${styles.phone}`} aria-hidden><PhoneIcon /><span>Stay connected.<small>Airtime + data</small></span><i /><i /><i /></div><h3>A little top-up.</h3><p>Airtime and data for you or someone else.</p><button onClick={onSignIn}>Buy a top-up <span aria-hidden>→</span></button></article>
      <article><div className={`${styles.mini} ${styles.schedule}`} aria-hidden><span><small>EVERY MONTH</small><b>28</b></span><CalendarIcon /></div><h3>Right on time.</h3><p>Approve a schedule. Let the next payment come to you.</p><button onClick={onSignIn}>Schedule a payment <span aria-hidden>→</span></button></article>
    </div>
  </div>;
}

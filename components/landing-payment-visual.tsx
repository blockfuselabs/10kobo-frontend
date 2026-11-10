'use client';

import { useEffect, useState } from 'react';
import { ArrowOutIcon, BankIcon, CheckIcon, InvoiceIcon, Logo, WalletIcon } from './icons';
import styles from './welcome.module.css';

const stages = ['Payment requested', 'Converting USDC to naira', 'Naira delivered', 'Naira payment received', 'Converting naira to USDC', 'USDC received in your wallet'] as const;

export function LandingPaymentVisual() {
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(preference.matches);
    const visibility = () => setHidden(document.hidden);
    motion(); visibility();
    preference.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    return () => { preference.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (paused || reduced || hidden) return;
    const timer = setTimeout(() => setStage(value => (value + 1) % stages.length), stage % 3 === 2 ? 2600 : 1800);
    return () => clearTimeout(timer);
  }, [stage, paused, reduced, hidden]);
  const shown = reduced ? 2 : stage;
  const reverse = shown >= 3;
  const phase = shown % 3;
  return (
    <div className={styles.paymentVisual} data-paused={paused || reduced || hidden} data-stage={phase} data-direction={reverse ? "to-usdc" : "to-naira"}>
      <div className={styles.paymentCanvas}>
        <div className={styles.paymentOrbit} aria-hidden /><div className={styles.paymentOrbitInner} aria-hidden />
        <button type="button" className={styles.paymentCoin} onClick={() => setPaused(value => !value)} aria-label={paused ? "Play payment animation" : "Pause payment animation"} aria-pressed={paused} title={paused ? "Play animation" : "Pause animation"}>$</button>
        <div className={styles.senderCard}>
          <div className={styles.senderTop}><WalletIcon /><span>YOUR WALLET</span><span className={styles.senderNetwork}>NEAR</span></div>
          <strong>USDC<span>{reduced ? "Send or receive USDC." : reverse ? (phase === 2 ? "USDC received." : "Receiving from naira…") : (phase === 0 ? "Ready to move." : phase === 1 ? "Sending as naira…" : "Delivered as naira.")}</span></strong>
          <div className={styles.senderFoot}><span>One payment. Across networks.</span><ArrowOutIcon /></div>
        </div>
        <div className={styles.paymentHub}><Logo size={37} /><strong>10kobo</strong><span>Powered by<br /><b>NEAR Intents</b></span></div>
        <a href="/shop" className={styles.floatingInvoice}>
          <div><span className={styles.invoiceGlyph}><InvoiceIcon /></span><ArrowOutIcon /></div>
          <small>INVOICE #1042</small><strong>₦25,000</strong><p>Design work</p>
          <span className={styles.invoiceCurrency}>Naira or crypto <span aria-hidden>↗</span></span>
        </a>
        <div className={styles.recipientCard}>
          <div className={styles.recipientTop}><span><BankIcon /></span><div><small>{reverse ? "YOU PAY" : "RECEIVER GETS"}</small><strong>{reverse ? "Naira by bank transfer" : "Naira in their bank"}</strong></div></div>
          <strong className={styles.receiptAmount}>₦25,000<span>.00</span></strong>
          <div className={styles.receiptStatus} data-complete={phase === 2}><span>{phase === 2 ? <CheckIcon /> : <span className={styles.statusPulse} />}</span>{reduced ? "Naira ↔ USDC" : stages[shown]}</div>
        </div>
        <a href="/agent" className={styles.agentBadge}><span aria-hidden>✳</span><div><strong>People. Businesses. Agents.</strong><small>One connection to real-world payments.</small></div><ArrowOutIcon /></a>
      </div>
    </div>
  );
}

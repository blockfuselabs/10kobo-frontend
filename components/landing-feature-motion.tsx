'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BankIcon, CalendarIcon, InvoiceIcon, NetworksIcon, PhoneIcon, WalletIcon } from './icons';
import styles from './welcome.module.css';

const features = [
  { label: 'Send money', Icon: BankIcon },
  { label: 'Receive USDC', Icon: WalletIcon },
  { label: 'Agent payments', Icon: NetworksIcon, badge: 'x402' },
  { label: 'Invoices & checkout', Icon: InvoiceIcon },
  { label: 'Airtime & data', Icon: PhoneIcon },
  { label: 'Scheduled payments', Icon: CalendarIcon },
  { label: '16 networks', Icon: NetworksIcon },
];

export function FeatureStrip() {
  const [paused, setPaused] = useState(false);
  return <section className={styles.featureStrip} aria-label="What you can do with 10kobo" data-paused={paused}>
    <div className={styles.stripViewport}><div className={styles.stripTrack}>
      {[false, true].map(copy => <ul key={String(copy)} aria-hidden={copy || undefined}>
        {features.map(({ label, Icon, badge }) => <li key={label}><span><Icon /></span>{label}{badge && <b>{badge}</b>}</li>)}
      </ul>)}
    </div></div>
    <button className={styles.stripControl} onClick={() => setPaused(value => !value)} aria-label={paused ? 'Play feature strip' : 'Pause feature strip'} aria-pressed={paused}>{paused ? '▶' : 'Ⅱ'}</button>
  </section>;
}

export function FeatureCard({ children, kind }: { children: ReactNode; kind: string }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { threshold: .25 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <article ref={ref} className={styles.everydayCard} data-kind={kind} data-visible={visible}>{children}</article>;
}

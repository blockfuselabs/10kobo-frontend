import { Logo } from './icons';

export function PublicNav({ current }: { current: 'agents' | 'proof' | 'shop' }) {
  return <nav className="public-nav" aria-label="Main navigation">
    <a className="public-brand" href="/"><Logo size={34} /><span>10kobo.</span></a>
    <div>
      <a href="/agent" aria-current={current === 'agents' ? 'page' : undefined}>Agents</a>
      <a href="/shop" aria-current={current === 'shop' ? 'page' : undefined}>Checkout</a>
      <a href="/proof" aria-current={current === 'proof' ? 'page' : undefined}>Proof of payment</a>
    </div>
    <a className="btn-primary" href="/login">Open 10kobo</a>
  </nav>;
}

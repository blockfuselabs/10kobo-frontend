import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth/auth';
import { Logo, ThemeToggle } from './icons';

const looksLikeEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());

/** Our own sign-in: email, then a six-digit code. New and returning people use the same steps. */
export function LoginPage() {
  const { sendCode, verifyCode } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (codeSent) codeField.current?.focus();
  }, [codeSent]);

  const requestCode = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!looksLikeEmail(email) || busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendCode(email.trim());
      setCode('');
      setCodeSent(true);
    } catch {
      setError('We could not send a code. Please check your email and try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (value: string) => {
    if (!/^\d{6}$/.test(value) || busy) return;
    setBusy(true);
    setError(null);
    try {
      await verifyCode(value);
    } catch {
      setError('That code did not work. Please check it, or ask for a new one.');
      setCode('');
      codeField.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 md:px-8 md:py-7">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={38} />
          <span className="font-display text-2xl font-bold tracking-tight">10kobo</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
            ← Back to home
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="rise flex w-full max-w-md flex-col gap-6 rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] p-7 shadow-[0_30px_70px_rgb(0_0_0/0.1)] md:p-9">
          {!codeSent ? (
            <form onSubmit={(event) => void requestCode(event)} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-tight">Welcome to 10kobo</h1>
                <p className="text-[var(--muted)]">Enter your email to log in. New here? This also creates your account.</p>
              </div>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Email
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@email.com"
                  className="field text-base font-normal"
                />
              </label>
              {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <button className="btn-primary w-full py-3.5" disabled={!looksLikeEmail(email) || busy}>
                {busy ? 'Sending…' : 'Continue'}
              </button>
              <p className="text-center text-xs text-[var(--muted)]">We will email you a six-digit code. There is no password to remember.</p>
            </form>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void confirm(code);
              }}
              className="flex flex-col gap-5"
            >
              <div className="flex flex-col gap-2">
                <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-tight">Check your email</h1>
                <p className="break-words text-[var(--muted)]">
                  We sent a six-digit code to <span className="font-medium text-[var(--foreground)]">{email.trim()}</span>.
                </p>
              </div>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Code
                <input
                  ref={codeField}
                  name="one-time-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, '').slice(0, 6);
                    setCode(digits);
                    if (digits.length === 6) void confirm(digits);
                  }}
                  placeholder="000000"
                  className="field amount text-center font-mono text-2xl font-medium tracking-[0.4em]"
                />
              </label>
              {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <button className="btn-primary w-full py-3.5" disabled={code.length !== 6 || busy}>
                {busy ? 'Checking…' : 'Log in'}
              </button>
              <div className="flex justify-between text-sm font-medium">
                <button
                  type="button"
                  className="cursor-pointer text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                  onClick={() => {
                    setCodeSent(false);
                    setCode('');
                    setError(null);
                  }}
                >
                  Use another email
                </button>
                <button type="button" disabled={busy} className="cursor-pointer text-[var(--muted)] transition-colors hover:text-[var(--foreground)]" onClick={() => void requestCode()}>
                  Send a new code
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon } from './icons';

const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? 'http://localhost:4020/mcp';

const TOOLS: [string, string, string][] = [
  ['quote_naira_payment', 'Prices a naira payment and shows the bank’s name for the account, partly hidden.', 'Moves nothing'],
  ['accept_quote', 'Gives the exact USDC and the one-time address to send it to.', 'Moves nothing'],
  ['check_payment', 'Follows the payment and returns the receipt once the bank is paid.', 'Read-only'],
];

/** Like a banking app's "connect an assistant": one link to paste into Claude or ChatGPT, and what it can do. */
export function McpConnect() {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    void navigator.clipboard?.writeText(MCP_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">Connect an assistant</h3>
        <p className="text-sm text-[var(--muted)]">Let Claude or ChatGPT price and arrange naira payments. It can&apos;t move money: you send the USDC from your own wallet.</p>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-3 pr-3 pl-5">
        <code className="min-w-0 flex-1 truncate font-mono text-sm" data-testid="mcp-url">{MCP_URL}</code>
        <button type="button" onClick={copy} className="btn-small shrink-0 gap-1.5 border border-[var(--line)] px-4 hover:bg-[var(--surface-2)]" aria-label="Copy the MCP link">
          {copied ? <CheckIcon /> : <CopyIcon />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="flex flex-col gap-4 text-sm leading-6">
        <p><strong className="font-semibold">Claude:</strong> Settings → Connectors → Add custom connector. Enter a name, paste the link as the MCP server URL, then Add.</p>
        <p><strong className="font-semibold">ChatGPT:</strong> Developer mode → Add custom MCP server. Paste the link as the Server URL, choose No authentication, tick “I understand”, then Create.</p>
      </div>

      <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-6">
        <h3 className="text-lg font-semibold">What it can do</h3>
        <ul className="flex flex-col divide-y divide-[var(--line)]">
          {TOOLS.map(([name, text, safety]) => (
            <li key={name} className="flex items-center justify-between gap-4 py-4 text-sm">
              <span className="flex min-w-0 flex-col gap-0.5">
                <code className="font-mono text-[13px] font-medium">{name}</code>
                <span className="text-[var(--muted)]">{text}</span>
              </span>
              <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium">{safety}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { ArrowOutIcon, BankIcon, CalendarIcon, CheckIcon, CopyIcon, InvoiceIcon, LockIcon, Logo, NetworksIcon, PhoneIcon, WalletIcon } from './icons';
import { HIGHLIGHTS, proofAt } from '@/lib/proof';
import styles from './welcome.module.css';
import { LandingPaymentVisual } from './landing-payment-visual';
import { FeatureStrip } from './landing-feature-motion';
import { PaymentShowcase } from './payment-showcase';

const NETWORKS = ["NEAR", "Base", "Ethereum", "Solana", "Arbitrum", "Polygon", "Stellar", "Tron", "Optimism", "Avalanche", "BNB Chain", "TON", "Sui", "Aptos", "Gnosis", "Monad"];
const FAQS = [
    ["What is 10kobo?", "10kobo connects naira and stablecoin payments for people, businesses and AI agents. Send to a Nigerian bank, move funds to a supported wallet, collect invoices or integrate checkout. NEAR Intents handles movement between networks."],
    ["Do I need to understand crypto?", "You can sign in with an email code and fund your wallet with a naira bank transfer. Your wallet holds USDC. Before you approve a payment, 10kobo shows what it costs and what the recipient gets."],
    ["Which networks can I use?", "There are 16 configured sending destinations, 15 crypto payment-source networks and 14 other-network deposit sources. Availability depends on the route and quote. Stellar currently supports sending, not deposits. Tron and TON use USDT. Some routes have only been quoted, not yet proven with real payments."],
    ["Can my customers pay without a 10kobo account?", "Yes. Customers can open your invoice or checkout and follow the payment instructions without creating an account. Naira bank-transfer payment is available for eligible invoices that settle in USDC on Base."],
    ["Can an AI agent move my money without permission?", "The assistant inside your account proposes payments for your approval. Scheduled payments run under a permission you approve in advance. External agents fund their own payments through the API or x402, subject to payment and daily limits."],
    ["Is 10kobo live?", "10kobo is a mainnet pilot with recorded real payments. The proof page links to the transaction records. Limits apply, route availability varies, and the product has not been independently audited."]
];
const CODE = {
    x402: `POST /v1/agent/x402/pay
Content-Type: application/json

{
  "amount_naira": 5000,
  "bank_name": "OPay",
  "account_number": "8031234568",
  "pay_from": "near",
  "refund_to": "agent.near",
  "payer_name": "Your agent",
  "payer_email": "agent@example.com",
  "purpose": "Supplier invoice"
}`,
    checkout: `// On your server, with your merchant key
POST /v1/merchant/invoices
Authorization: Bearer YOUR_MERCHANT_KEY

{
  "reference": "ORDER-1042",
  "amount_naira": 25000,
  "note": "Studio essentials"
}

// Open the returned invoice in checkout.
// Keep your merchant key on your server.`
};
function Arrow({ diagonal = false }) {
    return diagonal ? <ArrowOutIcon /> : <span aria-hidden={true} className={styles.arrow}>{"\u2197"}</span>;
}
function Brand() {
    return <a href={"/"} className={styles.brand} aria-label={"10kobo home"}><Logo size={34}/><span>{"10kobo"}<span className={styles.brandDot}>{"."}</span></span></a>;
}
export function Welcome({ onSignIn }: {
    onSignIn: () => void;
}) {
    const [mobileMenu, setMobileMenu] = useState(false);
    const [codeTab, setCodeTab] = useState<keyof typeof CODE>("x402");
    const [copyStatus, setCopyStatus] = useState("");
    async function copyCode() {
        try {
            await navigator.clipboard.writeText(CODE[codeTab]);
            setCopyStatus("Copied");
        }
        catch {
            setCopyStatus("Select the code to copy it");
        }
    }
    return <div className={styles.site}><a className={styles.skip} href={"#main"}>{"Skip to content"}</a><header className={styles.header}><Brand /><nav className={styles.desktopNav} aria-label={"Main navigation"}><a href={"#personal"}>{"Personal"}</a><a href={"#business"}>{"Business"}</a><a href={"/agent"}>{"Agents"}</a><a href={"#developers"}>{"Developers"}</a><a href={"/proof"}>{"Proof of payment"}</a></nav><div className={styles.headerActions}><button className={styles.signIn} onClick={onSignIn}>{"Sign in"}</button><button className={`${styles.button} ${styles.smallButton}`} onClick={onSignIn}>{"Get started"}</button><button className={styles.menuButton} aria-label={mobileMenu ? "Close menu" : "Open menu"} aria-expanded={mobileMenu} aria-controls={"mobile-menu"} onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? "\u2715" : "\u2630"}</button></div>{mobileMenu && <nav id={"mobile-menu"} aria-label={"Mobile navigation"} className={styles.mobileNav} onClick={() => setMobileMenu(false)}><a href={"#personal"}>{"Personal"}</a><a href={"#business"}>{"Business"}</a><a href={"/agent"}>{"Agents"}</a><a href={"#developers"}>{"Developers"}</a><a href={"/proof"}>{"Proof of payment"}</a></nav>}</header>
<main id={"main"}>
<div className={styles.heroPanel}><section className={styles.hero} aria-labelledby={"hero-title"}><div className={styles.heroCopy}><p className={styles.eyebrow}><span className={styles.shortLine}/>{" PAYMENTS FOR PEOPLE, BUSINESSES & AI AGENTS"}</p><h1 id={"hero-title"}>{"Naira and"}<br />{"stablecoins,"}<br /><span className={styles.heroHighlight}>{"both ways."}</span></h1><p className={styles.heroDescription}>Pay Nigerian bank accounts. Send crypto across 16 networks. Collect payments with invoices and checkout. Let your AI agents pay too.</p><div className={styles.heroActions}><button className={styles.button} onClick={onSignIn}>{"Start with 10kobo "}<span aria-hidden={true} className={styles.arrow}>→</span></button><a href={"#how-it-works"} className={styles.textLink}>{"See how it works "}<span aria-hidden={true}>{"\u2193"}</span></a></div></div><LandingPaymentVisual /></section>
<FeatureStrip /></div>
<section className={`${styles.section} ${styles.personal}`} id="personal" aria-labelledby="everyday-title">
  <div className={styles.everydayHeading}>
    <p className={styles.eyebrow}>01 / MADE FOR YOUR EVERYDAY</p>
    <h2 id="everyday-title">Your money. More possibilities.<br /><span>For people, businesses & agents.</span></h2>
    <p>Send it. Collect it. Let your agents pay too. One connection between naira and stablecoins.</p>
  </div>
  <PaymentShowcase onSignIn={onSignIn} />
</section>
<section className={styles.business} id={"business"}><div className={styles.businessCopy}><p className={styles.eyebrow}>{"02 / OPEN FOR BUSINESS"}</p><h2>{"A payment link."}<br /><span className={styles.serif}>{"An open door."}</span></h2><p>{"From your first client to your next customer. Send an itemised invoice or connect checkout, and give people a familiar way to pay."}</p><ul><li><CheckIcon />{" Shareable invoices with items and due dates"}</li><li><CheckIcon />{" Crypto payments from 15 networks"}</li><li><CheckIcon />{" Naira bank transfer for eligible USDC invoices"}</li><li><CheckIcon />{" Signed payment notices for your shop"}</li></ul><a className={`${styles.button} ${styles.accentButton}`} href={"/shop"}>{"Explore the checkout "}<Arrow /></a></div><div className={styles.checkoutStage}><div className={styles.receiptBack} aria-hidden={true}><span>{"INVOICE / 1042"}</span><i /><i /><i /><b>{"Made for getting paid."}</b></div><div className={styles.checkoutPreview}><div className={styles.checkoutBrand}><span className={styles.shopMark}>{"s."}</span><div><strong>{"Studio Store"}</strong><small>{"Example checkout"}</small></div><LockIcon /></div><div className={styles.orderAmount}><small>{"Your order"}</small><strong>{"\u20A625,000"}<span>{".00"}</span></strong><p>{"Studio essentials \xB7 1 item"}</p></div><div className={styles.checkoutChoice}><span><BankIcon />{" Bank transfer"}</span><span className={styles.radio}/></div><div className={`${styles.checkoutChoice} ${styles.selectedChoice}`}><span><WalletIcon />{" Pay with crypto"}</span><span className={styles.radio}/></div><div className={styles.checkoutNetwork}><span>{"Network"}</span><strong>{"NEAR "}<span aria-hidden={true}>{"\u2304"}</span></strong></div><a className={styles.checkoutButton} href={"/shop"}>{"Try the demo checkout "}<span aria-hidden={true}>{"\u2192"}</span></a><p className={styles.powered}>{"Payments by "}<b>{"10kobo."}</b></p></div><div className={styles.checkoutSticker}><InvoiceIcon /><span>{"Your link."}<br /><b>{"Their way to pay."}</b></span></div></div></section>
<section className={`${styles.section} ${styles.developerSection}`} id={"developers"}><div className={styles.developerGrid}><div className={styles.developerCopy}><p className={styles.eyebrow}>{"03 / BUILT FOR THE AGENT ECONOMY"}</p><h2>{"Build the agent."}<br /><span className={styles.serif}>{"Connect the payment."}</span></h2><p>{"A supplier in Lagos doesn\u2019t need a crypto wallet. Your agent pays in stablecoins, and naira arrives in their Nigerian bank account."}</p><div className={styles.protocols}><span>{"x402"}</span><span>{"HTTP API"}</span><span>{"MCP"}</span><span>{"NEAR Intents"}</span></div><div className={styles.developerDetails}><div><strong>{"No key to get started"}</strong><p>{"x402 payments within pilot limits."}</p></div><div><strong>{"Guardrails in code"}</strong><p>{"Recipient checks and spending caps."}</p></div></div><a className={styles.button} href={"/agent"}>{"Explore agent payments "}<Arrow /></a></div><div className={styles.codeWindow}><div className={styles.codeHeader}><div className={styles.windowDots} aria-hidden={true}><i /><i /><i /></div><span>{"Build with 10kobo"}</span><button onClick={() => void copyCode()} aria-label={"Copy integration example"} title={"Copy example"}><CopyIcon /></button></div><div className={styles.codeTabs} role={"group"} aria-label={"Integration example"}>{(["x402", "checkout"] as const).map((tab) => <button aria-pressed={codeTab === tab} onClick={() => {
        setCodeTab(tab);
        setCopyStatus("");
    }} key={tab}>{tab === "x402" ? "Agent payment" : "Merchant checkout"}</button>)}</div><pre><code>{CODE[codeTab]}</code></pre><div className={styles.codeResponse}><span className={styles.liveDot}/><span>{codeTab === "x402" ? "402 Payment Required \u2192 fund \u2192 verify" : "Create invoice \u2192 customer pays \u2192 signed notice"}</span></div><p className={styles.codeNotice} role={"status"}>{copyStatus || "Example request \xB7 No payment is made here"}</p></div></div></section>
<section className={styles.howSection} id={"how-it-works"}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{"LESS BETWEEN YOU AND DONE"}</p><h2>{"From intention"}<br /><span className={styles.serif}>{"to payment."}</span></h2></div><p>{"Every payment deserves clarity."}<br />{"From the first quote to the final receipt."}</p></div><div className={styles.steps}>{[{ title: "Choose your move.", text: "Send money, fund your wallet, create an invoice or connect your agent." }, { title: "Know before you pay.", text: "See the recipient, amount, currency and quote. Review the details before authorizing." }, { title: "Follow it all the way.", text: "Track progress through settlement. Keep a receipt and inspect the onchain steps." }].map((step, index) => <article key={step.title}><span className={styles.stepNumber}>{"0"}{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></section>
<section className={`${styles.section} ${styles.proofSection}`}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}><span className={styles.liveDot}/>{" REAL PAYMENTS. OPEN RECORDS."}</p><h2>{"Don’t take our word."}<br /><span className={styles.serif}>{"Follow the receipt."}</span></h2></div><a href={"/proof"} className={styles.textLink}>{"See the payment records "}<Arrow /></a></div><div className={styles.proofGrid}>{HIGHLIGHTS.slice(0, 3).map((item, index) => <a className={styles.proofItem} href={"/proof"} key={item.at}><span className={styles.proofIndex}>{"0"}{index + 1}{" "}<Arrow /></span><h3>{item.headline}</h3><p>{item.line}</p><span className={styles.proofTag}><CheckIcon />{" Recorded on mainnet"}</span><small>{proofAt(item.at).networks.join(" \u2192 ")}</small></a>)}</div><p className={styles.proofFootnote}>{"Recorded pilot payments, November 2026. These are individual results, not guaranteed delivery times."}</p></section>
<section className={styles.networkSection} id={"networks"}><p className={styles.eyebrow}>{"MANY NETWORKS. ONE PLACE."}</p><h2>{"16 networks."}<br /><span className={styles.serif}>{"One familiar experience."}</span></h2><div className={styles.networkPills}>{NETWORKS.map((name) => <span key={name}><span aria-hidden={true}>{"\u2197"}</span>{name}</span>)}</div><p>{"16 sending destinations \xB7 15 crypto payment sources \xB7 14 other-network deposit sources."}<br />{"Availability varies by route. Tron and TON use USDT. Stellar deposits are not yet supported."}</p></section>
<section className={`${styles.section} ${styles.faqSection}`}><div><p className={styles.eyebrow}>{"A LITTLE MORE CLARITY"}</p><h2>{"A few things"}<br /><span className={styles.serif}>{"worth knowing."}</span></h2><p>{"Money is personal."}<br />{"You should know how it works."}</p></div><div className={styles.faqList}>{FAQS.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden={true}>{"+"}</span></summary><p>{answer}</p></details>)}</div></section>
<section className={styles.finalCta}><div className={styles.ctaDecoration} aria-hidden={true}><span>₦</span><span>↔</span><span>$</span></div><div><p className={styles.eyebrow}>{"YOUR NEXT MOVE STARTS HERE"}</p><h2>{"Make money "}<span className={styles.serif}>{"move."}</span></h2><p>{"Across currencies. Across networks. Into everyday life."}</p></div><button className={`${styles.button} ${styles.accentButton}`} onClick={onSignIn}>{"Get started with 10kobo "}<Arrow /></button></section>
</main>
<footer className={styles.footer}><div className={styles.footerTop}><div><Brand /><p>{"Naira and stablecoins, both ways."}</p></div><nav aria-label={"Footer navigation"}><a href={"#personal"}>{"Personal"}</a><a href={"#business"}>{"Business"}</a><a href={"/agent"}>{"Developers"}</a><a href={"/proof"}>{"Proof"}</a><a href={"/shop"}>{"Demo shop \u2197"}</a></nav></div><div className={styles.footerBottom}><span>{"\xA9 "}{(new Date()).getFullYear()}{" 10kobo \xB7 Built by Blockfuse Labs"}</span><span>{"Mainnet pilot \xB7 Limits apply \xB7 Not independently audited"}</span><span>{"Built on NEAR \u2197"}</span></div></footer></div>;
}
function ChatSpark() {
    return <svg aria-hidden={true} width={"24"} height={"24"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"1.5"}><path d={"m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z"}/></svg>;
}

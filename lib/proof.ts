/**
 * Real payments made with real money on mainnet, chosen by hand and approved by the owner on 6 Nov 2026. Accounts
 * are masked and nobody is named. The transaction hashes are already public on their blockchains.
 */
export interface Proof {
  /** UTC, as recorded by 10kobo. */
  at: string;
  kind: 'bank' | 'airtime' | 'wallet' | 'deposit' | 'agent' | 'naira-in';
  title: string;
  detail: string;
  amount: string;
  /** Start to delivered, where it was recorded. */
  seconds?: number;
  networks: string[];
  links: { label: string; url: string }[];
}

const base = (hash: string) => ({ label: 'Base', url: `https://basescan.org/tx/${hash}` });
const near = (hash: string, label = 'NEAR') => ({ label, url: `https://nearblocks.io/txns/${hash}` });

export const PROOFS: Proof[] = [
  { at: '2026-11-06T12:46', kind: 'wallet', title: 'Base to Stellar', detail: 'USDC sent from a 10kobo wallet to a Stellar wallet, through NEAR Intents', amount: '0.50 → 0.484 USDC', seconds: 40, networks: ['Base', 'NEAR Intents', 'Stellar'], links: [base('0x8ffaa37599f25ad76a8e89b404159863bdb6fbfe38e9bbe4b8019bfcceb71e11'), { label: 'Stellar', url: 'https://stellar.expert/explorer/public/tx/771999fdadf6ee6a03811d5b019889f546770f2eee1975db4e28b2edc084129c' }] },
  { at: '2026-11-06T12:14', kind: 'naira-in', title: 'Invoice paid in naira, received in USDC', detail: 'A payer sent naira by bank transfer; the receiver got USDC on Base', amount: '₦1,600 → 1.157 USDC', seconds: 140, networks: ['Nigerian bank', 'Base'], links: [base('0xa9b7fc9cfcdecba15d120c8954bae9e79e9622b2b97fc6d2965ca3eae7c409f1')] },
  { at: '2026-11-06T06:44', kind: 'naira-in', title: 'Invoice paid in naira, received in USDC', detail: 'The first naira-in payment: bank transfer in, USDC out on Base', amount: '₦1,600 → 1.157 USDC', seconds: 203, networks: ['Nigerian bank', 'Base'], links: [base('0xf2b4d29f36610e7d3ff6a1a6ae901c639d730fbeaa7b66c34201351ff57dc4b1')] },
  { at: '2026-11-06T06:36', kind: 'deposit', title: 'Naira deposit', detail: 'Bank transfer into a 10kobo wallet, arriving as USDC', amount: '₦1,500 → 1.08 USDC', seconds: 234, networks: ['Nigerian bank', 'Base'], links: [base('0xa8b5ec5455a9c69668d5cc35cadd38f9f19d5531e0828a3d8838ab7c0a7222a0')] },
  { at: '2026-11-05T16:17', kind: 'agent', title: 'AI agent paid a bank account from NEAR', detail: 'An agent paid OPay ****4108 with USDC on NEAR, with no gas of its own', amount: '₦1,390', seconds: 71, networks: ['NEAR', 'NEAR Intents', 'Base', 'Nigerian bank'], links: [near('Ae1FHqztv2QAcu5PbXHBWKRQdxo7RU9vr2T1sz17sJCV'), base('0x964a097e3d2d111cb454cab894b918a5715c0bf33972cf9726bf1e329db731db')] },
  { at: '2026-11-05T16:16', kind: 'wallet', title: 'Base to NEAR', detail: 'USDC sent from a 10kobo wallet to a NEAR account', amount: '0.80 → 0.7998 USDC', networks: ['Base', 'NEAR Intents', 'NEAR'], links: [base('0xf78841ad8aee8e3603dba076a85644d0cd8c1bb33083ea66615f2eec3ee72be9'), near('AkXzJmTMYhAHJTm7fbLNiH1DuwAVUEs6BWYJis4YyDAV')] },
  { at: '2026-11-05T16:13', kind: 'deposit', title: 'Naira deposit', detail: 'Bank transfer into a 10kobo wallet, arriving as USDC', amount: '₦1,500 → 1.08 USDC', seconds: 112, networks: ['Nigerian bank', 'Base'], links: [base('0x27198652c8a924ae2fb5094bac9e4fda91754fde045849ff0fffca4c1b03b8dc')] },
  { at: '2026-11-05T16:03', kind: 'agent', title: 'AI agent paid a bank account from NEAR', detail: 'The first agent payment: USDC on NEAR to OPay ****4108, with a relayer paying the gas', amount: '₦1,400', seconds: 107, networks: ['NEAR', 'NEAR Intents', 'Base', 'Nigerian bank'], links: [near('5zbAweuUG3Z1rSJB5L47Gwsn4W8i2aG9y3LhQVKqkhBg'), base('0xc9c352d7fafb7b278afd5fb411e9d0aa7ae86263e862a81390f7ebdd80d9455e')] },
  { at: '2026-11-05T15:56', kind: 'wallet', title: 'Base to NEAR', detail: 'USDC sent from a 10kobo wallet to a NEAR account', amount: '1.30 → 1.2999 USDC', networks: ['Base', 'NEAR Intents', 'NEAR'], links: [base('0xc6085e32192b18ba90c19c992f01c33749b8c80581239dd65f0e79319ec73d62'), near('H7iHqyHC29T8mt2fW9m7j1kzbhexCS74eXZene6cyDUb')] },
  { at: '2026-11-05T15:41', kind: 'wallet', title: 'Base to Arbitrum', detail: 'USDC sent from a 10kobo wallet to an Arbitrum wallet', amount: '0.50 USDC', networks: ['Base', 'NEAR Intents', 'Arbitrum'], links: [base('0xf4981e3defaeb2d36c6892c615c70d5fb1d9cdf21fd7bc0d57864f3609568474'), { label: 'Arbitrum', url: 'https://arbiscan.io/tx/0xbb2e2274f1211c95c65cb8f06a0b00650c09063bf97d60b0115ffb33e7d2c088' }] },
  { at: '2026-11-04T15:16', kind: 'deposit', title: 'Naira deposit', detail: 'Bank transfer into a 10kobo wallet, arriving as USDC', amount: '₦1,400 → 1.01 USDC', seconds: 121, networks: ['Nigerian bank', 'Base'], links: [base('0x257bdc62b03c168196026b0e7814bc6cb9044bb575290241b1f615e074dd0c7e')] },
  { at: '2026-11-04T15:15', kind: 'bank', title: 'USDC to a bank account', detail: 'Paid out in naira to Moniepoint ****1846', amount: '₦1,372', networks: ['Base', 'Nigerian bank'], links: [base('0xfa76fa548c58f775a7eab8e5fc5d5fd792978258698b6af5d0556a2e405c5a3d')] },
  { at: '2026-11-04T14:58', kind: 'wallet', title: 'USDC to a Base wallet', detail: 'USDC sent to another wallet on Base', amount: '1.06 USDC', networks: ['Base'], links: [base('0x3a3f1ed243516034133c4dc572413c500723f3df521b48a944edf81867aed1f1')] },
  { at: '2026-11-04T14:52', kind: 'deposit', title: 'Naira deposit', detail: 'Bank transfer into a 10kobo wallet, arriving as USDC', amount: '₦2,000 → 1.44 USDC', seconds: 165, networks: ['Nigerian bank', 'Base'], links: [base('0x84f0f14ef0606a7425c2f1019e6b907490ae12050a14a7343091b9bf7cc189cc')] },
  { at: '2026-11-04T10:00', kind: 'wallet', title: 'USDC to a Base wallet', detail: 'USDC sent to another wallet on Base', amount: '0.10 USDC', networks: ['Base'], links: [base('0xc13ead3d2ba4482a2c731ca06e86a585f0b580f6e9593ad4843578d89f8a9bb6')] },
  { at: '2026-11-04T09:50', kind: 'bank', title: 'USDC to a bank account', detail: 'Paid out in naira to OPay ****2155', amount: '₦2,000', networks: ['Base', 'Nigerian bank'], links: [base('0xf34052383e95b898e6a745203f362cfae1b2cb85861d83b3acf79df3f414966b')] },
  { at: '2026-11-04T09:31', kind: 'deposit', title: 'Naira deposit', detail: 'Bank transfer into a 10kobo wallet, arriving as USDC', amount: '₦2,000 → 1.44 USDC', seconds: 133, networks: ['Nigerian bank', 'Base'], links: [base('0x0352ebee275766116b037e525347921b78a63b4ba27e9e38b080b486e610a856')] },
  { at: '2026-11-03T18:06', kind: 'bank', title: 'USDC to a bank account', detail: 'Paid out in naira to OPay ****4108', amount: '₦1,376', networks: ['Base', 'Nigerian bank'], links: [base('0xe5b7d6fc8a47dc949489b3a463a86971cf327ee0803fb870a6136b3bf4ee5443')] },
  { at: '2026-11-03T17:58', kind: 'deposit', title: 'Naira deposit', detail: 'Bank transfer into a 10kobo wallet, arriving as USDC', amount: '₦2,000 → 1.44 USDC', seconds: 159, networks: ['Nigerian bank', 'Base'], links: [base('0x5b807fd25d9b83a7424183d35a26d4ec59e9da4f16983ada322ceb4f4e13f69b')] },
  { at: '2026-11-03T17:12', kind: 'bank', title: 'USDC to a bank account', detail: 'Paid out in naira to OPay ****3308', amount: '₦2,000', networks: ['Base', 'Nigerian bank'], links: [base('0xa700745070cf18ae8f079a909e362af6572e1972f07cd9f8fabacc902aaecea6')] },
  { at: '2026-11-03T16:59', kind: 'deposit', title: 'Naira deposit', detail: 'Bank transfer into a 10kobo wallet, arriving as USDC', amount: '₦2,000 → 1.44 USDC', seconds: 173, networks: ['Nigerian bank', 'Base'], links: [base('0xf850f9de788ef61bdfa9e0b830574f8c95ed2349f67734113d398e99a14ce463')] },
  { at: '2026-11-03T16:14', kind: 'wallet', title: 'USDC to a Base wallet', detail: 'USDC sent to another wallet on Base', amount: '0.10 USDC', networks: ['Base'], links: [base('0x1de9af93bcd36d1aa92eac9e079d35ae8a284b25a6bd2a19523a0f4f4014e39e')] },
  { at: '2026-11-03T14:49', kind: 'airtime', title: 'Airtime', detail: 'MTN airtime bought with USDC', amount: '₦50', networks: ['Base'], links: [base('0x07717f178c95134c0348c06c27fcbbfeebfae8ae6acb2e8459bc104cd78af453')] },
  { at: '2026-11-03T14:39', kind: 'bank', title: 'First bank payout', detail: 'The first real payment: USDC on Base paid out in naira to OPay ****4108', amount: '₦2,063', networks: ['Base', 'Nigerian bank'], links: [base('0x73e157a210415d3eefa2da21b608c15ec61da96eef8a2f599ef9b5dd101ef405')] },
];

/** The four shown on the landing page, in this order. */
export const HIGHLIGHTS: { at: string; headline: string; line: string }[] = [
  { at: '2026-11-05T16:03', headline: 'An AI agent paid a Nigerian bank', line: '₦1,400 to OPay from NEAR in 1 min 47 s' },
  { at: '2026-11-06T06:44', headline: 'Naira in, USDC out', line: '₦1,600 by bank transfer → 1.157 USDC in 3 min 23 s' },
  { at: '2026-11-06T12:46', headline: 'Base to Stellar in 40 seconds', line: '0.50 USDC sent, 0.484 USDC received' },
  { at: '2026-11-03T14:39', headline: 'USDC to a bank account', line: '₦2,063 paid out to OPay, the first real payment' },
];

export const proofAt = (at: string) => PROOFS.find((item) => item.at === at)!;

export function duration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}

export const when = (at: string) => new Date(`${at}:00Z`).toLocaleString('en-NG', { timeZone: 'UTC', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';

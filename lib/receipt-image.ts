import type { Receipt } from './api/client';

const WIDTH = 720;
const PAD = 56;

const when = (value: string) => new Date(value).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' });
const short = (value: string) => `${value.slice(0, 10)}…${value.slice(-6)}`;

/** Breaks a sentence into lines that fit, so a long name or note is never cut off. */
function wrap(context: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function rows(receipt: Receipt): [string, string][] {
  const list: [string, string][] = [];
  if (receipt.recipient) list.push(['To', receipt.recipient]);
  if (receipt.recipient_detail) list.push(['Details', receipt.recipient_detail]);
  list.push(['Type', receipt.kind]);
  if (receipt.second_amount) list.push(['Paid with', receipt.second_amount]);
  list.push(['Date', when(receipt.completed_at)]);
  list.push(['Reference', receipt.reference.slice(0, 8).toUpperCase()]);
  if (receipt.tx_hash) list.push(['Transaction', short(receipt.tx_hash)]);
  return list;
}

/** Draws the receipt as an image. Always light, whatever the app's theme, so it reads the same for whoever receives it. */
export async function drawReceipt(receipt: Receipt): Promise<Blob> {
  await document.fonts?.ready;
  const sans = getComputedStyle(document.body).fontFamily || 'sans-serif';
  const font = (weight: number, size: number) => `${weight} ${size}px ${sans}`;
  const measure = document.createElement('canvas').getContext('2d')!;
  const valueWidth = WIDTH - PAD * 2 - 190;

  measure.font = font(600, 24);
  const laidOut = rows(receipt).map(([label, value]) => ({ label, lines: wrap(measure, value, valueWidth) }));
  measure.font = font(400, 20);
  const note = receipt.note ? wrap(measure, receipt.note, WIDTH - PAD * 2) : [];
  const rowsHeight = laidOut.reduce((sum, row) => sum + row.lines.length * 32 + 26, 0);
  const height = 372 + rowsHeight + (note.length ? note.length * 28 + 24 : 0) + 104;

  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * scale;
  canvas.height = height * scale;
  const c = canvas.getContext('2d')!;
  c.scale(scale, scale);
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, WIDTH, height);

  // The brand bar.
  c.fillStyle = '#141414';
  c.fillRect(0, 0, WIDTH, 112);
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.roundRect(PAD, 34, 44, 44, 12);
  c.fill();
  c.strokeStyle = '#141414';
  c.lineWidth = 4;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(PAD + 15, 45);
  c.lineTo(PAD + 15, 67);
  c.moveTo(PAD + 30, 45);
  c.lineTo(PAD + 19, 56);
  c.lineTo(PAD + 30, 67);
  c.stroke();
  c.fillStyle = '#ffffff';
  c.font = font(700, 30);
  c.textBaseline = 'middle';
  c.fillText('10kobo', PAD + 58, 57);
  c.font = font(500, 20);
  c.textAlign = 'right';
  c.fillText('Receipt', WIDTH - PAD, 57);
  c.textAlign = 'left';

  // The result.
  c.fillStyle = '#c6f135';
  c.beginPath();
  c.arc(PAD + 22, 170, 22, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#141414';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(PAD + 12, 171);
  c.lineTo(PAD + 19, 178);
  c.lineTo(PAD + 32, 163);
  c.stroke();
  c.fillStyle = '#111111';
  c.font = font(600, 24);
  c.fillText(receipt.title, PAD + 58, 170);
  c.font = font(700, 58);
  c.fillText(receipt.amount, PAD, 256);

  c.strokeStyle = 'rgba(0,0,0,0.12)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(PAD, 316);
  c.lineTo(WIDTH - PAD, 316);
  c.stroke();

  // The details.
  let y = 352;
  for (const row of laidOut) {
    c.fillStyle = '#5a5a54';
    c.font = font(400, 22);
    c.fillText(row.label, PAD, y);
    c.fillStyle = '#111111';
    c.font = font(600, 24);
    c.textAlign = 'right';
    row.lines.forEach((line, index) => c.fillText(line, WIDTH - PAD, y + index * 32));
    c.textAlign = 'left';
    y += row.lines.length * 32 + 26;
  }

  if (note.length) {
    c.fillStyle = '#5a5a54';
    c.font = font(400, 20);
    y += 6;
    note.forEach((line, index) => c.fillText(line, PAD, y + index * 28));
    y += note.length * 28;
  }

  c.fillStyle = '#f6f5f1';
  c.fillRect(0, height - 72, WIDTH, 72);
  c.fillStyle = '#5a5a54';
  c.font = font(500, 20);
  c.textAlign = 'center';
  c.fillText('Sent with 10kobo. Send money like sending a text.', WIDTH / 2, height - 36);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not make the image'))), 'image/png'));
}

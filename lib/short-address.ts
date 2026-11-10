/** Long wallet addresses inside a text become start…end, so a row stays one readable line. */
export const shortenAddresses = (text: string) => text.replace(/\b(0x[0-9a-fA-F]{6}|[A-Za-z0-9]{6})[A-Za-z0-9]{14,}([A-Za-z0-9]{4})\b/g, '$1…$2');

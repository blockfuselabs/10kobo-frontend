/** Public demo catalogue. The order endpoint independently calculates prices from this list. */
export const MENU = [
  { id: 'headphones', name: 'Studio headphones', naira: 900, category: 'Tech', description: 'Over-ear comfort. A little more room for your favourite sound.' },
  { id: 'backpack', name: 'Everyday backpack', naira: 300, category: 'Bags', description: 'A clean canvas carry for workdays and weekends.' },
  { id: 'sunglasses', name: 'Essential sunglasses', naira: 200, category: 'Accessories', description: 'A timeless frame for your everyday rotation.' },
] as const;

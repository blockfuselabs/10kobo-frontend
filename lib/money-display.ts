'use client';

import { useEffect, useState } from 'react';

/** "3.86 USDC" becomes "$3.86": a USDC is a dollar, and people read dollars more easily. */
export const asDollars = (usdc: string) => {
  const value = Number(usdc.replace(/[^\d.]/g, ''));
  return Number.isFinite(value) ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : usdc;
};

/** "₦5,328.01" becomes "₦5,328". The kobo only add noise next to a dollar balance. */
export const wholeNaira = (amount: string) => amount.replace(/\.\d+$/, '');

const HIDE_KEY = '10kobo-hide-balance';
const HIDE_EVENT = '10kobo-hide-balance';

/** Hide or show the balance, remembered in this browser and kept the same everywhere on the page. */
export function useHiddenBalance(): [boolean, () => void] {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        setHidden(window.localStorage.getItem(HIDE_KEY) === 'yes');
      } catch {}
    };
    read();
    window.addEventListener(HIDE_EVENT, read);
    return () => window.removeEventListener(HIDE_EVENT, read);
  }, []);
  const toggle = () => {
    try {
      window.localStorage.setItem(HIDE_KEY, hidden ? 'no' : 'yes');
    } catch {}
    setHidden(!hidden);
    window.dispatchEvent(new Event(HIDE_EVENT));
  };
  return [hidden, toggle];
}

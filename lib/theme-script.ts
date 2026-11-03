export const THEME_KEY = '10kobo-theme';

/** Runs before the page paints, so someone who chose dark never sees a light flash. Keep it short and self-contained. */
export const THEME_SCRIPT = `try{if(localStorage.getItem('${THEME_KEY}')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}`;

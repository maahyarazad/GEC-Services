// Google reCAPTCHA v3 helper.
//
// Loads the reCAPTCHA script once (on first use) and exposes executeRecaptcha(),
// which returns a fresh token to send to the server for verification.
//
// The site key comes from VITE_RECAPTCHA_SITE_KEY. When it is not configured
// (e.g. local dev), executeRecaptcha resolves to an empty string and the server
// verification fails open, so the support flow keeps working without keys.

const SITE_KEY  = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const SCRIPT_ID = 'gec-recaptcha-v3';

let loadPromise = null;

function loadRecaptcha() {
    
    if (window.grecaptcha?.execute) return Promise.resolve(window.grecaptcha);
    if (loadPromise) return loadPromise;

    loadPromise = new Promise((resolve, reject) => {
        const existing = document.getElementById(SCRIPT_ID);
        const onReady = () => window.grecaptcha.ready(() => resolve(window.grecaptcha));

        if (existing) {
            if (window.grecaptcha?.ready) onReady();
            else existing.addEventListener('load', onReady, { once: true });
            return;
        }

        const s = document.createElement('script');
        s.id = SCRIPT_ID;
        s.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
        s.async = true;
        s.defer = true;
        s.onload = onReady;
        s.onerror = () => { loadPromise = null; reject(new Error('Failed to load reCAPTCHA.')); };
        document.head.appendChild(s);
    });
    return loadPromise;
}

/**
 * Execute reCAPTCHA for a given action and return the token.
 * @param {string} action  A label for the action (e.g. 'submit_ticket').
 * @returns {Promise<string>} The reCAPTCHA token, or '' when no site key is set.
 */
export async function executeRecaptcha(action) {
    if (!SITE_KEY) {
        // Env vars are inlined when the Vite dev server starts / the app is built.
        // A missing key here almost always means the running bundle predates the
        // VITE_RECAPTCHA_SITE_KEY entry in public/.env — restart the dev server
        // (or rebuild) to pick it up. Surface it loudly instead of silently
        // sending an empty token (which the server rejects as "Missing reCAPTCHA token").
        console.error(
            '[reCAPTCHA] VITE_RECAPTCHA_SITE_KEY is not set in the running bundle. ' +
            'Restart the Vite dev server (or rebuild) after editing public/.env.'
        );
        return '';
    }
    const grecaptcha = await loadRecaptcha();
    return grecaptcha.execute(SITE_KEY, { action });
}

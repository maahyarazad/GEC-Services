import { useEffect, useState, useCallback } from 'react';
import Button from '@mui/material/Button';
import GetAppIcon from '@mui/icons-material/GetApp';

// A floating "Install App" button, available on every route. It captures the
// browser's deferred `beforeinstallprompt` event, then fires it on a real user
// click (browsers reject prompt() outside a user gesture). Once the app is
// installed — or already detected as installed — the button hides itself.
//
// Docs: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt
export default function PWAInstallPrompt() {
    // The deferred BeforeInstallPromptEvent; null until the browser offers it.
    const [installPrompt, setInstallPrompt] = useState(null);
    const [installed, setInstalled] = useState(false);

    // Detect whether the app is already installed so we never offer the prompt
    // twice. Two signals: running in standalone display mode (launched from the
    // installed icon), and getInstalledRelatedApps() (Chromium) reporting a
    // matching installed app.
    const detectInstalled = useCallback(async () => {
        const standalone =
            window.matchMedia?.('(display-mode: standalone)').matches ||
            window.navigator.standalone === true; // iOS Safari
        if (standalone) return true;

        if (navigator.getInstalledRelatedApps) {
            try {
                const relatedApps = await navigator.getInstalledRelatedApps();
                if (relatedApps && relatedApps.length > 0) return true;
            } catch {
                // Unsupported / blocked — fall back to the other signals.
            }
        }
        return false;
    }, []);

    useEffect(() => {
        let cancelled = false;

        // Initial check on mount.
        detectInstalled().then((yes) => { if (yes && !cancelled) setInstalled(true); });

        const onBeforeInstallPrompt = async (event) => {
            // Prevent the default mini-infobar so we control when to prompt.
            event.preventDefault();
            // Don't surface the button if the app is already installed.
            if (await detectInstalled()) {
                if (!cancelled) setInstalled(true);
                return;
            }
            if (!cancelled) setInstallPrompt(event);
        };

        // Fired once the PWA has been installed — hide the button for good.
        const onAppInstalled = () => {
            if (cancelled) return;
            setInstallPrompt(null);
            setInstalled(true);
        };

        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.addEventListener('appinstalled', onAppInstalled);
        return () => {
            cancelled = true;
            window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
            window.removeEventListener('appinstalled', onAppInstalled);
        };
    }, [detectInstalled]);

    const handleInstall = useCallback(async () => {
        if (!installPrompt) return;
        const result = await installPrompt.prompt();
        console.log(`Install prompt was: ${result?.outcome}`);
        // The deferred prompt can only be used once — clear it and hide the button.
        setInstallPrompt(null);
    }, [installPrompt]);

    // Nothing to show until the browser offers an install prompt, and never once
    // the app is installed.
    if (installed || !installPrompt) return null;

    return (
        <Button
            onClick={handleInstall}
            variant="contained"
            startIcon={<GetAppIcon />}
            sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                zIndex: 2000,
                textTransform: 'none',
                borderRadius: 8,
                boxShadow: 3,
            }}
        >
            Install App
        </Button>
    );
}

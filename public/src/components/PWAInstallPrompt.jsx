import { useEffect, useState, useCallback } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import GetAppIcon from '@mui/icons-material/GetApp';
import IosShareIcon from '@mui/icons-material/IosShare';

// A floating "Install App" button, available on every route.
//
// On Chromium the browser hands us a deferred `beforeinstallprompt` event,
// which we fire on a real user click (prompt() is rejected outside a user
// gesture). The event itself is captured by an inline script in index.html —
// it fires once, often before this bundle has loaded — so here we read the
// stash rather than racing for the event ourselves.
//
// iOS Safari never fires `beforeinstallprompt`; installing is only possible
// via Share → Add to Home Screen, so there we show the same button and explain
// the manual steps.
//
// Docs: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt

// iPadOS reports a Mac user agent, so also treat touch-capable "Mac" as iOS.
function isIOS() {
    const ua = window.navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return true;
    return /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
}

export default function PWAInstallPrompt() {
    // The deferred BeforeInstallPromptEvent; null until the browser offers it.
    const [installPrompt, setInstallPrompt] = useState(null);
    const [installed, setInstalled] = useState(false);
    const [showIOSHelp, setShowIOSHelp] = useState(false);

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

        const adopt = async () => {
            if (cancelled) return;
            if (await detectInstalled()) {
                if (!cancelled) setInstalled(true);
                return;
            }
            if (!cancelled) setInstallPrompt(window.__deferredInstallPrompt ?? null);
        };

        // The event may already have fired before we mounted, so check the stash
        // now and also listen for it arriving later.
        adopt();

        // Fallback for when the inline capture in index.html didn't run (e.g. a
        // stale cached document): stash the event ourselves. Harmless if it did
        // run — both listeners see the same event.
        const onBeforeInstallPrompt = (event) => {
            event.preventDefault();
            window.__deferredInstallPrompt = event;
            adopt();
        };

        // Fired once the PWA has been installed — hide the button for good.
        const onAppInstalled = () => {
            if (cancelled) return;
            window.__deferredInstallPrompt = null;
            setInstallPrompt(null);
            setInstalled(true);
        };

        window.addEventListener('pwa-install-available', adopt);
        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.addEventListener('appinstalled', onAppInstalled);
        return () => {
            cancelled = true;
            window.removeEventListener('pwa-install-available', adopt);
            window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
            window.removeEventListener('appinstalled', onAppInstalled);
        };
    }, [detectInstalled]);

    const handleInstall = useCallback(async () => {
        if (!installPrompt) return;
        const result = await installPrompt.prompt();
        console.log(`Install prompt was: ${result?.outcome}`);
        // The deferred prompt can only be used once — clear it and hide the button.
        window.__deferredInstallPrompt = null;
        setInstallPrompt(null);
    }, [installPrompt]);

    const iOS = isIOS();

    // Never offer to install an app that's already installed. Otherwise we need
    // either a deferred prompt (Chromium) or the manual iOS path.
    if (installed) return null;
    if (!installPrompt && !iOS) return null;

    const buttonSx = {
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 2000,
        textTransform: 'none',
        borderRadius: 8,
        boxShadow: 3,
    };

    if (!installPrompt && iOS) {
        return (
            <>
                <Button
                    onClick={() => setShowIOSHelp(true)}
                    variant="contained"
                    startIcon={<IosShareIcon />}
                    sx={buttonSx}
                >
                    Install App
                </Button>
                <Dialog open={showIOSHelp} onClose={() => setShowIOSHelp(false)}>
                    <DialogTitle>Install GEC Services</DialogTitle>
                    <DialogContent>
                        <DialogContentText component="div">
                            To add this app to your home screen:
                            <ol>
                                <li>Tap the Share button in the Safari toolbar.</li>
                                <li>Choose <strong>Add to Home Screen</strong>.</li>
                                <li>Tap <strong>Add</strong> to confirm.</li>
                            </ol>
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowIOSHelp(false)}>Got it</Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    }

    return (
        <Button
            onClick={handleInstall}
            variant="contained"
            startIcon={<GetAppIcon />}
            sx={buttonSx}
        >
            Install App
        </Button>
    );
}

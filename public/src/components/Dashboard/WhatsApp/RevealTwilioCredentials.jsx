import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, IconButton, Tooltip, Alert, Box, Typography,
} from "@mui/material";
import { MdContentCopy, MdVisibility, MdVisibilityOff, MdCheck } from "react-icons/md";

const SERVER_URL = import.meta.env.VITE_SERVERURL;

// How long revealed credentials stay on screen before they are wiped from
// component state. Long enough to copy them, short enough that an unattended
// screen does not keep an auth token visible.
const AUTO_HIDE_MS = 60_000;

const CredentialRow = ({ label, value }) => {
    const [shown, setShown] = useState(false);
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard blocked — the value is on screen to copy by hand */
        }
    };

    return (
        <Box sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: 11, color: "text.secondary", mb: 0.25 }}>
                {label}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box
                    component="code"
                    sx={{
                        flex: 1, minWidth: 0, fontSize: 12, p: "6px 8px",
                        bgcolor: "action.hover", borderRadius: 1,
                        overflowWrap: "anywhere",
                    }}
                >
                    {shown ? value : "•".repeat(Math.min(value.length, 34))}
                </Box>
                <Tooltip title={shown ? "Hide" : "Show"}>
                    <IconButton size="small" onClick={() => setShown((prev) => !prev)}>
                        {shown ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
                    </IconButton>
                </Tooltip>
                <Tooltip title={copied ? "Copied" : "Copy"}>
                    <IconButton size="small" onClick={copy}>
                        {copied ? <MdCheck size={16} /> : <MdContentCopy size={16} />}
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
};

CredentialRow.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
};

/**
 * Re-authenticates the administrator, then reveals the Twilio credentials.
 *
 * The password is POSTed and checked on the server — it is never compared in the
 * browser, which would require shipping the secret in the bundle and would make
 * the gate purely cosmetic.
 */
const RevealTwilioCredentials = ({ open, onClose }) => {
    const [password, setPassword] = useState("");
    const [credentials, setCredentials] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const hideTimer = useRef(null);

    const wipe = () => {
        setPassword("");
        setCredentials(null);
        setError(null);
        setLoading(false);
        if (hideTimer.current) {
            clearTimeout(hideTimer.current);
            hideTimer.current = null;
        }
    };

    // Never leave credentials sitting in state after the dialog goes away.
    useEffect(() => {
        if (!open) wipe();
        return () => {
            if (hideTimer.current) clearTimeout(hideTimer.current);
        };
    }, [open]);

    const submit = async (event) => {
        event.preventDefault();
        if (!password || loading) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(
                `${SERVER_URL}/api/whatsapp/reveal-twilio-credentials`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ password }),
                }
            );

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data.error || "Could not reveal credentials.");
                setLoading(false);
                return;
            }

            setCredentials(data);
            setPassword("");
            setLoading(false);

            hideTimer.current = setTimeout(() => {
                setCredentials(null);
                setError("Credentials hidden after 60 seconds. Re-enter the password to view them again.");
            }, AUTO_HIDE_MS);
        } catch {
            setError("Network error. Please try again.");
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontSize: 16 }}>Twilio Credentials</DialogTitle>

            <DialogContent>
                {credentials ? (
                    <>
                        <Alert severity="warning" sx={{ mb: 2, fontSize: 12 }}>
                            The auth token grants full control of the Twilio account,
                            including sending messages and incurring charges. Do not
                            share it or leave this open on screen.
                        </Alert>
                        <CredentialRow label="TWILIO_ACCOUNT_SID" value={credentials.accountSid} />
                        <CredentialRow label="TWILIO_AUTH_TOKEN" value={credentials.authToken} />
                    </>
                ) : (
                    <form onSubmit={submit}>
                        <Typography sx={{ fontSize: 13, mb: 2 }}>
                            Enter the admin password to reveal the Twilio account SID
                            and auth token.
                        </Typography>

                        <TextField
                            autoFocus
                            fullWidth
                            size="small"
                            type="password"
                            label="Admin password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />

                        {error && (
                            <Alert severity="error" sx={{ mt: 2, fontSize: 12 }}>
                                {error}
                            </Alert>
                        )}

                        {/* Lets Enter submit the form without a visible button. */}
                        <button type="submit" style={{ display: "none" }} />
                    </form>
                )}

                {credentials && error && (
                    <Alert severity="info" sx={{ mt: 1, fontSize: 12 }}>{error}</Alert>
                )}
            </DialogContent>

            <DialogActions>
                <Button size="small" onClick={onClose} sx={{ textTransform: "none" }}>
                    Close
                </Button>
                {!credentials && (
                    <Button
                        size="small"
                        variant="contained"
                        disableElevation
                        onClick={submit}
                        disabled={!password || loading}
                        sx={{ textTransform: "none" }}
                    >
                        {loading ? "Checking…" : "Reveal"}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

RevealTwilioCredentials.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default RevealTwilioCredentials;

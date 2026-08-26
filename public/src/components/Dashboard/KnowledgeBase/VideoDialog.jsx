import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Dialog, DialogTitle, DialogContent, IconButton, CircularProgress } from "@mui/material";
import { MdClose } from "react-icons/md";

// See knowledgeBase.telemetry.js — the API lives on a different origin in
// development, so video URLs need the same prefix as every other call.
const SERVER_URL = import.meta.env.VITE_SERVERURL;

/**
 * Plays one tutorial recording.
 *
 * The native <video> element is deliberate: it brings seek, pause, resume,
 * fullscreen, keyboard and screen-reader support for free, and behaves correctly
 * on iOS Safari — all without adding a player library to the bundle.
 *
 * Authentication is a streaming ticket, not the admin cookie. A <video> element
 * cannot attach an Authorization header, and the cookie only reaches a
 * cross-origin request if the element opts in — which Safari's ITP and Chrome's
 * third-party cookie phase-out then block anyway. So the dialog first asks the
 * API for a short-lived, single-video ticket over an ordinary credentialed
 * fetch, and plays the URL that comes back. That URL needs no cookie, which is
 * what lets the browser drive playback with Range requests: `preload="metadata"`
 * fetches only enough to show the duration, and a seek fetches only the region
 * seeked to, instead of buffering the whole file first.
 */
const VideoDialog = ({ topic, open, onClose, onPlay }) => {
    const [failed, setFailed] = useState(false);
    const [streamingUrl, setStreamingUrl] = useState(null);

    const videoId = topic?.video?.videoId;

    useEffect(() => {
        // A fresh topic gets a fresh error state, and — just as importantly — a
        // fresh URL: a ticket left over from the previously-viewed topic is
        // scoped to that video and would only ever 404 here.
        setFailed(false);
        setStreamingUrl(null);

        if (!open || !videoId) return;

        // Tickets expire, so one is minted per dialog-open rather than cached
        // for the session.
        let cancelled = false;

        fetch(`${SERVER_URL}/api/knowledge-base/videos/${videoId}/ticket`, {
            // Cross-origin in development, so the admin cookie needs an explicit
            // opt-in. The server allows this origin with credentials: true.
            credentials: "include",
        })
            .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
            .then((data) => {
                if (cancelled) return;
                if (!data?.streamingUrl) return Promise.reject(new Error("No streamingUrl"));
                setStreamingUrl(`${SERVER_URL}${data.streamingUrl}`);
            })
            .catch(() => {
                // Reuses the same panel a failed <video> load shows: from the
                // administrator's side, "no ticket" and "no video" are the same
                // outcome and deserve the same message.
                if (!cancelled) setFailed(true);
            });

        // The dialog can be closed, or the topic switched, while the ticket is
        // still in flight — without this, that late response would set state on
        // a dialog the administrator has already moved on from.
        return () => {
            cancelled = true;
        };
    }, [open, videoId]);

    if (!topic?.video) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ pr: 6, fontSize: 16 }}>
                {topic.title}
                <IconButton
                    onClick={onClose}
                    aria-label="Close tutorial"
                    sx={{ position: "absolute", right: 8, top: 8 }}
                >
                    <MdClose />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                {failed ? (
                    <div className="kb-video__error">
                        <p>This tutorial video is currently unavailable.</p>
                        <p style={{ fontSize: 12 }}>
                            The recording could not be loaded. Everything else in the
                            Knowledge Base still works.
                        </p>
                    </div>
                ) : !streamingUrl ? (
                    // The <video> element is deliberately not mounted until the
                    // ticket resolves: mounting it with an empty src fires onError
                    // immediately and would latch the failure panel above before
                    // the ticket ever arrived.
                    <div className="kb-video__loading" style={{ display: "grid", placeItems: "center", minHeight: 240 }}>
                        <CircularProgress size={28} aria-label="Loading tutorial" />
                    </div>
                ) : (
                    <video
                        className="kb-video__frame"
                        src={streamingUrl}
                        controls
                        preload="metadata"
                        onPlay={onPlay}
                        onError={() => setFailed(true)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};

VideoDialog.propTypes = {
    topic: PropTypes.shape({
        id: PropTypes.string,
        title: PropTypes.string,
        video: PropTypes.shape({ videoId: PropTypes.string.isRequired }),
    }),
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onPlay: PropTypes.func,
};

export default VideoDialog;

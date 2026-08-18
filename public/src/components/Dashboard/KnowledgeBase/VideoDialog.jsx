import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
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
 * `preload="metadata"` fetches only enough to show the duration and enable
 * seeking. The httpOnly `a-usr` admin cookie rides along automatically on this
 * same-origin request, so there is no token to pass and no blob to fetch.
 */
const VideoDialog = ({ topic, open, onClose, onPlay }) => {
    const [failed, setFailed] = useState(false);

    // A fresh topic gets a fresh error state, or a previous failure would stick.
    useEffect(() => {
        if (open) setFailed(false);
    }, [open, topic?.id]);

    if (!topic?.video) return null;

    const src = `${SERVER_URL}/api/knowledge-base/videos/${topic.video.videoId}`;

    // A media element only sends cookies cross-origin when it opts in, and only
    // then if the server echoes the origin back with credentials allowed — which
    // it does for CLIENT_ORIGIN. Same-origin (production) needs no attribute, and
    // setting one there would demand CORS headers the server has no reason to send.
    const isCrossOrigin = Boolean(SERVER_URL) && !src.startsWith(window.location.origin);

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
                ) : (
                    <video
                        className="kb-video__frame"
                        src={src}
                        {...(isCrossOrigin ? { crossOrigin: "use-credentials" } : {})}
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

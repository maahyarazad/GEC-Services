import React, { createContext, useContext, useState, useCallback } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Slide from "@mui/material/Slide";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { toastAlertSx, toastAlertErrorSx } from "../PartnerOnboarding/PartnerOnboardingStyles";

const neutralAlertSx = {
    background: "#f7f7f7",
    border: "1px solid rgba(0,0,0,0.1)",
    color: "#141414",
    fontWeight: 500,
    borderRadius: "8px",
       alignItems: "center",
    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
    "& .MuiAlert-icon": { color: "#555" }, 
     "& .MuiAlert-message": { padding: 0, fontSize: "0.875rem", lineHeight: 1.5 },
};

const successAlertSx = {
    background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    borderLeft: "4px solid #16a34a",
    color: "#14532d",
    fontWeight: 500,
    borderRadius: "10px",
    boxShadow: "0 4px 20px rgba(34, 197, 94, 0.12), 0 1px 4px rgba(0,0,0,0.06)",
    padding: "10px 16px",
    "& .MuiAlert-icon": { color: "#16a34a", fontSize: "20px" },
    "& .MuiAlert-message": { padding: 0, fontSize: "0.875rem", lineHeight: 1.5 },
    "& .MuiAlert-action": {
        paddingTop: 0,
        "& .MuiIconButton-root": { color: "#15803d", opacity: 0.7 },
    },
};

const SnackbarContext = createContext();

function SlideTransition(props) {
    return <Slide {...props} direction="down" />;
}

function SlideUp(props) {
    return <Slide {...props} direction="up" />;
}

export const SnackbarProvider = ({ children, useGECStyle = false }) => {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("success");

    const theme = useTheme();
    const isLargeScreen = useMediaQuery(theme.breakpoints.up("md"));

    const showSnackbar = useCallback((msg, type = "success") => {
        setMessage(msg);
        setMessageType(type);
        setOpen(true);
    }, []);

    const closeSnackbar = useCallback(() => {
        setOpen(false);
    }, []);

    const handleClose = (_, reason) => {
        if (reason === "clickaway") return;
        closeSnackbar();
    };

    // ── Default snackbar (neutral for info, error-styled for errors) ─────
    const defaultSnackbar = (
        <Snackbar
            TransitionComponent={SlideTransition}
            anchorOrigin={{ vertical: "top", horizontal: isLargeScreen ? "right" : "center" }}
            open={open}
            autoHideDuration={messageType === "error" ? 6000 : 5000}
            onClose={handleClose}
            sx={{ zIndex: 1400, top: { xs: 16, sm: 24 } }}
        >
            <Alert
                onClose={handleClose}
                severity={messageType === "error" ? "error" : "info"}
                sx={messageType === "error" ? toastAlertErrorSx : neutralAlertSx}
            >
                {message}
            </Alert>
        </Snackbar>
    );

    // ── Success snackbar ──────────────────────────────────────────────────
    const successSnackbar = (
        <Snackbar
            TransitionComponent={SlideTransition}
            anchorOrigin={{ vertical: "top", horizontal: isLargeScreen ? "right" : "center" }}
            open={open}
            autoHideDuration={4000}
            onClose={handleClose}
            sx={{ zIndex: 1400, top: { xs: 16, sm: 24 } }}
        >
            <Alert onClose={handleClose} severity="success" sx={successAlertSx}>
                {message}
            </Alert>
        </Snackbar>
    );

    // ── GEC styled snackbar ───────────────────────────────────────────────
    const gecSnackbar = (
        <Snackbar
            TransitionComponent={SlideUp}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            open={open}
            autoHideDuration={messageType === "error" ? 6000 : 4000}
            onClose={handleClose}
            sx={{
                zIndex: 1400,
                width: { xs: "calc(100% - 32px)", sm: "auto" },
                maxWidth: 520,
                // Let MUI's anchorOrigin center it — don't override left/transform
                "&.MuiSnackbar-anchorOriginBottomCenter": {
                    bottom: { xs: 16, sm: 24 },
                    left: "50% !important",
                    right: "auto",
                    transform: "translateX(-50%) !important",
                },
            }}
        >
            <Alert
                onClose={handleClose}
                severity={messageType === "error" ? "error" : "success"}
                sx={messageType === "error" ? toastAlertErrorSx : toastAlertSx}
            >
                {message}
            </Alert>
        </Snackbar>
    );

    return (
        <SnackbarContext.Provider value={{ showSnackbar, closeSnackbar }}>
            {children}
            {useGECStyle
                ? gecSnackbar
                : messageType === "success"
                    ? successSnackbar
                    : defaultSnackbar}
        </SnackbarContext.Provider>
    );
};

export const useSnackbar = () => useContext(SnackbarContext);
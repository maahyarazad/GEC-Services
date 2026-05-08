import React, { createContext, useContext, useState, useCallback } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Slide from "@mui/material/Slide";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { IoMdClose } from "react-icons/io";
import "sweetalert2/dist/sweetalert2.min.css";
import { GEC, toastAlertSx, toastAlertErrorSx } from "../PartnerOnboarding/PartnerOnboardingStyles";

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

    // ── Default (original) snackbar ───────────────────────────────────────
    const defaultAction = (
        <span
            aria-label="close"
            onClick={handleClose}
            style={{ cursor: "pointer" }}
        >
            <IoMdClose fontSize="24px" />
        </span>
    );

    const defaultSnackbar = (
        <Snackbar
            TransitionComponent={SlideTransition}
            anchorOrigin={{
                vertical: "top",
                horizontal: isLargeScreen ? "right" : "center",
            }}
            slotProps={{
                content: {
                    sx: {
                        position: "fixed",
                        top: 15,
                        fontSize: { xs: "1rem", sm: "1.2rem" },
                        backgroundColor: "#f7f7f7",
                        color: "#141414",
                        padding: { xs: "12px 16px", sm: "16px 24px" },
                        margin: 0,
                        borderRadius: "8px",
                        boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: "center",
                        width: "90%",
                        maxWidth: 600,
                        minWidth: { lg: 300 },
                        "& .MuiSnackbarContent-message": {
                            width: "100%",
                            margin: 0,
                        },
                    },
                },
            }}
            open={open}
            autoHideDuration={5000}
            onClose={handleClose}
            message={
                <div className="d-flex justify-content-between col">
                    <div className="d-flex justify-content-start col-9">
                        <div className="d-flex justify-content-start align-items-center">
                            {messageType === "success" ? (
                                <div className="swal2-success">
                                    <div className="swal2-success-line-tip"></div>
                                    <div className="swal2-success-line-long"></div>
                                </div>
                            ) : (
                                <div className="swal2-error"></div>
                            )}
                        </div>
                        <div className="ps-2 d-flex justify-content-start align-items-center">
                            {message}
                        </div>
                    </div>
                    <div className="d-flex justify-content-end align-items-center col-3">
                        {defaultAction}
                    </div>
                </div>
            }
        />
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
            {useGECStyle ? gecSnackbar : defaultSnackbar}
        </SnackbarContext.Provider>
    );
};

export const useSnackbar = () => useContext(SnackbarContext);
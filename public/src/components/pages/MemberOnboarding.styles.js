import { styled } from "@mui/material/styles";
import { StepConnector, stepConnectorClasses } from "@mui/material";

// ── GEC Brand Tokens ──────────────────────────────────────────────────────
export const GEC = {
    gold: "#DDAE3A",
    goldDark: "#b9962b",
    goldLight: "#f0cc6e",
    goldMuted: "rgba(221, 174, 58, 0.12)",
    goldBorder: "rgba(221, 174, 58, 0.25)",
    bg: "linear-gradient(145deg, #f7f4ee 0%, #ede8db 60%, #e4ddd0 100%)",
    cardBg: "#ffffff",
    textPrimary: "#1a1710",
    textSecondary: "#6b6347",
};

// ── Custom Stepper Connector ──────────────────────────────────────────────
export const GoldConnector = styled(StepConnector)(() => ({
    [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 20 },
    [`&.${stepConnectorClasses.active}`]: {
        [`& .${stepConnectorClasses.line}`]: {
            background: `linear-gradient(90deg, ${GEC.gold}, ${GEC.goldLight})`,
        },
    },
    [`&.${stepConnectorClasses.completed}`]: {
        [`& .${stepConnectorClasses.line}`]: { background: GEC.gold },
    },
    [`& .${stepConnectorClasses.line}`]: {
        height: 2,
        border: 0,
        backgroundColor: GEC.goldBorder,
        borderRadius: 1,
    },
}));

// ── Custom Step Icon Root ─────────────────────────────────────────────────
export const GoldStepIconRoot = styled("div")(({ ownerState }) => ({
    width: 42,
    height: 42,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `2px solid ${GEC.goldBorder}`,
    background: GEC.cardBg,
    color: GEC.textSecondary,
    transition: "all 0.3s ease",
    ...(ownerState.active && {
        background: `linear-gradient(135deg, ${GEC.gold}, ${GEC.goldDark})`,
        border: `2px solid ${GEC.gold}`,
        color: "#fff",
        boxShadow: `0 4px 16px rgba(221,174,58,0.35)`,
    }),
    ...(ownerState.completed && {
        background: GEC.goldMuted,
        border: `2px solid ${GEC.gold}`,
        color: GEC.goldDark,
    }),
}));

// ── Page wrapper ──────────────────────────────────────────────────────────
export const pageWrapperSx = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: GEC.bg,
    p: { xs: 0, sm: 2 },
    position: "relative",
    overflow: "hidden",
    "&::before": {
        content: '""',
        position: "absolute",
        inset: 0,
        backgroundImage: `
            radial-gradient(circle at 10% 90%, rgba(221,174,58,0.10) 0%, transparent 40%),
            radial-gradient(circle at 90% 10%, rgba(221,174,58,0.08) 0%, transparent 40%)
        `,
        pointerEvents: "none",
    },
};

// ── Card / Paper ──────────────────────────────────────────────────────────
export const cardSx = {
    backgroundColor: "white",
    borderRadius: { xs: 0, sm: "20px" },
    overflow: "hidden",
    border: { xs: "none", sm: `1px solid ${GEC.goldBorder}` },
    boxShadow: {
        xs: "none",
        sm: "0 8px 40px rgba(185,150,43,0.12), 0 2px 8px rgba(0,0,0,0.06)",
    },
    width: "100vw",
    maxWidth: "1000px",
    height: { xs: "100dvh", sm: "97vh" },
    display: "flex",
    flexDirection: "column",
};

// ── Top accent bar ────────────────────────────────────────────────────────
export const topAccentBarSx = {
    height: 5,
    flexShrink: 0,
    background: `linear-gradient(90deg, ${GEC.goldDark}, ${GEC.gold}, ${GEC.goldLight}, ${GEC.gold}, ${GEC.goldDark})`,
};

// ── Bottom accent bar ─────────────────────────────────────────────────────
export const bottomAccentBarSx = {
    height: 3,
    flexShrink: 0,
    background: `linear-gradient(90deg, transparent, ${GEC.goldBorder}, transparent)`,
};

// ── Inner content wrapper ─────────────────────────────────────────────────
export const innerWrapperSx = {
    px: { xs: 2, sm: 4 },
    pt: 3,
    pb: 2,
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflow: "hidden",
};

// ── Logo ──────────────────────────────────────────────────────────────────
export const logoSx = {
    height: 55,
    mb: 3,
    display: "block",
    filter: "drop-shadow(0 2px 8px rgba(185,150,43,0.20))",
};

// ── Stepper sx ────────────────────────────────────────────────────────────
export const stepperSx = {
    mb: 0,
    "& .MuiStepLabel-label": {
        color: GEC.textSecondary,
        fontSize: { xs: "0.78rem", sm: "0.9rem" },
        fontWeight: 500,
        mt: 0.5,
    },
    "& .MuiStepLabel-label.Mui-active": {
        color: GEC.goldDark,
        fontWeight: 700,
    },
    "& .MuiStepLabel-label.Mui-completed": {
        color: GEC.gold,
        fontWeight: 600,
    },
};

// ── Divider sx ────────────────────────────────────────────────────────────
export const dividerSx = {
    height: 1,
    border: "none",
    background: `linear-gradient(90deg, transparent, ${GEC.goldBorder}, transparent)`,
    my: 2,
    flexShrink: 0,
};

// ── Step content scroll area ──────────────────────────────────────────────
export const stepContentAreaSx = {
    position: "relative",
    flex: 1,
    overflow: "hidden",
    minHeight: { xs: "50vh", sm: "55vh" },
};

// ── Slide inner box ───────────────────────────────────────────────────────
export const slideInnerBoxSx = (isMobile) => ({
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    width: "100%",
    minHeight: isMobile ? "50vh" : "55vh",
    padding: isMobile ? "0.5rem" : "1rem",
    left: 0,
    overflow: "auto",
    textAlign: isMobile ? "center" : "left",
});

// ── Navigation row ────────────────────────────────────────────────────────
export const navRowSx = (isMobile) => ({
    display: "flex",
    flexDirection: isMobile ? "column-reverse" : "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 1.5,
    flexShrink: 0,
});

// ── Back button ───────────────────────────────────────────────────────────
export const backBtnSx = (isMobile) => ({
    textTransform: "none",
    borderRadius: 2,
    px: 3,
    py: 1.2,
    borderColor: GEC.goldBorder,
    color: GEC.textSecondary,
    fontWeight: 500,
    width: isMobile ? "100%" : "auto",
    "&:hover": {
        borderColor: GEC.gold,
        color: GEC.goldDark,
        background: GEC.goldMuted,
    },
});

// ── Primary / next button ─────────────────────────────────────────────────
export const primaryBtnSx = (isMobile) => ({
    textTransform: "none",
    borderRadius: 2,
    px: 3,
    py: 1.2,
    fontWeight: 600,
    fontSize: 15,
    width: isMobile ? "100%" : "auto",
    background: `linear-gradient(135deg, ${GEC.gold} 0%, ${GEC.goldDark} 100%)`,
    color: "#fff",
    boxShadow: `0 4px 16px rgba(185,150,43,0.30)`,
    "&:hover": {
        background: `linear-gradient(135deg, ${GEC.goldLight} 0%, ${GEC.gold} 100%)`,
        boxShadow: `0 6px 24px rgba(185,150,43,0.45)`,
        transform: "translateY(-1px)",
    },
    "&.Mui-disabled": {
        background: GEC.goldBorder,
        color: GEC.textSecondary,
        boxShadow: "none",
    },
    transition: "all 0.2s ease",
});

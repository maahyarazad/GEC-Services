import { styled } from "@mui/material/styles";
import { StepConnector, Typography, stepConnectorClasses } from "@mui/material";

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

// ── Field Label Component ─────────────────────────────────────────────────
export const FieldLabel = ({ children }) => (
    <Typography
        variant="caption"
        sx={{
            display: "block",
            mb: 0.8,
            color: GEC.textSecondary,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontWeight: 600,
        }}
    >
        {children}
    </Typography>
);

// ── Shared Field sx ───────────────────────────────────────────────────────
export const fieldSx = {
    "& .MuiOutlinedInput-notchedOutline": {
        bottom: 5,
        top: -6,
    },
    "& .MuiOutlinedInput-root": {
        background: "#faf8f3",
        borderRadius: 2,
        color: GEC.textPrimary,
        "& fieldset": { borderColor: GEC.goldBorder },
        "&:hover fieldset": { borderColor: GEC.gold },
        "&.Mui-focused fieldset": {
            borderColor: GEC.gold,
            boxShadow: `0 0 0 3px ${GEC.goldMuted}`,
        },
        "&.Mui-error fieldset": { borderColor: "#ef4444" },
    },
    "& input::placeholder": { color: "#a89b7a" },
    "& .MuiFormHelperText-root": { color: "#ef4444" },
};

// ── Page wrapper sx ───────────────────────────────────────────────────────
export const pageWrapperSx = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: GEC.bg,
    p: 2,
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

// ── Container sx (20% wider on large screens) ────────────────────────────
export const containerSx = {
    position: "relative",
    zIndex: 1,
    "@media (min-width: 900px)": {
        maxWidth: "796px",
    },
};
// ── Paper sx ──────────────────────────────────────────────────────────────
export const paperSx = {
    borderRadius: "20px",
    overflow: "hidden",
    border: `1px solid ${GEC.goldBorder}`,
    boxShadow: "0 8px 40px rgba(185,150,43,0.12), 0 2px 8px rgba(0,0,0,0.06)",
};

// ── Top accent bar sx ─────────────────────────────────────────────────────
export const topAccentBarSx = {
    height: 5,
    background: `linear-gradient(90deg, ${GEC.goldDark}, ${GEC.gold}, ${GEC.goldLight}, ${GEC.gold}, ${GEC.goldDark})`,
};

// ── Bottom accent bar sx ──────────────────────────────────────────────────
export const bottomAccentBarSx = {
    height: 3,
    background: `linear-gradient(90deg, transparent, ${GEC.goldBorder}, transparent)`,
};

// ── Logo sx ───────────────────────────────────────────────────────────────
export const logoSx = {
    pb: 4,
    height: 100,
    cursor: "pointer",
    filter: "drop-shadow(0 2px 8px rgba(185,150,43,0.20))",
    transition: "transform 0.3s ease, filter 0.3s ease",
    "&:hover": {
        transform: "scale(1.04)",
        filter: "drop-shadow(0 4px 16px rgba(185,150,43,0.35))",
    },
};

// ── Title sx ──────────────────────────────────────────────────────────────
export const titleSx = {
    fontFamily: "'Georgia', serif",
    fontWeight: 700,
    color: GEC.textPrimary,
    lineHeight: 1.25,
    mb: 0.75,
};

// ── Stepper label sx ──────────────────────────────────────────────────────
export const stepLabelSx = {
    "& .MuiStepLabel-label": {
        color: GEC.textSecondary,
        fontSize: 12,
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
    background: `linear-gradient(90deg, transparent, ${GEC.goldBorder}, transparent)`,
    mb: 4,
};

// ── Primary button sx (send OTP / continue / submit) ─────────────────────
export const primaryBtnSx = {
    py: 1.4,
    borderRadius: 2,
    background: `linear-gradient(135deg, ${GEC.gold} 0%, ${GEC.goldDark} 100%)`,
    color: "#fff",
    fontWeight: 600,
    fontSize: 15,
    textTransform: "none",
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
};

// ── Secondary / back button sx ────────────────────────────────────────────
export const secondaryBtnSx = {
    flex: 1,
    py: 1.4,
    borderRadius: 2,
    borderColor: GEC.goldBorder,
    color: GEC.textSecondary,
    fontWeight: 500,
    textTransform: "none",
    fontSize: 15,
    "&:hover": {
        borderColor: GEC.gold,
        color: GEC.goldDark,
        background: GEC.goldMuted,
    },
};

// ── Info card sx (used in Upload and Review steps) ────────────────────────
export const infoCardSx = {
    background: "#faf8f3",
    border: `1px solid ${GEC.goldBorder}`,
    borderRadius: 2.5,
    px: 2.5,
    py: 1,
};

// ── Review card sx ────────────────────────────────────────────────────────
export const reviewCardSx = {
    background: "#faf8f3",
    border: `1px solid ${GEC.goldBorder}`,
    borderRadius: 2.5,
    p: 2.5,
};

// ── Drop zone sx ──────────────────────────────────────────────────────────
export const dropZoneSx = {
    border: `2px dashed ${GEC.goldBorder}`,
    borderRadius: 3,
    background: "#faf8f3",
    px: 5,
    py: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 1.5,
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": { borderColor: GEC.gold, background: GEC.goldMuted },
    "&:focus-within": { borderColor: GEC.gold },
};

// ── Terms banner sx ───────────────────────────────────────────────────────
export const termsBannerSx = {
    display: "flex",
    alignItems: "flex-start",
    gap: 1.5,
    p: 2,
    background: GEC.goldMuted,
    border: `1px solid ${GEC.goldBorder}`,
    borderRadius: 2,
};

// ── Wizard Completed banner sx ───────────────────────────────────────────────────────
export const wizardCompletedBannerSx = {
    display: "flex",
    alignItems: "flex-start",
    gap: 1.5,
    p: 2,
    background: GEC.goldDark,
    border: `1px solid ${GEC.goldLight}`,
    borderRadius: 2,
};

// ── Toast / Alert sx ──────────────────────────────────────────────────────
export const toastAlertSx = {
    background: "#fffbec",
    border: `1px solid ${GEC.goldBorder}`,
    color: GEC.goldDark,
    fontWeight: 500,
    "& .MuiAlert-icon": { color: GEC.gold },
};

export const toastAlertErrorSx = {
  background: "linear-gradient(135deg, #fff8f6 0%, #fff3ef 100%)",
  border: `1px solid rgba(211, 84, 54, 0.28)`,
  borderLeft: `4px solid #d35436`,
  color: "#8b2e18",
  fontWeight: 500,
  alignItems: "center",
  borderRadius: "10px",
  boxShadow: "0 4px 20px rgba(211, 84, 54, 0.12), 0 1px 4px rgba(0,0,0,0.06)",
  padding: "10px 16px",

  "& .MuiAlert-icon": {
    color: "#d35436",
    fontSize: "20px",
  },

  "& .MuiAlert-message": {
    padding: 0,
    fontSize: "0.875rem",
    lineHeight: 1.5,
  },

  "& .MuiAlert-action": {
    paddingTop: 0,
    "& .MuiIconButton-root": {
      color: "#b94a2c",
      opacity: 0.7,
      "&:hover": { opacity: 1 },
    },
  },
};

// ── Footer link sx ────────────────────────────────────────────────────────
export const footerLinkSx = {
    color: GEC.goldDark,
    textDecoration: "underline",
    cursor: "pointer",
};
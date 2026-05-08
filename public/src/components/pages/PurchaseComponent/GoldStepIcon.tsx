import CheckIcon from "@mui/icons-material/Check";
import { styled } from "@mui/material/styles";
import { StepConnector, Typography, stepConnectorClasses } from "@mui/material";
import { GEC } from "../../PartnerOnboarding/PartnerOnboardingStyles";

// ── Gold Connector ────────────────────────────────────────────────────────
// top: 21 = half of the 42px icon height, keeps the line centered on the circle
export const GoldConnector = styled(StepConnector)(() => ({
    [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 20 },
    [`&.${stepConnectorClasses.active}`]: {
        [`& .${stepConnectorClasses.line}`]: {
            background: `linear-gradient(90deg, ${GEC.gold}, ${GEC.goldLight})`,
        },
    },
    [`&.${stepConnectorClasses.completed}`]: {
        [`& .${stepConnectorClasses.line}`]: {
            background: GEC.gold,
        },
    },
    [`& .${stepConnectorClasses.line}`]: {
        height: 2,
        border: 0,
        backgroundColor: GEC.goldBorder,
        borderRadius: 1,
    },
}));

// ── Gold Step Icon Root ───────────────────────────────────────────────────
// shouldForwardProp prevents ownerState leaking to the DOM
export const GoldStepIconRoot = styled("div", {
    shouldForwardProp: (prop) => prop !== "ownerState",
})(({ ownerState }) => ({
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
    zIndex: 1,
    ...(ownerState?.active && {
        background: `linear-gradient(135deg, ${GEC.gold}, ${GEC.goldDark})`,
        border: `2px solid ${GEC.gold}`,
        color: "#fff",
        boxShadow: `0 4px 16px rgba(221,174,58,0.35)`,
    }),
    ...(ownerState?.completed && {
        background: GEC.goldMuted,
        border: `2px solid ${GEC.gold}`,
        color: GEC.goldDark,
    }),
}));

// ── Gold Step Icon Component ──────────────────────────────────────────────
export function GoldStepIcon(props) {
    const { active, completed, className, icon } = props;

    return (
        <GoldStepIconRoot ownerState={{ active, completed }} className={className}>
            {completed ? (
                <CheckIcon sx={{ fontSize: 18 }} />
            ) : (
                <Typography
                    sx={{
                        fontSize: 14,
                        fontWeight: 700,
                        lineHeight: 1,
                        color: "inherit",
                        fontFamily: "'Georgia', serif",
                    }}
                >
                    {icon}
                </Typography>
            )}
        </GoldStepIconRoot>
    );
}
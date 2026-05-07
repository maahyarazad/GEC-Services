import React from "react";
import {
    Box,
    Button,
    Divider,
    Step,
    StepLabel,
    Stepper,
    Slide,
    Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CardMembershipOutlinedIcon from "@mui/icons-material/CardMembershipOutlined";

import GECLogo from '../../assets/background.webp'

import AppStore from '../../assets/download-app-store.png';
import PlayStore from '../../assets/download-play-store.png';

import MemberLogin from "./MemberOnboardingComponents/MemberLogin";
import MemberUpdate from "./MemberOnboardingComponents/MemberUpdate";

import {
    GEC,
    GoldConnector,
    GoldStepIconRoot,
    pageWrapperSx,
    cardSx,
    topAccentBarSx,
    bottomAccentBarSx,
    innerWrapperSx,
    logoSx,
    stepperSx,
    dividerSx,
    stepContentAreaSx,
    slideInnerBoxSx,
    navRowSx,
    backBtnSx,
    primaryBtnSx,
} from "./MemberOnboarding.styles";

// ── Step Icon ─────────────────────────────────────────────────────────────
const stepIcons = [LoginOutlinedIcon, EditOutlinedIcon, CardMembershipOutlinedIcon];

function GoldStepIcon({ active, completed, icon }) {
    const Icon = stepIcons[Number(icon) - 1];
    return (
        <GoldStepIconRoot ownerState={{ active, completed }}>
            {completed ? (
                <CheckCircleOutlineIcon sx={{ fontSize: 20 }} />
            ) : (
                <Icon sx={{ fontSize: 20 }} />
            )}
        </GoldStepIconRoot>
    );
}
const steps = ['Check Your Current Status', 'Update Your Profile', 'Get Your Membership Pass'];
// ── Component ─────────────────────────────────────────────────────────────
export default function MemberOnboarding({
    isMobile,
    activeStep,
    slideDirection,
    wizardState,
    setWizardState,
    setActiveStep,
    isStepOptional,
    isStepSkipped,
    handleBack,
    handleNext,
    handleReset,
}) {
    return (
        <Box sx={pageWrapperSx}>
            <Box sx={cardSx}>
                {/* Top accent bar */}
                <Box sx={topAccentBarSx} />

                <Box sx={innerWrapperSx}>
                    {/* Logo */}
                    <Box component="img" src={GECLogo} alt="GEC Logo" sx={logoSx} />

                    {/* Stepper */}
                    <Stepper
                        activeStep={activeStep}
                        orientation={isMobile ? "vertical" : "horizontal"}
                        connector={isMobile ? undefined : <GoldConnector />}
                        sx={stepperSx}
                    >
                        {steps.map((label, index) => {
                            const stepProps = {};
                            const labelProps = {};

                            if (isStepOptional(index)) {
                                labelProps.optional = (
                                    <Typography variant="caption" sx={{ fontSize: "0.7rem", color: GEC.textSecondary }}>
                                        Optional
                                    </Typography>
                                );
                            }
                            if (isStepSkipped(index)) stepProps.completed = false;

                            return (
                                <Step key={label} {...stepProps}>
                                    <StepLabel
                                        {...labelProps}
                                        StepIconComponent={isMobile ? undefined : GoldStepIcon}
                                    >
                                        {label}
                                    </StepLabel>
                                </Step>
                            );
                        })}
                    </Stepper>

                    {/* Divider */}
                    <Box sx={dividerSx} />

                    {/* Step content with slide animation */}
                    <Box sx={stepContentAreaSx}>
                        <Slide
                            key={activeStep}
                            direction={slideDirection}
                            in
                            mountOnEnter
                            unmountOnExit
                            timeout={400}
                        >
                            <Box sx={slideInnerBoxSx(isMobile)}>
                                {activeStep === steps.length ? (
                                    <Box sx={{ textAlign: "center" }}>
                                        <Typography sx={{ mb: 2, color: GEC.textSecondary }}>
                                            All steps completed — you're finished!
                                        </Typography>
                                        <Button
                                            onClick={handleReset}
                                            variant="outlined"
                                            sx={{
                                                borderColor: GEC.goldBorder,
                                                color: GEC.goldDark,
                                                "&:hover": { borderColor: GEC.gold, background: GEC.goldMuted },
                                                textTransform: "none",
                                                borderRadius: 2,
                                            }}
                                        >
                                            Reset
                                        </Button>
                                    </Box>
                                ) : (
                                    <>
                                        {(() => {
                                            switch (activeStep) {
                                                case 0:
                                                    return (
                                                        <MemberLogin
                                                            wizardState={wizardState}
                                                            setWizardState={setWizardState}
                                                            setActiveStep={setActiveStep}
                                                        />
                                                    );

                                                case 1:
                                                    return (
                                                        <MemberUpdate
                                                            wizardState={wizardState}
                                                            setWizardState={setWizardState}
                                                            setActiveStep={setActiveStep}
                                                        />
                                                    );

                                                case 2:
                                                    return (
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                alignItems: "center",
                                                                gap: 2,
                                                                width: "100%",
                                                            }}
                                                        >
                                                            {/* Success banner */}
                                                            <Box
                                                                sx={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 1.5,
                                                                    px: 3,
                                                                    py: 1.5,
                                                                    background: GEC.goldMuted,
                                                                    border: `1px solid ${GEC.goldBorder}`,
                                                                    borderRadius: 2,
                                                                    maxWidth: 560,
                                                                    width: "100%",
                                                                }}
                                                            >
                                                                <CheckCircleOutlineIcon sx={{ color: GEC.gold, fontSize: 22, flexShrink: 0 }} />
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{ color: GEC.textSecondary, lineHeight: 1.65 }}
                                                                >
                                                                    Your account has been verified! Please check your email for a
                                                                    personalised Membership Pass.
                                                                </Typography>
                                                            </Box>

                                                            <Typography
                                                                sx={{
                                                                    fontSize: { xs: 14, sm: 16 },
                                                                    color: GEC.textPrimary,
                                                                    textAlign: "center",
                                                                    lineHeight: 1.7,
                                                                    maxWidth: 480,
                                                                }}
                                                            >
                                                                <strong style={{ color: GEC.goldDark }}>
                                                                    Don't forget to download the GEC Mobile App
                                                                </strong>{" "}
                                                                to avail your benefits.
                                                            </Typography>

                                                            {/* App store badges */}
                                                            <Box
                                                                sx={{
                                                                    display: "flex",
                                                                    flexDirection: { xs: "column", sm: "row" },
                                                                    gap: 2,
                                                                    alignItems: "center",
                                                                    mt: 1,
                                                                }}
                                                            >
                                                                <a
                                                                    href="https://play.google.com/store/apps/details?id=com.buenapublica.GECRewards"
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{
                                                                        display: "block",
                                                                        borderRadius: 10,
                                                                        overflow: "hidden",
                                                                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                                                                    }}
                                                                    onMouseOver={(e) => {
                                                                        e.currentTarget.style.transform = "translateY(-2px)";
                                                                        e.currentTarget.style.boxShadow = "0 6px 20px rgba(185,150,43,0.30)";
                                                                    }}
                                                                    onMouseOut={(e) => {
                                                                        e.currentTarget.style.transform = "translateY(0)";
                                                                        e.currentTarget.style.boxShadow = "none";
                                                                    }}
                                                                >
                                                                    <img
                                                                        src={PlayStore}
                                                                        alt="Get it on Google Play"
                                                                        width={220}
                                                                        style={{ display: "block" }}
                                                                    />
                                                                </a>

                                                                <a
                                                                    href="https://apps.apple.com/ae/app/gec-rewards/id6444924851"
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{
                                                                        display: "block",
                                                                        borderRadius: 10,
                                                                        overflow: "hidden",
                                                                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                                                                    }}
                                                                    onMouseOver={(e) => {
                                                                        e.currentTarget.style.transform = "translateY(-2px)";
                                                                        e.currentTarget.style.boxShadow = "0 6px 20px rgba(185,150,43,0.30)";
                                                                    }}
                                                                    onMouseOut={(e) => {
                                                                        e.currentTarget.style.transform = "translateY(0)";
                                                                        e.currentTarget.style.boxShadow = "none";
                                                                    }}
                                                                >
                                                                    <img
                                                                        src={AppStore}
                                                                        alt="Download on the App Store"
                                                                        width={220}
                                                                        style={{ display: "block" }}
                                                                    />
                                                                </a>
                                                            </Box>
                                                        </Box>
                                                    );

                                                default:
                                                    return null;
                                            }
                                        })()}
                                    </>
                                )}
                            </Box>
                        </Slide>
                    </Box>

                    {/* Navigation buttons */}
                    <Box sx={dividerSx} />

                    {activeStep < steps.length && (
                        <Box sx={navRowSx(isMobile)}>
                            <Button
                                variant="outlined"
                                disabled={activeStep === 0}
                                onClick={handleBack}
                                sx={backBtnSx(isMobile)}
                            >
                                Back
                            </Button>

                            {(() => {
                                switch (activeStep) {
                                    case 0:
                                        return (
                                            <Button
                                                variant="contained"
                                                onClick={handleNext}
                                                disabled={!wizardState.authenticate}
                                                sx={primaryBtnSx(isMobile)}
                                            >
                                                Next
                                            </Button>
                                        );

                                    case 1:
                                        return (
                                            <Button
                                                variant="contained"
                                                onClick={handleNext}
                                                disabled={!wizardState?.otpState?.getMemberPass}
                                                sx={primaryBtnSx(isMobile)}
                                            >
                                                Get Your Pass
                                            </Button>
                                        );

                                    default:
                                        return null;
                                }
                            })()}
                        </Box>
                    )}
                </Box>

                {/* Bottom accent bar */}
                <Box sx={bottomAccentBarSx} />
            </Box>
        </Box>
    );
}

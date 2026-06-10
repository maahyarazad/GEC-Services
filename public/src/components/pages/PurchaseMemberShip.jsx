import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Slide from '@mui/material/Slide';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material';
import GECLogo from '../../assets/background.webp'
const MemberLogin = React.lazy(() => import("./PurchaseComponent/MemberLogin"));
const MemberUpdate = React.lazy(() => import("./PurchaseComponent/MemberUpdate"));
import { GoldStepIcon, GoldConnector } from './PurchaseComponent/GoldStepIcon'
import { SnackbarProvider } from "../../components/Providers/Snackbar";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import {
    GEC,
    pageWrapperSx,
    containerSx,
    memberpaperSx,
    topAccentBarSx,
    bottomAccentBarSx,
    logoSx,
    titleSx,
    stepLabelSx,
    dividerSx,
    primaryBtnSx,
    secondaryBtnSx,
    footerLinkSx
} from "../PartnerOnboarding/PartnerOnboardingStyles";

import AppStore from '../../assets/download-app-store.png';
import PlayStore from '../../assets/download-play-store.png';
import Seo from '../Seo';




const steps = ['Check Your Current Status', 'Update Your Profile', 'Get Your Membership Pass'];
const PurchaseMemberShip = () => {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = React.useState(0);
    const [skipped, setSkipped] = React.useState(new Set());
    const [slideDirection, setSlideDirection] = React.useState('left');



    const [wizardState, setWizardState] = React.useState({ member: null, authenticate: false, passData: null, otpState: null, isMounted: false });

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const memberComponent = React.useRef();
    const isStepOptional = (step) => step === 1;
    const isStepSkipped = (step) => skipped.has(step);


    const handleNext = () => {
        setSlideDirection('left');

        setActiveStep((prev) => prev + 1);

        if (isStepSkipped(activeStep)) {
            const newSkipped = new Set(skipped.values());
            newSkipped.delete(activeStep);
            setSkipped(newSkipped);
        }
    };


    const handleBack = () => {

        setSlideDirection('right');
        setActiveStep((prev) => prev - 1);
    };

    const handleSkip = () => {
        if (!isStepOptional(activeStep)) {
            throw new Error("You can't skip a step that isn't optional.");
        }
        setSlideDirection('left');
        setActiveStep((prev) => prev + 1);
        setSkipped((prevSkipped) => {
            const newSkipped = new Set(prevSkipped.values());
            newSkipped.add(activeStep);
            return newSkipped;
        });
    };

    const handleReset = () => setActiveStep(0);


    const boxStyle = {
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 1.5 : 0,
        maxWidth: isMobile ? '500px' : '100vw',
        mt: 3,
    };



    async function downloadPass(url) {
        const res = await fetch(url, { credentials: 'include' }); // include cookies if needed

        if (!res.ok) throw new Error('Failed to fetch pass');
        const blob = await res.blob();
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        const filename = url.split('/').pop();
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
    }




    return (
        <SnackbarProvider useGECStyle>
        <Box sx={pageWrapperSx}>
            <Seo
                title="Membership - German Emirates Club"
                description="Join the German Emirates Club and become a member today."
                url="https://services.german-emirates-club.com/membership"
            />
            <Container
                maxWidth="md"
                sx={{

                    ...containerSx,
                    // slightly wider than partner onboarding to fit the stepper
                    "@media (min-width: 900px)": { maxWidth: "860px" },
                }}
            >
                <Paper elevation={0} sx={memberpaperSx}>
                    {/* ── Top accent bar ──────────────────────────────── */}
                    <Box sx={topAccentBarSx} />

                    <Box sx={{ px: { xs: 3, sm: 5 }, pt: 4, pb: 5 }}>

                        {/* ── Logo ────────────────────────────────────── */}
                        <Box
                            component="img"
                            src={GECLogo}
                            alt="GEC Logo"
                            sx={{ ...logoSx, height: 100 }}
                        />

                        {/* ── Title ───────────────────────────────────── */}
                        <Typography variant="h5" sx={{ ...titleSx, mb: 0.5 }}>
                            Membership{" "}
                            <Box component="span" sx={{ color: GEC.goldDark }}>
                                Pass Verification
                            </Box>
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ color: GEC.textSecondary, mb: 4, lineHeight: 1.7 }}
                        >
                            Complete the steps below to verify your account and receive your
                            Membership Pass.
                        </Typography>

                        {/* ── Stepper ─────────────────────────────────── */}
<Stepper
    activeStep={activeStep}
    alternativeLabel
    connector={<GoldConnector />}  
    sx={{ mb: 4 }}
>
                            {steps.map((label, index) => {
                                const stepProps = {};
                                const labelProps = {};
                                if (isStepOptional(index)) {
                                    labelProps.optional = (
                                        <Typography
                                            variant="caption"
                                            sx={{ color: GEC.textSecondary, fontSize: "0.7rem" }}
                                        >
                                            Optional
                                        </Typography>
                                    );
                                }
                                if (isStepSkipped(index)) stepProps.completed = false;

                                return (
                                    <Step key={label} {...stepProps}>
                                        <StepLabel
                                            StepIconComponent={GoldStepIcon}
                                            sx={stepLabelSx}
                                            {...labelProps}
                                        >
                                            {label}
                                        </StepLabel>
                                    </Step>
                                );
                            })}
                        </Stepper>

                        {/* ── Divider ─────────────────────────────────── */}
                        <Box sx={dividerSx} />


                        {/* ── Step content ────────────────────────────────────────────── */}
                        <Box
                            sx={{
                                overflowY: "auto",
                                maxHeight: isMobile ? "55vh" : "62vh",
                                // smooth scrollbar styling
                                "&::-webkit-scrollbar": { width: 4 },
                                "&::-webkit-scrollbar-track": { background: "transparent" },
                                "&::-webkit-scrollbar-thumb": {
                                    background: GEC.goldBorder,
                                    borderRadius: 2,
                                },
                                "&::-webkit-scrollbar-thumb:hover": { background: GEC.gold },
                            }}
                        >
                            <Slide
                                key={activeStep}
                                direction={slideDirection}
                                in
                                mountOnEnter
                                unmountOnExit
                                timeout={400}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "flex-start",
                                        width: "100%",
                                        px: isMobile ? 0.5 : 1,
                                        py: 2,
                                    }}
                                >
                                    {activeStep === steps.length ? (
                                        <Box sx={{ textAlign: "center" }}>
                                            <Typography sx={{ mb: 2, color: GEC.textSecondary }}>
                                                All steps completed — you're finished!
                                            </Typography>
                                            <Button onClick={handleReset} sx={secondaryBtnSx} variant="outlined">
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
                                                                setActiveStep={setActiveStep}
                                                                wizardState={wizardState}
                                                                setWizardState={setWizardState}
                                                            />
                                                        );
                                                    case 2:
                                                        return (
                                                            <Box
                                                                sx={{
                                                                    width: "100%",
                                                                    display: "flex",
                                                                    flexDirection: "column",
                                                                    alignItems: "center",
                                                                    gap: 2,
                                                                    py: 2,
                                                                }}
                                                            >
                                                                <Box
                                                                    sx={{
                                                                        width: 72,
                                                                        height: 72,
                                                                        borderRadius: "50%",
                                                                        background: GEC.goldMuted,
                                                                        border: `2px solid ${GEC.gold}`,
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                        mb: 1,
                                                                    }}
                                                                >
                                                                    <CheckCircleOutlineIcon
                                                                        sx={{ fontSize: 38, color: GEC.goldDark }}
                                                                    />
                                                                </Box>

                                                                <Typography
                                                                    sx={{
                                                                        fontFamily: "'Georgia', serif",
                                                                        fontWeight: 700,
                                                                        fontSize: isMobile ? 18 : 22,
                                                                        color: GEC.textPrimary,
                                                                        textAlign: "center",
                                                                        lineHeight: 1.4,
                                                                    }}
                                                                >
                                                                    Your account has been verified!
                                                                </Typography>

                                                                <Typography
                                                                    sx={{
                                                                        fontSize: isMobile ? 14 : 16,
                                                                        color: GEC.textSecondary,
                                                                        textAlign: "center",
                                                                        lineHeight: 1.7,
                                                                        maxWidth: 480,
                                                                    }}
                                                                >
                                                                    Please check your email for a personalised Membership
                                                                    Pass.{" "}
                                                                    <Box
                                                                        component="span"
                                                                        sx={{ color: GEC.textPrimary, fontWeight: 700 }}
                                                                    >
                                                                        Don't forget to download the GEC Mobile App
                                                                    </Box>{" "}
                                                                    to avail your benefits.
                                                                </Typography>

                                                                <Box
                                                                    sx={{
                                                                        display: "flex",
                                                                        flexDirection: "column",
                                                                        alignItems: "center",
                                                                        gap: 1.5,
                                                                        mt: 1,
                                                                    }}
                                                                >
                                                                    <Box
                                                                        component="a"
                                                                        href="https://play.google.com/store/apps/details?id=com.buenapublica.GECRewards"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        sx={{
                                                                            display: "block",
                                                                            transition: "opacity 0.2s ease, transform 0.2s ease",
                                                                            "&:hover": { opacity: 0.85, transform: "translateY(-2px)" },
                                                                        }}
                                                                    >
                                                                        <img src={PlayStore} alt="Get it on Google Play" width="220" />
                                                                    </Box>
                                                                    <Box
                                                                        component="a"
                                                                        href="https://apps.apple.com/ae/app/gec-rewards/id6444924851"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        sx={{
                                                                            display: "block",
                                                                            transition: "opacity 0.2s ease, transform 0.2s ease",
                                                                            "&:hover": { opacity: 0.85, transform: "translateY(-2px)" },
                                                                        }}
                                                                    >
                                                                        <img src={AppStore} alt="Download on the App Store" width="220" />
                                                                    </Box>
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

                        {/* ── Divider ─────────────────────────────────── */}
                        <Box sx={dividerSx} />

                        {/* ── Navigation buttons ──────────────────────── */}
                        {activeStep < steps.length && (
                            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                                {activeStep > 0 && (
                                    <Button
                                        variant="outlined"
                                        startIcon={<ArrowBackIcon />}
                                        onClick={handleBack}
                                        sx={secondaryBtnSx}
                                    >
                                        Back
                                    </Button>
                                )}

                                {(() => {
                                    switch (activeStep) {
                                        case 0:
                                            return (
                                                <Button
                                                    variant="contained"
                                                    endIcon={<ArrowForwardIcon />}
                                                    onClick={handleNext}
                                                    disabled={!wizardState.authenticate}
                                                    sx={{ flex: 1, ...primaryBtnSx }}
                                                >
                                                    Next
                                                </Button>
                                            );
                                        case 1:
                                            return (
                                                <Button
                                                    variant="contained"
                                                    endIcon={<CheckCircleOutlineIcon />}
                                                    onClick={handleNext}
                                                    disabled={!wizardState?.otpState?.getMemberPass}
                                                    sx={{ flex: 1, ...primaryBtnSx }}
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

                        {/* ── Footer ──────────────────────────────────── */}
                        <Typography
                            variant="caption"
                            sx={{
                                display: "block",
                                textAlign: "center",
                                mt: 3,
                                color: "#a89b7a",
                            }}
                        >
                            Need help?{" "}
                            <Box
                                component="span"
                                sx={footerLinkSx}
                                onClick={() => navigate('/support')}
                            >
                                Raise a Ticket
                            </Box>
                        </Typography>
                    </Box>

                    {/* ── Bottom accent bar ───────────────────────────── */}
                    <Box sx={bottomAccentBarSx} />
                </Paper>
            </Container>
        </Box>
        </SnackbarProvider>
    );


}

export default PurchaseMemberShip;

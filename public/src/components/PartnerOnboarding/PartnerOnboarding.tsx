import React, { useEffect, useState, useRef } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    Container,
    InputAdornment,
    Paper,
    Snackbar,
    Step,
    StepConnector,
    StepLabel,
    Stepper,
    TextField,
    Typography,
    stepConnectorClasses,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";

// ── GEC Brand Tokens ──────────────────────────────────────────────────────
const GEC = {
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
const GoldConnector = styled(StepConnector)(() => ({
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

// ── Custom Step Icon ──────────────────────────────────────────────────────
const GoldStepIconRoot = styled("div")(({ ownerState }) => ({
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

const stepIcons = [LoginOutlinedIcon, UploadFileOutlinedIcon, TaskAltOutlinedIcon];

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

// ── Steps Config ──────────────────────────────────────────────────────────
const STEPS = ["Login", "Upload Document", "Review Submission"];

// ── Shared Field Styles ───────────────────────────────────────────────────
const fieldSx = {
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

const FieldLabel = ({ children }) => (
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

// ── Main Component ────────────────────────────────────────────────────────
export default function PartnerOnboarding() {
    const [activeStep, setActiveStep] = useState(0);
    const [toastOpen, setToastOpen] = useState(false);



    const [showOtpInput, setShowOtpInput] = useState(false);
const [currentResponseStatus, setCurrentResponseStatus] = useState(null);
const otpRef = useRef();
const statusRef = useRef();





  const handleSendOtp = async (values) => {
        try {
            setShowOtpInput(true);


            const otp_response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/send-otp`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include", // ✅ important for sessions
                    body: JSON.stringify({ email: wizardState?.member.email, event: "Membership Authentication", message: "To verify your email and complete your account authentication for" }),

                }
            );

            if (otp_response.status === 429) {

                const response_data = await otp_response.json();
                showSnackbar(response_data.error, "");
                return;

            }


            if (otp_response.ok) {
                otpRef?.current?.clear();
                statusRef.current.classList.remove("text-danger");

                setCurrentResponseStatus(otp_response.ok);
                setValidOtp(true);

                statusRef.current.innerText = "OTP sent to " + wizardState?.member.email;

                const response_data = await otp_response.json();

                setCurrentResponseMessage(response_data.message);

                otpFocus?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }


        } catch (e) {
            statusRef.current.innerText = e.message;
        }
    };



 const handlePostOTP = async (value) => {
        try {


            const data = {
                otp: value,
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                registration_code: "Membership Authentication",
                mobile_number: "",
            };

            const otpResponse = await fetch(
                `${import.meta.env.VITE_SERVERURL}/otp-check`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(data),
                }
            );


            if (otpResponse.status === 400 || otpResponse.status === 500) {
                throw new Error(`Server responded with ${otpResponse.status}`);
            }

            const otp_response_data = await otpResponse.json();

            if (otp_response_data.status) {


                setShowOtpInput(false);
                setWizardState((prev) => ({ ...prev, authenticate: true }));
                await getToken();
                otpRef?.current?.blurAll();

                showSnackbar(otp_response_data.message, "success");

                setActiveStep((prev) => prev + 1);
            } else {
                statusRef.current.textContent = otp_response_data.message;
                statusRef.current.classList.add("text-danger");

            }
        } catch (err) {

            if (statusRef.current) {

                statusRef.current.textContent = `Verification failed: ${err.message}`;
                statusRef.current.classList.add("text-danger");
            }
        }
    };



    // Step 0 — Login
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState(false);

    // Step 1 — Upload
    const [file, setFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    // Read ?email= from URL on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const emailParam = params.get("email");
        if (emailParam) setEmail(emailParam);
    }, []);

    // ── Navigation ────────────────────────────────────────────────────────
    const handleNext = () => {
        if (activeStep === 0) {
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
            if (!isValid) { setEmailError(true); return; }
            setEmailError(false);
        }
        if (activeStep === STEPS.length - 1) {
            setToastOpen(true);
            return;
        }
        setActiveStep((s) => s + 1);
    };

    const handleBack = () => setActiveStep((s) => s - 1);

    // ── Step 0: Login ─────────────────────────────────────────────────────
    const StepLogin = (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box>
                <FieldLabel>Partner Email Address</FieldLabel>
                <TextField
                    fullWidth
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(false);
                    }}
                    error={emailError}
                    helperText={emailError ? "Please enter a valid email address." : ""}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <EmailOutlinedIcon
                                    sx={{ color: emailError ? "#ef4444" : GEC.goldDark, fontSize: 20 }}
                                />
                            </InputAdornment>
                        ),
                    }}
                    sx={fieldSx}
                />
            </Box>
            <Box>
                <Button
                    variant="contained"
                    endIcon={
                        activeStep < STEPS.length - 1 ? (
                            <ArrowForwardIcon />
                        ) : (
                            <CheckCircleOutlineIcon />
                        )
                    }
                    onClick={handleNext}
                    sx={{
                        flex: activeStep > 0 ? 2 : 1,
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
                        transition: "all 0.2s ease",
                    }}
                >
                    Verify your account details
                </Button>
            </Box>
        </Box>
    );

    // ── Step 1: Upload ────────────────────────────────────────────────────
    const StepUpload = (
        <Box>
            <Box
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const dropped = e.dataTransfer.files[0];
                    if (dropped) setFile(dropped);
                }}
                onClick={() => document.getElementById("gec-file-input").click()}
                sx={{
                    border: `2px dashed ${dragOver ? GEC.gold : GEC.goldBorder}`,
                    borderRadius: 3,
                    background: dragOver ? GEC.goldMuted : "#faf8f3",
                    p: 5,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1.5,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    "&:hover": { borderColor: GEC.gold, background: GEC.goldMuted },
                }}
            >
                <CloudUploadOutlinedIcon
                    sx={{
                        fontSize: 48,
                        color: dragOver ? GEC.gold : GEC.goldDark,
                        transition: "color 0.2s",
                    }}
                />
                <Typography sx={{ fontWeight: 600, color: GEC.textPrimary, fontSize: 15 }}>
                    {file ? file.name : "Drag & drop your document here"}
                </Typography>
                <Typography variant="caption" sx={{ color: GEC.textSecondary }}>
                    {file
                        ? `${(file.size / 1024).toFixed(1)} KB`
                        : "or click to browse — PDF, DOC, DOCX up to 10 MB"}
                </Typography>
                <input
                    id="gec-file-input"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    hidden
                    onChange={(e) => setFile(e.target.files[0] || null)}
                />
            </Box>
            {file && (
                <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
                    <CheckCircleOutlineIcon sx={{ color: GEC.gold, fontSize: 18 }} />
                    <Typography variant="body2" sx={{ color: GEC.textSecondary }}>
                        File ready:{" "}
                        <strong style={{ color: GEC.textPrimary }}>{file.name}</strong>
                    </Typography>
                </Box>
            )}
        </Box>
    );

    // ── Step 2: Review ────────────────────────────────────────────────────
    const StepReview = (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[
                { label: "Account Email", value: email || "—" },
                {
                    label: "Document",
                    value: file ? file.name : null,
                    empty: "No document uploaded",
                },
            ].map(({ label, value, empty }) => (
                <Box
                    key={label}
                    sx={{
                        background: "#faf8f3",
                        border: `1px solid ${GEC.goldBorder}`,
                        borderRadius: 2.5,
                        p: 2.5,
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{
                            color: GEC.textSecondary,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            fontWeight: 600,
                        }}
                    >
                        {label}
                    </Typography>
                    <Typography
                        sx={{
                            mt: 0.5,
                            color: value ? GEC.textPrimary : GEC.textSecondary,
                            fontWeight: value ? 500 : 400,
                            fontStyle: value ? "normal" : "italic",
                        }}
                    >
                        {value ?? empty}
                    </Typography>
                </Box>
            ))}

            <Box
                sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.5,
                    p: 2,
                    background: GEC.goldMuted,
                    border: `1px solid ${GEC.goldBorder}`,
                    borderRadius: 2,
                }}
            >
                <CheckCircleOutlineIcon
                    sx={{ color: GEC.gold, fontSize: 18, mt: "2px", flexShrink: 0 }}
                />
                <Typography variant="body2" sx={{ color: GEC.textSecondary, lineHeight: 1.65 }}>
                    By submitting, you confirm that the information above is accurate and you agree
                    to the GEC Partner terms and conditions.
                </Typography>
            </Box>
        </Box>
    );

    const panels = [StepLogin, StepUpload, StepReview];

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <Box
            sx={{
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
            }}
        >
            <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: "20px",
                        overflow: "hidden",
                        border: `1px solid ${GEC.goldBorder}`,
                        boxShadow:
                            "0 8px 40px rgba(185,150,43,0.12), 0 2px 8px rgba(0,0,0,0.06)",
                    }}
                >
                    {/* Top accent bar */}
                    <Box
                        sx={{
                            height: 5,
                            background: `linear-gradient(90deg, ${GEC.goldDark}, ${GEC.gold}, ${GEC.goldLight}, ${GEC.gold}, ${GEC.goldDark})`,
                        }}
                    />


                    <Box sx={{ px: { xs: 3, sm: 5 }, pt: 4, pb: 5 }}>
                        <Box
                            component="img"
                            alt="GEC Logo"
                            src={`${import.meta.env.VITE_SERVERURL}/uploads/gec-logo.png`}
                            sx={{
                                pb: 4,
                                height: 100,
                                cursor: "pointer",
                                filter: "drop-shadow(0 2px 8px rgba(185,150,43,0.20))",
                                transition: "transform 0.3s ease, filter 0.3s ease",
                                "&:hover": {
                                    transform: "scale(1.04)",
                                    filter: "drop-shadow(0 4px 16px rgba(185,150,43,0.35))",
                                },
                            }}
                            onClick={() => console.log("🤖")}
                        />

                        {/* Badge */}


                        {/* Title */}
                        <Typography
                            variant="h5"
                            sx={{
                                fontFamily: "'Georgia', serif",
                                fontWeight: 700,
                                color: GEC.textPrimary,
                                lineHeight: 1.25,
                                mb: 0.75,
                            }}
                        >
                            Welcome to{" "}
                            <Box component="span" sx={{ color: GEC.goldDark }}>
                                Partner Onboarding
                            </Box>{" "}
                            Wizard
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ color: GEC.textSecondary, mb: 4, lineHeight: 1.7 }}
                        >
                            Complete the steps below to activate your partner account and get started.
                        </Typography>

                        {/* Stepper */}
                        <Stepper
                            activeStep={activeStep}
                            alternativeLabel
                            connector={<GoldConnector />}
                            sx={{ mb: 4 }}
                        >
                            {STEPS.map((label) => (
                                <Step key={label}>
                                    <StepLabel
                                        StepIconComponent={GoldStepIcon}
                                        sx={{
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
                                        }}
                                    >
                                        {label}
                                    </StepLabel>
                                </Step>
                            ))}
                        </Stepper>

                        {/* Divider */}
                        <Box
                            sx={{
                                height: 1,
                                background: `linear-gradient(90deg, transparent, ${GEC.goldBorder}, transparent)`,
                                mb: 4,
                            }}
                        />

                        {/* Step Panel */}
                        <Box sx={{ minHeight: 220 }}>{panels[activeStep]}</Box>

                        {/* Navigation Buttons */}
                        <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
                            {activeStep > 0 && (
                                <Button
                                    variant="outlined"
                                    startIcon={<ArrowBackIcon />}
                                    onClick={handleBack}
                                    sx={{
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
                                    }}
                                >
                                    Back
                                </Button>
                            )}
                            <Button
                                variant="contained"
                                endIcon={
                                    activeStep < STEPS.length - 1 ? (
                                        <ArrowForwardIcon />
                                    ) : (
                                        <CheckCircleOutlineIcon />
                                    )
                                }
                                onClick={handleNext}
                                sx={{
                                    flex: activeStep > 0 ? 2 : 1,
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
                                    transition: "all 0.2s ease",
                                }}
                            >
                                {activeStep < STEPS.length - 1 ? "Continue" : "Submit Onboarding"}
                            </Button>
                        </Box>

                        {/* Footer */}
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
                                sx={{
                                    color: GEC.goldDark,
                                    textDecoration: "underline",
                                    cursor: "pointer",
                                }}
                            >
                                Contact partner support
                            </Box>
                        </Typography>
                    </Box>

                    {/* Bottom accent bar */}
                    <Box
                        sx={{
                            height: 3,
                            background: `linear-gradient(90deg, transparent, ${GEC.goldBorder}, transparent)`,
                        }}
                    />
                </Paper>
            </Container>

            {/* Success Toast */}
            <Snackbar
                open={toastOpen}
                autoHideDuration={4000}
                onClose={() => setToastOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setToastOpen(false)}
                    severity="success"
                    sx={{
                        background: "#fffbec",
                        border: `1px solid ${GEC.goldBorder}`,
                        color: GEC.goldDark,
                        fontWeight: 500,
                        "& .MuiAlert-icon": { color: GEC.gold },
                    }}
                >
                    Onboarding submitted — we'll be in touch soon!
                </Alert>
            </Snackbar>
        </Box>
    );
}

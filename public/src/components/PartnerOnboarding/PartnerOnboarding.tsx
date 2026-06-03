import React, { useEffect, useRef, useState, useCallback } from "react";
import { parsePhoneNumberFromString } from "libphonenumber-js";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import OtpTimer from "../utils/OtpTimer";
import OtpInput from "../utils/OtpInput";
import { validateAndConvertXlsx } from './validateAndConvertXlsx.tsx';
import { IoMdCloseCircleOutline } from "react-icons/io";
import ResultPanel from "./ResultPanel";
import {
    GEC, wizardCompletedBannerSx,
    GoldConnector,
    GoldStepIconRoot,
    FieldLabel,
    fieldSx,
    pageWrapperSx,
    containerSx,
    paperSx,
    topAccentBarSx,
    bottomAccentBarSx,
    logoSx,
    titleSx,
    stepLabelSx,
    dividerSx,
    primaryBtnSx,
    secondaryBtnSx,
    infoCardSx,
    reviewCardSx,
    dropZoneSx,
    termsBannerSx,
    footerLinkSx,
} from "./PartnerOnboardingStyles.tsx";
import { ErrorMessage } from "formik";
import { useSnackbar } from "../Providers/Snackbar";

// ── Steps Config ──────────────────────────────────────────────────────────
const STEPS = ["Login", "Upload Document", "Delivery Info", "Review Submission"];
const SUCCESS_TOAST_MESSAGES = ["Document uploaded successfully.", "Onboarding submitted — we'll be in touch soon!"]
// ── Step Icon ─────────────────────────────────────────────────────────────
const stepIcons = [LoginOutlinedIcon, UploadFileOutlinedIcon, LocalShippingOutlinedIcon, TaskAltOutlinedIcon];

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

// ── Initial Wizard State ──────────────────────────────────────────────────
const INITIAL_WIZARD_STATE = {
    // Step 0 — Login / Auth
    email: "",
    emailError: false,
    authenticate: false,        // true once OTP verified + token received
    partner: null,              // populated from server after auth if needed
    isMounted: false,
    // OTP flow
    otpVisible: false,          // whether OTP input panel is showing
    otpResponseStatus: null,    // truthy = OTP was sent successfully
    otpResponseMessage: "",     // human-readable message from server
    otpValid: true,             // controls OtpTimer visibility
    initialSeconds: null,
    otpKey: 0,                  // incremented on each successful send to force timer remount

    // Step 1 — Upload
    uploadedFile: null,         // the File object
    // Step 2 — Delivery Info
    deliveryAddress: "",
    contactPerson: "",
    phoneNumber: "",
    phoneNumberError: "",
    valid: false,
    csvBlob: null,
    csvFile: null,
    rowCount: 0,
    faultyRecords: null,
    startProcessingXLSX: false,
    // Step 2 — Review
    uploading: false,
    wizardCompleted: false

};

// ── Main Component ────────────────────────────────────────────────────────
export default function PartnerOnboarding() {
    const [activeStep, setActiveStep] = useState(0);
    const [wizardState, setWizardState] = useState(INITIAL_WIZARD_STATE);

    const setWiz = (patch) => setWizardState((prev) => ({ ...prev, ...patch }));
    const { showSnackbar } = useSnackbar();

    const otpRef = useRef();
    const statusRef = useRef();
    const otpFocus = useRef();
    const deliveryInfoFetched = useRef(false);

    // Read ?email= from URL on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const emailParam = params.get("email");
        if (emailParam) setWiz({ email: emailParam });
    }, []);

    // ── Auto-login ────────────────────────────────────────────────────────
    const autoLogin = useCallback(async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/partner-auto-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });
            const data = await response.json();
            if (data) {
                setWiz({ otpVisible: false, authenticate: true, partner: data.data, email: data.data.email });
                setActiveStep((s) => s + 1);
            }
        } catch (err) {
            console.error("Error fetching data:", err);
        }
    }, []);

    useEffect(() => {
        if (!INITIAL_WIZARD_STATE.isMounted) {
            autoLogin();
            setWiz({ isMounted: true });
        }
    }, [wizardState.isMounted]);

    // ── OTP: Send ─────────────────────────────────────────────────────────
    const handleSendOtp = async () => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wizardState.email.trim());
        if (!isValid) {
            setWiz({ emailError: true });
            return;
        }
        setWiz({ otpVisible: true });
        try {
            const res = await fetch(`${import.meta.env.VITE_SERVERURL}/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    email: wizardState.email,
                    event: "Partner Onboarding Authentication",
                    message: "To verify your email and complete your account authentication for",
                }),
            });

            

            if (res.status === 429) {
                const data = await res.json();
                showSnackbar(data.error || "Too many attempts. Please try again later.", "error");
                return;
            }

            if (res.status === 404) {
                const data = await res.json();
                
                showSnackbar(data.message || "Email not found.", "error");
                return;
            }

             if (res.status === 403) {
                const data = await res.json();
                showSnackbar(data.message, "error");
                return;
            }


            if (res.ok) {
                otpRef?.current?.clear();
                if (statusRef.current) {
                    statusRef.current.classList.remove("text-danger");
                    statusRef.current.innerText = "OTP sent to " + wizardState.email;
                }
                setWiz({ otpResponseStatus: true, otpValid: true, initialSeconds: 300, otpKey: wizardState.otpKey + 1 });
                otpFocus?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                const data = await res.json().catch(() => ({}));
                setWiz({ otpResponseMessage: data.message ?? "" });
            } else {
                const data = await res.json().catch(() => ({}));
                showSnackbar(data.message || `Unexpected error (${res.status}). Please try again.`, "error");
            }
        } catch (e) {
            showSnackbar(e.message || "Network error. Please check your connection.", "error");
        }
    };

    // ── OTP: Verify ───────────────────────────────────────────────────────
    const handlePostOTP = async (value) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_SERVERURL}/partner-otp-check`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    otp: value,
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                    registration_code: "Partner Onboarding Authentication",
                    email: wizardState.email,
                }),
            });
            if (res.status === 400 || res.status === 500) {
                throw new Error(`Server responded with ${res.status}`);
            }
            const data = await res.json();
            if (data.status) {
                setWiz({ otpVisible: false, authenticate: true, partner: data.data });
                otpRef?.current?.blurAll();
                setActiveStep((s) => s + 1);
            } else {
                if (statusRef.current) {
                    
                    statusRef.current.textContent = data.message;
                    statusRef.current.classList.add("text-danger");
                }
            }
        } catch (err) {
            showSnackbar(err.message || "Verification failed. Please try again.", "error");
        }
    };

    // ── OTP Timer expiry ──────────────────────────────────────────────────
    const handleExpiredChange = () => setWiz({ otpValid: false });

    // ── Pre-fill delivery info on entering Step 3 ─────────────────────────
    useEffect(() => {
        if (activeStep !== 2 || deliveryInfoFetched.current || !wizardState.partner?.title) return;
        deliveryInfoFetched.current = true;

        const fetchDeliveryInfo = async () => {
            try {
                const res = await fetch(
                    `${import.meta.env.VITE_SERVERURL}/partner-delivery-info?partner=${encodeURIComponent(wizardState.partner!.title)}`,
                    { credentials: "include" }
                );
                const data = await res.json();
                if (data.status && data.data) {
                    setWiz({
                        deliveryAddress: data.data.delivery_address || "",
                        contactPerson:   data.data.contact_person  || "",
                        phoneNumber:     data.data.phone_number     || "",
                    });
                }
            } catch (e) {
                console.error("Failed to fetch delivery info:", e);
            }
        };

        fetchDeliveryInfo();
    }, [activeStep]);

    // ── Phone validation ──────────────────────────────────────────────────
    const validateAndSetPhone = (raw: string) => {
        // 1. Trim whitespace  2. Strip non-digit/non-plus chars  3. Ensure leading +
        let cleaned = raw.trim().replace(/[^\d+]/g, '');
        if (cleaned && !cleaned.startsWith('+')) cleaned = '+' + cleaned;
        // Validate whenever the field is non-empty — including when all chars get stripped (e.g. "Arne Ziegler")
        let error = "";
        if (raw.trim()) {
            const parsed = cleaned ? parsePhoneNumberFromString(cleaned) : null;
            if (!parsed || !parsed.isValid()) {
                error = "Please enter a valid UAE or international phone number (e.g. +971 55 1234238 or +49 151 12345678)";
            }
        }
        setWiz({ phoneNumber: raw, phoneNumberError: error });
    };

    // ── Token check ───────────────────────────────────────────────────────
    const getToken = async () => {
        const cookieName = "partner-usr=";
        return document.cookie.split("; ").some((c) => c.startsWith(cookieName));
    };

    // ── File handling ─────────────────────────────────────────────────────
    
    const handleFileDrop = async (dropped: File) => {
        try {
            setWiz({ startProcessingXLSX: true });
            const isXlsx =
                dropped.type ===
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                dropped.name.toLowerCase().endsWith(".xlsx");

            if (!isXlsx) {
                showSnackbar("Only .xlsx files are allowed.", "error");
                return;
            }

            if (dropped) setWiz({ uploadedFile: dropped });
            
            const result = await validateAndConvertXlsx(dropped);

            if (!result.valid) {
                setWiz({ uploadedFile: null });
                showSnackbar(result.error || "Failed to parse file. Please upload a valid .xlsx file.", "error");
                return;
            }

            // Store the ready-to-post CSV file alongside the original
            setWiz({
                csvBlob: result?.csvBlob,
                csvFile: result?.csvFile,
                rowCount: result?.rowCount,
                valid: result?.valid,
                faultyRecords: result.faultyRecords,
                startProcessingXLSX: false,
            });
            showSnackbar(SUCCESS_TOAST_MESSAGES[0], "success");
            
        } catch (e) {
            showSnackbar(e.message || "An unexpected error occurred while processing the file.", "error");
        } finally {
            setWiz({ startProcessingXLSX: false });
        }

    }






    // ── Navigation ────────────────────────────────────────────────────────

    const handleSubmitCSV = async () => {
        try {
            const formData = new FormData();

            formData.append("file", wizardState.csvFile!);

            //@ts-ignore
            formData.append("partner", wizardState.partner?.title);
            formData.append("delivery_address", wizardState.deliveryAddress);
            formData.append("contact_person", wizardState.contactPerson);
            formData.append("phone_number", wizardState.phoneNumber);

            const res = await fetch(
                `${import.meta.env.VITE_SERVERURL}/upload-csv`,
                {
                    method: "POST",
                    credentials: "include",
                    body: formData,
                }
            );
            if (res.ok) {
                setWiz({ wizardCompleted: true });
                showSnackbar(SUCCESS_TOAST_MESSAGES[1], "success");
                return;
            }

            const data = await res.json().catch(() => ({}));
            showSnackbar(data.message || `Submission failed (${res.status}). Please try again.`, "error");

        } catch (err) {
            showSnackbar(err.message || "Network error. Please check your connection.", "error");
        }
        finally {
            setWiz({ uploading: false });
        }
    }


    const handleNext = async () => {

        if (activeStep === STEPS.length - 1) {

            setWiz({ uploading: true });
            await handleSubmitCSV();
            return;
        }
        if (activeStep === STEPS.length) {

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
                    disabled={wizardState.authenticate}
                    value={wizardState.email}
                    onChange={(e) => setWiz({ email: e.target.value, emailError: false })}
                    error={wizardState.emailError}
                    helperText={wizardState.emailError ? "Please enter a valid email address." : ""}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <EmailOutlinedIcon
                                    sx={{
                                        color: wizardState.emailError ? "#ef4444" : GEC.goldDark,
                                        fontSize: 20,
                                    }}
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
                    endIcon={<ArrowForwardIcon />}
                    onClick={handleSendOtp}
                    disabled={wizardState.authenticate}
                    sx={{ width: "100%", ...primaryBtnSx }}
                >
                    {wizardState.authenticate
                        ? "Verified ✓"
                        : "Verify your email to confirm your account details"}
                </Button>

                <div className={`otp-slide ${wizardState.otpVisible ? "show" : ""} mt-2`}>
                    <div ref={statusRef} />
                    {wizardState.otpResponseStatus && (
                        <>
                            <OtpInput useGECStyle={true} ref={otpRef} onComplete={(val) => handlePostOTP(val)} />
                            {wizardState.otpValid && (
                                <OtpTimer
                                    key={wizardState.otpKey}
                                    initialSeconds={wizardState.initialSeconds ?? 300}
                                    loginResponseData={wizardState.otpResponseStatus}
                                    onResend={handleSendOtp}
                                    onExpiredChange={handleExpiredChange}
                                />
                            )}
                        </>
                    )}
                </div>
                <span ref={otpFocus} />
            </Box>
        </Box>
    );

    // ── Step 1: Upload ────────────────────────────────────────────────────
    const StepUpload = (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[
                    { label: "Account Email", value: wizardState.email || null, empty: "—" },
                    { label: "Company Name", value: wizardState?.partner?.title || null, empty: "-" },
                ].map(({ label, value, empty }) => (
                    <Box key={label} sx={infoCardSx}>
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
                                color: value ? GEC.goldDark : GEC.textSecondary,
                                fontWeight: value ? 500 : 400,
                                fontStyle: value ? "normal" : "italic",
                            }}
                        >
                            {value ?? empty}
                        </Typography>
                    </Box>
                ))}
            </Box>





            {!wizardState.uploadedFile &&
                (
                    <Box
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); handleFileDrop(e.dataTransfer.files[0]); }}
                        onClick={() => document.getElementById("gec-file-input").click()}
                        sx={dropZoneSx}
                        >
                                    <>
                        <CloudUploadOutlinedIcon sx={{ fontSize: 48, color: GEC.goldDark, transition: "color 0.2s" }} />
                        <Typography sx={{ fontWeight: 600, color: GEC.textPrimary, fontSize: 15 }}>
                            {wizardState.uploadedFile ? wizardState.uploadedFile.name : "Drag & drop your document here"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: GEC.textSecondary }}>
                            {wizardState.uploadedFile
                                ? `${(wizardState.uploadedFile.size / 1024).toFixed(1)} KB`
                                : "or click to browse — Excel up to 10 MB"}
                        </Typography>
                        <input
                            id="gec-file-input"
                            type="file"
                            accept=".xlsx"
                            hidden
                            onChange={(e) => handleFileDrop(e.target.files[0] || null)}
                        />
                                    </>
                    </Box>
                    )
                }
            {wizardState.startProcessingXLSX && wizardState.uploadedFile &&
                (
                    <Box sx={{ ...dropZoneSx, pointerEvents: "none" }}>
                        <CircularProgress size={24} sx={{ color: GEC.gold }} />
                        <Typography sx={{ fontWeight: 600, color: GEC.textSecondary, fontSize: 15 }}>
                            Processing file…
                        </Typography>
                    </Box>
                )
            }

            {wizardState.uploadedFile && wizardState.valid && (
                <ResultPanel wizardState={wizardState} />

            )}

            {wizardState.uploadedFile && (
                <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
                    <CheckCircleOutlineIcon sx={{ color: GEC.gold, fontSize: 18 }} />
                    <Typography variant="body2" sx={{ color: GEC.textSecondary }}>
                        File ready:{" "}
                        <strong style={{ color: GEC.textPrimary }}>{wizardState.uploadedFile.name}</strong>
                        <IconButton onClick={() => { setWiz({ uploadedFile: null,  csvBlob: null,
                csvFile: null,
                rowCount: 0,
                valid: false,
                faultyRecords: 0 }) }} >
                            <IoMdCloseCircleOutline />
                        </IconButton>
                    </Typography>
                </Box>
            )}

        </Box>
    );

    // ── Step 2: Delivery Info ─────────────────────────────────────────────
    const StepDelivery = (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box>
                <FieldLabel>Delivery Address *</FieldLabel>
                <TextField
                    fullWidth
                    placeholder="Street, Building, City"
                    value={wizardState.deliveryAddress}
                    onChange={(e) => setWiz({ deliveryAddress: e.target.value })}
                    sx={fieldSx}
                />
            </Box>
            <Box>
                <FieldLabel>Contact Person *</FieldLabel>
                <TextField
                    fullWidth
                    placeholder="Full name"
                    value={wizardState.contactPerson}
                    onChange={(e) => setWiz({ contactPerson: e.target.value })}
                    sx={fieldSx}
                />
            </Box>
            <Box>
                <FieldLabel>Phone Number *</FieldLabel>
                <TextField
                    fullWidth
                    placeholder="+971 55 123 4238 or +49 151 12345678"
                    value={wizardState.phoneNumber}
                    onChange={(e) => validateAndSetPhone(e.target.value)}
                    error={!!wizardState.phoneNumberError}
                    helperText={wizardState.phoneNumberError || ""}
                    sx={fieldSx}
                />
            </Box>
        </Box>
    );

    // ── Step 3: Review ────────────────────────────────────────────────────
    const StepReview = (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[
                { label: "Company Name", value: wizardState?.partner?.title || null, empty: "-" },
                { label: "Total rows", value: (wizardState.rowCount ?? 0) + (wizardState.faultyRecords?.length ?? 0) },
                { label: "Valid rows", value: wizardState.rowCount ?? 0 },
                { label: "Faulty rows", value: wizardState.faultyRecords?.length ?? 0 },
            ]
                .filter((_, index) => !wizardState.wizardCompleted || index === 0)
                .map(({ label, value, empty }) => (
                    <Box key={label} sx={infoCardSx}>
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
                                color: value ? GEC.goldDark : GEC.textSecondary,
                                fontWeight: value ? 500 : 400,
                                fontStyle: value ? "normal" : "italic",
                            }}
                        >
                            {value ?? empty}
                        </Typography>
                    </Box>
                ))}



            {wizardState.wizardCompleted ? (
                <Box sx={wizardCompletedBannerSx}>
                    <CheckCircleOutlineIcon
                        sx={{ color: GEC.goldLight, fontSize: 20, mt: "1px", flexShrink: 0 }}
                    />
                    <Box>
                        <Typography
                            variant="body2"
                            sx={{ color: 'white', fontWeight: 600, lineHeight: 1.5 }}
                        >
                            Onboarding Completed
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ color: 'white', lineHeight: 1.65, mt: 0.25 }}
                        >
                            {wizardState.rowCount}{" "}
                            {wizardState.rowCount === 1 ? "record has" : "records have"} been
                            successfully submitted.
                        </Typography>
                    </Box>
                </Box>
            ) : (
                <Box sx={termsBannerSx}>
                    <CheckCircleOutlineIcon
                        sx={{ color: GEC.gold, fontSize: 18, mt: "2px", flexShrink: 0 }}
                    />
                    <Typography
                        variant="body2"
                        sx={{ color: GEC.textSecondary, lineHeight: 1.65 }}
                    >
                        By submitting, you confirm that the information above is accurate and
                        you agree to the GEC Partner terms and conditions.
                    </Typography>
                </Box>
            )}

        </Box>
    );

    const panels = [StepLogin, StepUpload, StepDelivery, StepReview];

    const isNextButtonDisabled = () => {

        if (activeStep === 0 && !wizardState.authenticate) {
            return true;
        }

        if (activeStep === 1 && wizardState.rowCount === 0) {
            return true;
        }

        if (activeStep === 2 && (
            !wizardState.deliveryAddress.trim() ||
            !wizardState.contactPerson.trim() ||
            !wizardState.phoneNumber.trim() ||
            !!wizardState.phoneNumberError
        )) {
            return true;
        }

        if (activeStep === 3 && wizardState.wizardCompleted) {
            return true;
        }

        return false;
    };


    // ── Render ────────────────────────────────────────────────────────────
    return (
        <Box sx={pageWrapperSx}>
            <Container maxWidth="sm" sx={containerSx}>
                <Paper elevation={0} sx={paperSx}>
                    {/* Top accent bar */}
                    <Box sx={topAccentBarSx} />

                    <Box sx={{ px: { xs: 3, sm: 5 }, pt: 4, pb: 5 }}>
                        <Box
                            component="img"
                            alt="GEC Logo"
                            src={`${import.meta.env.VITE_SERVERURL}/uploads/gec-logo.png`}
                            sx={logoSx}
                            onClick={() => console.log("🤖")}
                        />

                        <Typography variant="h5" sx={titleSx}>
                            Welcome to{" "}
                            <Box component="span" sx={{ color: GEC.goldDark }}>
                                Partner Onboarding
                            </Box>{" "}
                            Wizard
                        </Typography>
                        <Typography variant="body2" sx={{ color: GEC.textSecondary, mb: 4, lineHeight: 1.7 }}>
                            Complete the steps below to activate your employees’ accounts.
                        </Typography>

                        {/* Stepper */}
                        <Stepper activeStep={activeStep} alternativeLabel connector={<GoldConnector />} sx={{ mb: 4 }}>
                            {STEPS.map((label) => (
                                <Step key={label}>
                                    <StepLabel StepIconComponent={GoldStepIcon} sx={stepLabelSx}>
                                        {label}
                                    </StepLabel>
                                </Step>
                            ))}
                        </Stepper>

                        {/* Divider */}
                        <Box sx={dividerSx} />

                        {/* Step Panel */}
                        <Box sx={{ minHeight: 220 }}>{panels[activeStep]}</Box>

                        {/* Navigation Buttons */}
                        <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
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
                            <Button
                                variant="contained"
                                endIcon={activeStep < STEPS.length - 1 ? <ArrowForwardIcon /> : !wizardState.uploading && <CheckCircleOutlineIcon />}
                                onClick={handleNext}
                                disabled={isNextButtonDisabled()}
                                sx={{ flex: activeStep > 0 ? 2 : 1, ...primaryBtnSx }}
                            >

                                {wizardState.uploading ? (<CircularProgress size={24} sx={{ color: GEC.gold }} />) :
                                    activeStep < STEPS.length - 1 ?
                                        "Continue"
                                        : "Submit Onboarding"}


                            </Button>
                        </Box>

                        {/* Footer */}
                        <Typography
                            variant="caption"
                            sx={{ display: "block", textAlign: "center", mt: 3, color: "#a89b7a" }}
                        >
                            Need help?{" "}
                            <Box component="span" sx={footerLinkSx} onClick={() => {
                                window.location.href = "mailto:development3@german-emirates-club.com";
                            }}>
                                Contact partner support
                            </Box>
                        </Typography>
                    </Box>

                    {/* Bottom accent bar */}
                    <Box sx={bottomAccentBarSx} />
                </Paper>
            </Container>

        </Box>
    );
}


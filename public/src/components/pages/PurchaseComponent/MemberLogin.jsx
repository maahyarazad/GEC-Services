import React, { useImperativeHandle, useRef, forwardRef, useState, useCallback, useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";

import { IoIosSearch } from "react-icons/io";
import { MdClear } from "react-icons/md";
import { GrLogout } from "react-icons/gr";

import OtpTimer from "../../utils/OtpTimer";
import OtpInput from "../../utils/OtpInput";

import { useSnackbar } from "../../Providers/Snackbar";
import { useAlertDialog } from '../../Providers/AlertProvider';
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { useTheme } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
const MemberLogin = forwardRef(({ handleLoginSubmit, isLogging = false, setRegistration_code, setWizardState, wizardState, setActiveStep }, ref) => {
    // OTP vars
    const [showOtpInput, setShowOtpInput] = useState(false);
    const statusRef = useRef();
    const otpRef = useRef();
    const otpFocus = useRef();
    const [validOtp, setValidOtp] = useState(null);
    const [currentResponseStatus, setCurrentResponseStatus] = useState(null);
    const [currentResponseMessage, setCurrentResponseMessage] = useState(null);
    const { showSnackbar } = useSnackbar();
    const { openDialog } = useAlertDialog();

    const formikRef = useRef();
    const timer = useRef(null);
    const [isSearching, setIsSearching] = useState(false);
    const [responseMessage, setResponseMessage] = useState("");
    const [authorized, setAuthorized] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const validationSchema = Yup.object({
        email: Yup.string().email("Enter a valid email").required("Email is required!"),
        // card_number: Yup.string().required("Card number is required!"),
    });



    const initialValues = {
        email: wizardState?.member?.email || "",
        card_number: "",
    };



    const showMessage = (msg, val) => {
        setResponseMessage(msg);


        if (timer.current) {
            clearTimeout(timer.current);
        }


        timer.current = setTimeout(() => {
            setResponseMessage("");
        }, val);
    };


    useEffect(() => {
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, []);

    const searchMember = async (values) => {
        setIsSearching(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/member-card`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "username": values.email,
                    "card_number": values.card_number
                })
            });


            const result = await response.json();

            if (result.data) {

                showMessage("", 60000);

                const member = result?.data;

                const libphone = member?.mobile_number ? parsePhoneNumberFromString(`+${member.mobile_number}`) : null;

                const _member = { ...member, ...(libphone || {}) };

                setWizardState(prev => ({ ...prev, member: _member }));

                setShowOtpInput(true);
            }
            else {
                setWizardState((prev) => ({ ...prev, member: null }));
                setShowOtpInput(false);
                showMessage("Email not found. Please speak with your HR department as soon as possible.", 10000);
            }
        } catch (err) {
            showMessage(err);
            console.error('Error fetching data:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const getToken = async () => {

        try {
            const { google_pass_token, ...memberDataWithoutToken } = wizardState.member;



            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/member-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(memberDataWithoutToken)
            });




        } catch (err) {

            console.error('Error fetching data:', err);
        } finally {

        }
    };
    const autoLogin = useCallback(async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/member-auto-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });



            // Optionally handle response data
            const data = await response.json();

            if (data) {
                initialValues.email = data.member.email;
                setWizardState((prev) => ({ ...prev, member: data.member, authenticate: true }));
            }


        } catch (err) {
            console.error('Error fetching data:', err);
        }
    }, []);



    useEffect(() => {


        if (!wizardState.isMounted) {

            autoLogin();
            setWizardState((prev) => ({ ...prev, isMounted: true }))
        }


    }, [wizardState.isMounted]);




    // ✅ Expose methods to parent
    useImperativeHandle(ref, () => ({
        submitForm: () => {
            if (formikRef.current) formikRef.current.handleSubmit();
        },
        resetForm: () => {
            if (formikRef.current) formikRef.current.resetForm();
        },
        clear: () => { },
    }));


    const maskEmail = (email) => {
        if (!email) return "";
        if (authorized) return email;

        const [user, domain] = email.split("@");
        if (!user || !domain) return email;

        // Mask user part
        const maskedUser =
            user.length <= 2
                ? user
                : user[0] + "*".repeat(user.length - 2) + user[user.length - 1];

        // Mask domain part
        const domainParts = domain.split(".");

        const maskedDomain = domainParts
            .map((part) => {
                if (part.length <= 2) return part;
                return part[0] + "*".repeat(part.length - 2) + part[part.length - 1];
            })
            .join(".");

        return `${maskedUser}@${maskedDomain}`;
    };

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

    const handleExpiredChange = (val) => {
        setValidOtp(false);
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


    const logoutMember = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/member-logout`, {
                method: 'POST',
                credentials: 'include', // important: includes cookies in request
            });

            if (!response.ok) {
                throw new Error('Failed to log out');
            }

            const data = await response.json();



            // Optionally, clear any local state or redirect
            // setWizardState({ member: null, authenticate: false });
            // navigate("/login");

        } catch (err) {
            console.error('Error during logout:', err);
        }
    };


    const Unauthorized = async () => {

        await logoutMember();
        setWizardState((prev) => ({ ...prev, member: null, authenticate: false, otpState: null }));
        showMessage("");
        setValidOtp(false);
        setCurrentResponseStatus(null);
        formikRef.current.setFieldValue("email", "");
    }

    const confirmClear = () => {

        openDialog(
            <>
                Your account has been <strong>successfully authenticated. </strong>
                Do you want to search for other emails?
            </>,

            'Clear', {
            text: 'Clear',
            color: 'error'
        },
            () => {

                Unauthorized();

            },
            () => {
                // Cancelled: do nothing
            }
        );




    }

    return (
 <Box
            className="w-100 d-flex justify-content-center align-items-center flex-column"
        >
            {/* ── Intro text ─────────────────────────────────────────────── */}
            <Typography
                sx={{
                    textAlign: "center",
                    maxWidth: 560,
                    fontSize: isMobile ? 14 : 17,
                    color: GEC.textSecondary,
                    lineHeight: 1.65,
                    mb: 3,
                    fontFamily: "'Georgia', serif",
                }}
            >
                Welcome! Verify your account details to receive your Membership Pass.
                <br />
                Please enter your email address.
            </Typography>

            {/* ── Form wrapper ───────────────────────────────────────────── */}
            <Box
                className="w-100 d-flex justify-content-center align-items-center flex-column"
            >
                <Box sx={{ width: "100%", maxWidth: 420 }}>
                    <Formik
                        innerRef={formikRef}
                        initialValues={initialValues}
                        validationSchema={validationSchema}
                        onSubmit={(values) => searchMember(values)}
                    >
                        {({ errors, touched, isSubmitting }) => (
                            <Form>
                                {/* ── Email Field ──────────────────────────── */}
                                <Box sx={{ mb: 2 }}>
                                    <FieldLabel>Email Address</FieldLabel>
                                    <Field
                                        as={TextField}
                                        type="email"
                                        name="email"
                                        fullWidth
                                        placeholder="you@example.com"
                                        disabled={wizardState.authenticate}
                                        helperText={<ErrorMessage name="email" />}
                                        error={touched.email && Boolean(errors.email)}
                                        sx={fieldSx}
                                        InputProps={{
                                            endAdornment: wizardState.authenticate ? (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={confirmClear}
                                                        edge="end"
                                                        size="small"
                                                        sx={{ color: GEC.textSecondary }}
                                                    >
                                                        <MdClear />
                                                    </IconButton>
                                                </InputAdornment>
                                            ) : null,
                                        }}
                                    />
                                </Box>

                                {/* ── Submit Button ────────────────────────── */}
                                <Button
                                    type="submit"
                                    variant="contained"
                                    fullWidth
                                    disabled={wizardState.authenticate}
                                    sx={{
                                        ...primaryBtnSx,
                                        ...(wizardState.member !== null && {
                                            background: "transparent",
                                            border: `1px solid ${GEC.goldBorder}`,
                                            color: GEC.textSecondary,
                                            boxShadow: "none",
                                            "&:hover": {
                                                borderColor: GEC.gold,
                                                color: GEC.goldDark,
                                                background: GEC.goldMuted,
                                                boxShadow: "none",
                                                transform: "none",
                                            },
                                        }),
                                    }}
                                >
                                    <Box
                                        sx={{
                                            minWidth: 60,
                                            minHeight: 25,
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
                                        {isSubmitting ? (
                                            <CircularProgress size={20} color="inherit" />
                                        ) : (
                                            "Search"
                                        )}
                                    </Box>
                                </Button>
                            </Form>
                        )}
                    </Formik>
                </Box>

                {/* ── Response message ───────────────────────────────────── */}
                <Box
                    sx={{
                        minHeight: 50,
                        maxWidth: 320,
                        opacity: responseMessage ? 1 : 0,
                        transition: "opacity 0.5s ease",
                        textAlign: "center",
                        mt: 1,
                        mb: 1,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                        color: GEC.textSecondary,
                        fontSize: 14,
                        ...(responseMessage && toastAlertSx),
                        borderRadius: 2,
                        px: responseMessage ? 2 : 0,
                        py: responseMessage ? 1 : 0,
                    }}
                >
                    {responseMessage}
                </Box>

                {/* ── Member card ─────────────────────────────────────────── */}
                {wizardState?.member && (
                    <Card
                        sx={{
                            ...infoCardSx,
                            minWidth: isMobile ? "auto" : 420,
                            width: isMobile ? "100%" : "auto",
                            cursor: "pointer",
                            textAlign: "start",
                            mt: 1,
                            transition: "box-shadow 0.2s ease",
                            "&:hover": {
                                boxShadow: `0 8px 32px rgba(185,150,43,0.18)`,
                            },
                        }}
                    >
                        <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
                            {(() => {
                                const maskText = (text) => {
                                    if (!text) return "";
                                    return text
                                        .split(" ")
                                        .map((word) =>
                                            authorized
                                                ? word
                                                : word[0] + "*".repeat(word.length - 1)
                                        )
                                        .join(" ");
                                };

                                const fullName = wizardState?.member?.title
                                    ? `${wizardState.member.title} ${wizardState.member.firstname} ${wizardState.member.lastname}`
                                    : `${wizardState.member.firstname} ${wizardState.member.lastname}`;

                                return (
                                    <>
                                        {/* ── Header row ──────────────────── */}
                                        <Box
                                            sx={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                                mb: 0.5,
                                            }}
                                        >
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontFamily: "'Georgia', serif",
                                                    fontWeight: 700,
                                                    color: GEC.textPrimary,
                                                    lineHeight: 1.3,
                                                }}
                                            >
                                                {wizardState.authenticate
                                                    ? fullName
                                                    : maskText(fullName)}
                                            </Typography>

                                            {wizardState.authenticate && (
                                                <IconButton
                                                    onClick={confirmClear}
                                                    size="small"
                                                    sx={{
                                                        color: GEC.textSecondary,
                                                        "&:hover": { color: GEC.goldDark },
                                                    }}
                                                >
                                                    <GrLogout />
                                                </IconButton>
                                            )}
                                        </Box>

                                        {/* ── Member ID ───────────────────── */}
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ color: GEC.textSecondary, mb: 2 }}
                                        >
                                            Member ID:{" "}
                                            <Box
                                                component="span"
                                                sx={{ color: GEC.textPrimary, fontWeight: 600 }}
                                            >
                                                {wizardState.authenticate
                                                    ? wizardState.member.memberId
                                                    : maskText(wizardState.member.memberId?.toString())}
                                            </Box>
                                        </Typography>

                                        {/* ── Grid fields ─────────────────── */}
                                        <Grid container spacing={2} sx={{ mb: 2 }}>
                                            <Grid item xs={6}>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        display: "block",
                                                        color: GEC.textSecondary,
                                                        textTransform: "uppercase",
                                                        letterSpacing: "0.06em",
                                                        fontWeight: 600,
                                                        mb: 0.4,
                                                    }}
                                                >
                                                    Card Number
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ color: GEC.textPrimary, fontWeight: 500 }}
                                                >
                                                    {wizardState.authenticate
                                                        ? wizardState.member.card_number
                                                        : maskText(wizardState.member.card_number?.toString())}
                                                </Typography>
                                            </Grid>

                                            <Grid item xs={6}>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        display: "block",
                                                        color: GEC.textSecondary,
                                                        textTransform: "uppercase",
                                                        letterSpacing: "0.06em",
                                                        fontWeight: 600,
                                                        mb: 0.4,
                                                    }}
                                                >
                                                    Expiry Date
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ color: GEC.textPrimary, fontWeight: 500 }}
                                                >
                                                    {wizardState.authenticate
                                                        ? wizardState.member.card_expiry_date?.split(" ")?.[0]
                                                        : maskText(
                                                            wizardState.member.card_expiry_date?.split(" ")?.[0]
                                                        )}
                                                </Typography>
                                            </Grid>

                                            <Grid item xs={12}>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        display: "block",
                                                        color: GEC.textSecondary,
                                                        textTransform: "uppercase",
                                                        letterSpacing: "0.06em",
                                                        fontWeight: 600,
                                                        mb: 0.4,
                                                    }}
                                                >
                                                    Email
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ color: GEC.textPrimary, fontWeight: 500 }}
                                                >
                                                    {wizardState.authenticate
                                                        ? wizardState.member.email
                                                        : maskEmail(wizardState.member.email)}
                                                </Typography>
                                            </Grid>
                                        </Grid>

                                        {/* ── Divider ─────────────────────── */}
                                        <Divider
                                            sx={{
                                                height: 1,
                                                background: `linear-gradient(90deg, transparent, ${GEC.goldBorder}, transparent)`,
                                                border: "none",
                                                my: 2,
                                            }}
                                        />

                                        {/* ── Verify button ───────────────── */}
                                        <Button
                                            variant="contained"
                                            fullWidth
                                            disabled={wizardState.authenticate === true}
                                            onClick={handleSendOtp}
                                            sx={primaryBtnSx}
                                        >
                                            {wizardState.authenticate === true
                                                ? "✓ Verified"
                                                : "Verify your email to confirm your account details"}
                                        </Button>

                                        {/* ── OTP input ───────────────────── */}
                                        <Box
                                            className={`otp-slide ${showOtpInput ? "show" : ""}`}
                                            sx={{ mt: 2 }}
                                        >
                                            <Box ref={statusRef} />

                                            {currentResponseStatus && (
                                                <>
                                                    <OtpInput
                                                        ref={otpRef}
                                                        onComplete={(val) => handlePostOTP(val)}
                                                    />
                                                    {validOtp && (
                                                        <OtpTimer
                                                            initialSeconds={300}
                                                            loginResponseData={currentResponseStatus}
                                                            onExpiredChange={handleExpiredChange}
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </Box>

                                        <Box ref={otpFocus} />
                                    </>
                                );
                            })()}
                        </CardContent>
                    </Card>
                )}
            </Box>
        </Box>
    );
});

export default MemberLogin;

import React, { useImperativeHandle, useRef, forwardRef, useState, useCallback } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button, TextField, Card, CardContent, Typography, Grid, Box, IconButton, InputAdornment, Divider } from "@mui/material";
import { IoIosSearch } from "react-icons/io";
import CircularProgress from "@mui/material/CircularProgress";
import { useEffect } from "react";
import { MdClear } from "react-icons/md";
import OtpTimer from "../../utils/OtpTimer";
import OtpInput from "../../utils/OtpInput";
import { useSnackbar } from "../../Providers/Snackbar";
import { useAlertDialog } from '../../Providers/AlertProvider';


const MemberLogin = forwardRef(({ handleLoginSubmit, isLogging = false, setRegistration_code, setWizardState, wizardState, clear }, ref) => {
    // OTP vars
    const [showOtpInput, setShowOtpInput] = useState(false);
    const statusRef = useRef();
    const otpRef = useRef();
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


            if (!response.ok) {
                throw new Error('Failed to fetch');
            }

            const result = await response.json();
            if (result.data) {
                
                showMessage("Found a corresponding email for your account. Please confirm your email to proceed.", 60000);
                setWizardState((prev) => ({ ...prev, member: result.data }));
                setShowOtpInput(true);
            }
            else {
                showMessage("No account found with this email address", 10000);
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
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/member-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                   ...wizardState.member,
                    
                })
            });


            if (!response.ok) {
                throw new Error('Failed to fetch');
                 console.error('Response Error');
            }

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

            if (!response.ok) {
                console.error('Response Error');
                throw new Error('Failed to fetch');
            }

            // Optionally handle response data
            const data = await response.json();
            
            if(data){
                initialValues.email= data.member.email;
                 setWizardState((prev) => ({ ...prev, member: data.member,  authenticate: true }));
            }
            

        } catch (err) {
            console.error('Error fetching data:', err);
        }
    }, []);



 useEffect(() => {
    if(!wizardState.authenticate){

        autoLogin();
    }

    }, [autoLogin,wizardState]);



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
            const formData = new FormData();
            formData.append("email", wizardState?.member.email);
            formData.append("message", "To verify your email and complete your account authentication for");



            formData.append("event", "Membership Authentication");

            const otp_response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/send-otp`,
                {
                    method: "POST",
                    body: formData,
                    credentials: "include",
                }
            );

            if (otp_response.status === 429) {

                const response_data = await otp_response.json();
                statusRef.current.innerText = response_data.error;
                setCurrentResponseMessage(false);
                statusRef.current.classList.add("text-danger");
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

            const formData = new FormData();
            for (const key in data) {
                formData.append(key, data[key]);
            }

            const otpResponse = await fetch(
                `${import.meta.env.VITE_SERVERURL}/otp-check`,
                {
                    method: "POST",
                    body: formData,
                    credentials: "include",
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
                console.log(data.message); // "Member has been logged out successfully."
                
                // Optionally, clear any local state or redirect
                // setWizardState({ member: null, authenticate: false });
                // navigate("/login");
    
            } catch (err) {
                console.error('Error during logout:', err);
            }
            };


    const Unauthorized = async () => {

        await logoutMember();
        setWizardState(({
            authenticate: false,
            member: null,
        }));
        showMessage("");
        setValidOtp(false);
        setCurrentResponseStatus(null);
        formikRef.current.setFieldValue("email", "");
    }

    const confirmClear = () => {

        openDialog(
            <div>
                Your account has been <strong>successfully authenticated. </strong>
                Do you want to search for other emails?
            </div>,

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
        <div className="w-100 d-flex justify-content-center align-items-center flex-column" >
            <div style={{ width: "100%", maxWidth: 400 }}>

                <Formik
                    innerRef={formikRef}
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={(values, formikHelpers) => searchMember(values)}
                >
                    {({ setFieldValue, errors, touched, isSubmitting }) => (
                        <Form>

                            {/* Email Field */}
                            <Field
                                as={TextField}
                                type="email"
                                name="email"
                                fullWidth
                                label="E-mail"
                                disabled={wizardState.authenticate}
                                helperText={<ErrorMessage name="email" />}
                                error={touched.email && Boolean(errors.email)}
                                InputProps={{
                                    endAdornment: !wizardState.member ? (<></>) : (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={confirmClear}
                                                edge="end"
                                                size="small"
                                            >
                                                <MdClear />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <div className="full position-relative w-100">

                            </div>
                            {/* Card Number Field */}
                            {/* <div className="full position-relative mb-3">
                            <Field
                                as={TextField}
                                type="password"
                                name="card_number"
                                size="small"
                                fullWidth
                                label="Card Number"
                                helperText={<ErrorMessage name="card_number" />}
                                className="pb-2"
                                error={touched.email && Boolean(errors.email)}
                                
                            />
                            
                        </div> */}


                            {/* Submit Button */}

                            <Button
                                className="mt-1"
                                type="submit"
                                variant="contained"
                                disabled={isSubmitting}
                                style={{ textTransform: "none", width: "100%" }}

                            >
                                <span style={{ minWidth: 60, minHeight: 25 }} className="d-flex justify-content-center align-items-center">

                                    {isSubmitting ? (
                                        <CircularProgress size={20} color="inherit" />
                                    ) : (
                                        <>
                                            Search
                                        </>
                                    )}

                                </span>

                            </Button>

                        </Form>

                    )}
                </Formik>
            </div>

            <div
                className={`fade-in ${responseMessage ? "visible" : ""} mt-2 mb-2`}
                style={{

                    minHeight: 50,
                    maxWidth: 300,
                    opacity: responseMessage ? 1 : 0,
                    transition: "opacity 0.5s ease",
                    // color: responseMessage.includes("success") ? "green" : "red",
                    textAlign: "center",
                    marginTop: "0rem",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    overflowWrap: "break-word"
                }}
            >
                {responseMessage}
            </div>

            {wizardState?.member && (
                <Card sx={{ minWidth: 250, boxShadow: 3, cursor: 'pointer', textAlign: 'start' }}>
                    <CardContent>
                        {/* Helper to mask text */}
                        {(() => {
                            const maskText = (text) => {
                                if (!text) return '';
                                // Split words, keep first letter, replace rest with *
                                return text
                                    .split(' ')
                                    .map((word) =>
                                        authorized
                                            ? word // if authorized, show full text
                                            : word[0] + '*'.repeat(word.length - 1)
                                    )
                                    .join(' ');
                            };

                            return (
                                <>
                                    {/* Header */}
                                    <Typography variant="h6" gutterBottom>
                                        {maskText(
                                            wizardState.member.title
                                                ? `${wizardState.member.title} ${wizardState.member.firstname} ${wizardState.member.lastname}`
                                                : `${wizardState.member.firstname} ${wizardState.member.lastname}`
                                        )}
                                    </Typography>

                                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                        Member ID: {maskText(wizardState.member.memberId.toString())}
                                    </Typography>

                                    <Box sx={{ mt: 2 }}>
                                        <Grid container spacing={1}>
                                            <Grid item xs={6}>
                                                <Typography variant="body2" color="textSecondary">
                                                    Card Number
                                                </Typography>
                                                <Typography variant="body1">
                                                    {maskText(wizardState.member.card_number.toString())}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography variant="body2" color="textSecondary">
                                                    Expiry Date
                                                </Typography>
                                                <Typography variant="body1">
                                                    {maskText(wizardState.member.card_expiry_date.split(' ')[0])}
                                                </Typography>
                                            </Grid>
                                        </Grid>

                                        <Box sx={{ mt: 2 }}>
                                            <Typography variant="body2" color="textSecondary">
                                                Email
                                            </Typography>
                                            <Typography variant="body1">
                                                {maskEmail(wizardState.member.email)}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Divider sx={{ borderBottomWidth: 1, borderColor: '#000', my: 2 }} />
                                    <>

                                        <Button
                                            className=""
                                            variant="contained"
                                            color="primary"
                                            disabled={wizardState.authenticate === true}
                                            type="button"
                                            onClick={handleSendOtp}
                                            style={{
                                                pointerEvents: "auto",
                                                opacity: 1,
                                                width: "100%",
                                                textTransform: "none",
                                            }}
                                        >

                                            <p>{wizardState.authenticate === true ?  "Authenticated": "Authenticate With Your Email"}</p>
                                        </Button>
                                        <div className={`otp-slide ${showOtpInput ? "show" : ""} mt-3`}>
                                            <div ref={statusRef}></div>

                                            {currentResponseStatus && (
                                                <>
                                                    <OtpInput
                                                        ref={otpRef}
                                                        onComplete={(val) => {
                                                            handlePostOTP(val);
                                                        }}
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
                                        </div>

                                    </>
                                </>
                            )

                        })()}
                    </CardContent>

                </Card>
            )}




        </div>
    );
});

export default MemberLogin;

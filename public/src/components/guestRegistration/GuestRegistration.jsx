
import { useSearchParams, useParams } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";

import "../utils/login.css";
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { getCookie, setEncryptedCookie } from '../utils/cookieUtils';
import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai';
import CircularProgress from '@mui/material/CircularProgress';
import { GoShieldLock } from "react-icons/go";
import { Button } from "@mui/material";
import { useSnackbar } from "../Providers/Snackbar";
import { Box, Paper, Typography, Container } from '@mui/material';
const validationSchema = Yup.object({
    login_code: Yup.string().required('Login code is required!'),
});

export const GuestRegistration = () => {
    const eventSlug = useParams();
    const {showSnackbar} = useSnackbar();

    const passkey = 1234;
    const initialValues = {
        login_code: '',
    };

    const statusRef = useRef();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [guestUser, setGuestUser] = useState(null);
    const [showPassword, setShowPassowrd] = useState(false);

    useEffect(() => {

        const existingUser = getCookie("g-usr");

        if (Number(existingUser) === passkey) {
            setGuestUser(true); // Only store flag
        }
        setIsCheckingAuth(false);
    }, []);

    const handleLoginSubmit = async (values, { setSubmitting, resetForm }) => {
        try {
            setSubmitting(true);

            if (Number(values.login_code) === passkey) {
                setEncryptedCookie("g-usr", values.login_code); // Just set a flag, not the code itself
                setGuestUser(true);               // Mark as logged in
                resetForm();
            } else {
                if (statusRef.current) {
                    statusRef.current.textContent = "Invalid Password!";
                }
            }

        } catch (err) {
            console.error("Login error:", err);
            if (statusRef.current) {
                statusRef.current.textContent = "An unexpected error occurred.";
            }
        } finally {
            setSubmitting(false);
        }
    };


    const [searchParams] = useSearchParams();

    const query = searchParams.get("guest-code") || "";

    const [registrant, setRegistrant] = useState(null);

    const hostessKey = 12345;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pageMessage, setPageMessage] = useState(null);
    const [statusCode, setStatusCode] = useState(null);


    const fetchRegistration = useCallback(async () => {
        setLoading(true);
        if (!query) {
            setError("No guest-code provided in URL.");
            setLoading(false);
            return;
        }

        if (!guestUser) return;

        try {

            const formData = new FormData();
            formData.append("event_id", query);

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/complete-registration`, {
                method: 'POST',
                body: formData,
            });


            
            const response_data = await response.json();
            setRegistrant(response_data.record);
            setPageMessage(response_data.message);
            setStatusCode(response.status);

            
            if (response.status === 200) {
                
                showSnackbar(response_data.message, 'success');
                return;
            }

            showSnackbar(response_data.message);


        } catch (err) {
            
            showSnackbar(err.message);
            setError("Failed to fetch registration.");
        } finally {
            setLoading(false);
        }
    }, [query, guestUser]);


    // ✅ 2. useEffect calls the memoized function
    useEffect(() => {
        fetchRegistration();
    }, [fetchRegistration]);

    if (!guestUser) {
        return (
            <div className="login">
                <div>
                    <h4>Welcome back! Please log in to continue.</h4>
                    <Formik
                        initialValues={initialValues}
                        validationSchema={validationSchema}
                        onSubmit={(values, formikHelpers) =>
                            handleLoginSubmit(values, formikHelpers)
                        }
                    >
                        {({ values, setFieldValue, errors, touched, isSubmitting }) => (
                            <Form>
                                <div className="full position-relative">
                                    <Field
                                        onChange={(e) => {
                                            setFieldValue('login_code', e.target.value);
                                        }}
                                        name="login_code"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Use your code to login"
                                        className={`form-control ${errors.login_code && touched.login_code ? 'is-invalid' : ''}`}
                                        style={{
                                            paddingRight: '2.5rem',
                                            backgroundImage: 'none',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'right calc(0.375em + 0.1875rem) center',
                                            backgroundSize: '0 0'
                                        }}
                                    />
                                    <span
                                        onClick={() => setShowPassowrd((prev) => !prev)}
                                        style={{
                                            position: 'absolute',
                                            top: '50%',
                                            right: '10px',
                                            transform: 'translateY(-50%)',
                                            cursor: 'pointer',
                                            color: '#6c757d',
                                        }}
                                    >
                                        {showPassword ? <AiFillEyeInvisible size={20} /> : <AiFillEye size={20} />}
                                    </span>
                                </div>
                                <div className="cta-zone d-flex justify-content-between align-items-center">
                                    <div>
                                        <ErrorMessage
                                            name="login_code"
                                            component="div"
                                            className="text-danger small"
                                        />
                                    </div>
                                    <Button
                                        className="mt-1"
                                        type="submit"
                                        variant="contained"
                                        disabled={isSubmitting}
                                        style={{ textTransform: 'none', width: '100%' }}
                                        startIcon={<GoShieldLock size={20} color="white" />}
                                    >
                                        Login
                                    </Button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                    <p
                        ref={statusRef}
                        className="text-danger"
                    ></p>
                </div>
            </div>
        );
    }else{
        return(
<>
    
    {guestUser ? (
        loading ? (
            <div
                className="w-100 d-flex align-items-center justify-content-center"
                style={{ height: '100dvh' }}
            >
                <CircularProgress />
            </div>
        ) : (
            <div>
                <Container maxWidth="sm" sx={{ height: '100vh' }}>
                    <Box
                        sx={{
                            height: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <Paper elevation={10} sx={{ p: 4, textAlign: 'center', width: '100%' , background: `${statusCode === 200 ? "#d5f7d0": "#f7d0d0" }`}}>
                            {registrant ? (
                                <>
                                    <Typography variant="h4" gutterBottom>
                                        {pageMessage}
                                    </Typography>
                                    <Typography variant="body1" sx={{ mt: 2 }}>
                                        <strong>Registrant:</strong> {registrant.firstName} {registrant.lastName}
                                    </Typography>
                                    {/* 
                                    <Typography variant="body1" sx={{ mt: 2 }}>
                                        <strong>Phone Number:</strong> {registrant.phone}
                                    </Typography>
                                    */}
                                </>
                            ) : (
                                <Typography variant="h6" color="text.secondary">
                                    No registration data to display.
                                </Typography>
                            )}
                        </Paper>
                    </Box>
                </Container>
            </div>
        )
    ) : null}
</>
        )
    }



};



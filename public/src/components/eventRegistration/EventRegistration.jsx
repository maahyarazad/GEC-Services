import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';

import '../utils/login.css';

import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai';
import { GoShieldLock } from 'react-icons/go';

import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';

import { useSnackbar } from '../Providers/Snackbar';

const validationSchema = Yup.object({
    password: Yup.string().required('Password is required!'),
});

const initialValues = { password: '' };

const EventRegistration = () => {
    // The route is /event-registration/:queryParam — the param carries the
    // attendance query string (e.g. "contactId=123&eventId=456").
    const { queryParam } = useParams();
    const { showSnackbar } = useSnackbar();

    const statusRef = useRef();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [operatorUser, setOperatorUser] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pageMessage, setPageMessage] = useState(null);
    const [statusCode, setStatusCode] = useState(null);

    // ── Send the queryParam to the protected complete-attendance endpoint ──────
    const markAttendance = useCallback(async () => {
        if (!queryParam) {
            setError('No registration reference provided in the URL.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/registration/contacts/complete-attendance?${queryParam}`,
                { method: 'PATCH', credentials: 'include' }
            );

            // Session expired / not an operator — fall back to the login form.
            if (response.status === 401 || response.status === 403) {
                setOperatorUser(false);
                return;
            }

            const data = await response.json();
            setStatusCode(response.status);
            setPageMessage(data.message);
            showSnackbar(data.message, response.ok ? 'success' : '');
        } catch (err) {
            setError('Failed to update attendance.');
            showSnackbar(err.message, '');
        } finally {
            setLoading(false);
        }
    }, [queryParam, showSnackbar]);

    // ── On load: detect an existing operator session, then mark attendance ─────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_SERVERURL}/operator/check-auth`, {
                    credentials: 'include',
                });
                if (!cancelled && res.ok) {
                    setOperatorUser(true);
                    markAttendance();
                }
            } catch {
                // Not authenticated — the login form will be shown.
            } finally {
                if (!cancelled) setIsCheckingAuth(false);
            }
        })();
        return () => { cancelled = true; };
    }, [markAttendance]);

    const handleLoginSubmit = async (values, { setSubmitting, resetForm }) => {
        try {
            setSubmitting(true);
            if (statusRef.current) statusRef.current.textContent = '';

            const formData = new FormData();
            formData.append('password', values.password);

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/operator/login`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });
            const data = await response.json();

            if (response.ok && data.success) {
                setOperatorUser(true);
                resetForm();
                markAttendance();
            } else if (statusRef.current) {
                statusRef.current.textContent = data.error || 'Invalid Password!';
            }
        } catch (err) {
            console.error('Login error:', err);
            if (statusRef.current) {
                statusRef.current.textContent = 'An unexpected error occurred.';
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="w-100 d-flex align-items-center justify-content-center" style={{ height: '100dvh' }}>
                <CircularProgress />
            </div>
        );
    }

    if (!operatorUser) {
        return (
            <div className="login">
                <div>
                    <h4>Operator login required to continue.</h4>
                    <Formik
                        initialValues={initialValues}
                        validationSchema={validationSchema}
                        onSubmit={handleLoginSubmit}
                    >
                        {({ setFieldValue, errors, touched, isSubmitting }) => (
                            <Form>
                                <div className="full position-relative">
                                    <Field
                                        onChange={(e) => setFieldValue('password', e.target.value)}
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter operator password"
                                        className={`form-control ${errors.password && touched.password ? 'is-invalid' : ''}`}
                                        style={{
                                            paddingRight: '2.5rem',
                                            backgroundImage: 'none',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'right calc(0.375em + 0.1875rem) center',
                                            backgroundSize: '0 0',
                                        }}
                                    />
                                    <span
                                        onClick={() => setShowPassword((prev) => !prev)}
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
                                        <ErrorMessage name="password" component="div" className="text-danger small" />
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
                    <p ref={statusRef} className="text-danger"></p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="w-100 d-flex align-items-center justify-content-center" style={{ height: '100dvh' }}>
                <CircularProgress />
            </div>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ height: '100vh' }}>
            <Box sx={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Paper
                    elevation={10}
                    sx={{
                        p: 4,
                        textAlign: 'center',
                        width: '100%',
                        background: statusCode === 200 ? '#d5f7d0' : '#f7d0d0',
                    }}
                >
                    {error ? (
                        <Typography variant="h6" color="error">{error}</Typography>
                    ) : pageMessage ? (
                        <Typography variant="h4" gutterBottom>{pageMessage}</Typography>
                    ) : (
                        <Typography variant="h6" color="text.secondary">
                            No attendance result to display.
                        </Typography>
                    )}
                </Paper>
            </Box>
        </Container>
    );
};

export default EventRegistration;

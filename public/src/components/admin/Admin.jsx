
import { Header } from "../utils/Header";
import PropTypes from "prop-types";
import "./admin.css";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { useState, useEffect, useRef } from "react";
import { RegistrationList } from "./Registration/RegistrationList";
import { RegistrationDataGrid } from "../gallery/RegistrationDataGrid"
import { MemberDataGrid } from "../gallery/MembersDataGrid"
import { SurveyDataGrid } from "../gallery/SurveyDataGrid"
import "../utils/login.css";
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { getCookie, setEncryptedCookie } from '../utils/cookieUtils';
import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai';
import CircularProgress from '@mui/material/CircularProgress';
import { GoShieldLock } from "react-icons/go";
import { Button } from "@mui/material";
import { GiArchiveRegister } from "react-icons/gi";
import { BsCalendar2Event } from "react-icons/bs";
import { BsPeopleFill } from "react-icons/bs";
import { FcSurvey } from "react-icons/fc";
import { GICDataGrid } from "../gallery/GICDataGrid";
const validationSchema = Yup.object({
    login_code: Yup.string().required('Login code is required!'),
});
import {useNavigate} from 'react-router-dom';

export const Admin = ({ data }) => {

    const initialValues = {
        login_code: '',
    };
    const navigate = useNavigate();
    const statusRef = useRef();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [adminUser, setAdminUser] = useState(null);
    const [showPassword, setShowPassowrd] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_SERVERURL}/api/admin/check-auth`, {
                    method: "GET",
                    credentials: "include",
                });
                    
                if (!res.ok) {
                    setAdminUser(null);
                    
                } else {
                    const data = await res.json();
                    setAdminUser(data.authenticated === true);
                }
            } catch (err) {
                console.error("Auth check failed:", err);
                setAdminUser(false);
            } finally {
                setIsCheckingAuth(false);
            }
        };

        checkAuth();
    }, []);

    const handleLoginSubmit = async (values, { setSubmitting, resetForm }) => {
        try {
            setSubmitting(true);

            const res = await fetch(`${import.meta.env.VITE_SERVERURL}/api/admin/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include", // ensure cookie/session is set
                body: JSON.stringify({ password: values.login_code }),
            });

            if (res.ok) {
                const data = await res.json();

                if (data.success) {
                    // backend sets secure cookie, you just store a flag in state
                    setAdminUser(true);
                    resetForm();
                    if (statusRef.current) {
                        statusRef.current.textContent = "Login successful!";
                    }
                } else {
                    if (statusRef.current) {
                        statusRef.current.textContent = "Invalid Password!";
                    }
                }
            } else {
                if (statusRef.current) {
                    statusRef.current.textContent = "Login failed. Please try again.";
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



    const [tabValue, setTabValue] = useState(0);

    const handletabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    let content;
    switch (tabValue) {
        case 1:
            content = <RegistrationDataGrid />;
            break;
        case 2:
            content = <SurveyDataGrid />;
            break;
        case 3:
            content = <GICDataGrid />;
            break;
        case 4:
            content = <MemberDataGrid />;
            break;
        default:
            content = <RegistrationList />
            break;
    }

    return isCheckingAuth ? (
        <div className="w-100 min-vh-100 d-flex justify-content-center align-items-center flex-column">

            <CircularProgress />
        </div>
    ) : adminUser !== null ? (
        <>
            <Header />
            <div className="admin">
                <div>
                    <Box
                        sx={{ flexGrow: 0, bgcolor: 'background.paper', display: 'flex' }}
                    >
                        <Tabs
                            orientation="vertical"
                            variant="scrollable"
                            value={tabValue}
                            onChange={handletabChange}
                            aria-label=""
                            TabIndicatorProps={{
                                sx: {
                                    left: 0,
                                    right: 'auto',
                                    width: 3,
                                    bgcolor: 'primary.main',
                                }
                            }}
                        >
                            <Tab
                                icon={<GiArchiveRegister size={20} />}
                                iconPosition="start"
                                label="Registration Management"
                                style={{ textTransform: 'none' }} />
                            <Tab
                                icon={<BsCalendar2Event size={20} />}
                                iconPosition="start"
                                label="Event Management"
                                style={{ textTransform: 'none', alignContent: 'flex-start' }} />

                            <Tab
                                icon={<FcSurvey size={24} />}
                                iconPosition="start"
                                label="Survey Management"
                                style={{ textTransform: 'none' }} />

                            <Tab
                                icon={<BsPeopleFill size={20} />}
                                iconPosition="start"
                                label="GIC Management"
                                style={{ textTransform: 'none' }} />
                            <Tab
                                icon={<BsPeopleFill size={20} />}
                                iconPosition="start"
                                label="Member Management"
                                style={{ textTransform: 'none' }} />

                        </Tabs>
                    </Box>
                </div>
                <div>{content}</div>
            </div>
        </>
    ) : (
        <div className="login">
            <div>
                <h4>Welcome Back! Log In to Proceed.</h4>
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
};

Admin.propTypes = {
    data: PropTypes.array.isRequired,
};

import { useState, useRef, useEffect } from "react";
import { UseLogin } from "../hooks/UseLogin";
import "./login.css";
import { UseFormValidator } from "../hooks/UseFormValidator";
import { useNavigate } from 'react-router-dom';
import OtpInput from '../utils/OtpInput';
import CryptoJS from 'crypto-js';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { getCookie, setEncryptedCookie } from '../utils/cookieUtils';
import CircularProgress from '@mui/material/CircularProgress';
const validationSchema = Yup.object({
    mobile_number: Yup.string()
        .matches(/^\+?[0-9]{12,15}$/, 'Enter a valid phone number')
        .required('Required'),
    registration_code: Yup.string().required('Required'),
});


const OtpTimer = ({ initialSeconds = 59, loginResponseData = {}, onResend }) => {
    const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
    const [expired, setExpired] = useState(false);


    useEffect(() => {
        if (secondsLeft === 0) {
            setExpired(true);
            return;
        }

        const timerId = setInterval(() => {
            setSecondsLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timerId);
    }, [secondsLeft]);

    const handleResend = () => {
        setSecondsLeft(initialSeconds);
        setExpired(false);

        if (typeof onResend === "function") {
            onResend(loginResponseData);
        }
    };

    return (
        <div className="mt-2">
            {expired ? (
                <button onClick={handleResend} className="p-1 ">Send new OTP</button>
            ) : (
                <span>OTP expires in: {secondsLeft} seconds</span>
            )}
        </div>
    );
};


export const Login = () => {
    const [showPassword, setShowPassowrd] = useState(false);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [loginResponseData, setLoginResponseData] = useState(null);
    const [currentResponseStatus, setCurrentResponseStatus] = useState(true);


    const [mobile_number, setMobile_number] = useState(null);
    const [registration_code, setRegistration_code] = useState(true);
    const [isLogging, setIsLogging] = useState(false);

    // const phoneRef = useRef();
    // const registration_code = useRef();
    const loginRef = useRef();
    const statusRef = useRef();
    const navigate = useNavigate();

    const otpRef = useRef();

    const initialValues = {
        mobile_number: '',
        registration_code: '',
    };

    useEffect(() => {

        const gecuser = getCookie("gec-registration");
        debugger;
        if (gecuser) {
            navigate(`/registration/${gecuser.page}`);
        }
    }, []);

    const handleSendOtp = () => {
        // TODO: Trigger backend OTP sending here
        setShowOtpInput(true);
        statusRef.current.innerText = "OTP sent to " + mobile_number;
    };



    const handlePostOTP = async (value) => {
        try {
            setIsLogging(true);
            const data = {
                otp: value,
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                registration_code: registration_code,
                mobile_number: mobile_number,
            };

            const formData = new FormData();
            for (const key in data) {
                formData.append(key, data[key]);
            }

            const otpResponse = await fetch(`${import.meta.env.VITE_SERVERURL}/otp-check`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            setCurrentResponseStatus(otpResponse.ok)

            if (otpResponse.status === 400 || otpResponse.status === 500) {
                throw new Error(`Server responded with ${otpResponse.status}`);
            }

            const otp_response_data = await otpResponse.json();
            debugger;

            if (otp_response_data.status) {

                const mobile_number = { mobile_number: data.mobile_number };
                const payload = {
                    ...otp_response_data.data,
                    ...mobile_number
                };

                setEncryptedCookie("gec-registration", payload);

                statusRef.current.textContent = "Login successful, please wait.... ";

                setTimeout(() => {
                    window.location.assign(`/registration/${otp_response_data.data.page}`);
                }, 500);

            } else {
                statusRef.current.textContent = otp_response_data.message;
            }

        } catch (err) {
            console.error("Login failed:", err);
            if (statusRef.current) {
                statusRef.current.textContent = `Login failed: ${err.message}`;
            }
        }finally{
            setIsLogging(false);
        }

    };


    const handleOtpResend = async () => {
        try {
            setIsLogging(true);
            const data = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                registration_code: registration_code,
                mobile_number: mobile_number,
            };

            const formData = new FormData();
            for (const key in data) {
                formData.append(key, data[key]);
            }

            const loginResponse = await fetch(`${import.meta.env.VITE_SERVERURL}/registration-config-access`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            setCurrentResponseStatus(loginResponse.ok)

            if (!loginResponse.ok) {
                throw new Error(`Server responded with ${loginResponse.message}`);
            }

            const response_data = await loginResponse.json();

            setLoginResponseData(response_data);

            if (response_data.status) {

                handleSendOtp();
                otpRef.current?.clear();
                return;

            } else {
                statusRef.current.textContent = loginResponseData.message;
            }


        } catch (err) {
            console.error("Login failed:", err);
            if (statusRef.current) {
                statusRef.current.textContent = `Login failed: ${err.message}`;
            }
        }finally{
            setIsLogging(false);
        }

    };

    const handleLoginSubmit = async (values, { setSubmitting, resetForm }) => {
        try {
            setIsLogging(true);
            const data = {
                userAgent: navigator.userAgent,
                mobile_number: values.mobile_number,
                platform: navigator.platform,
                language: navigator.language,
                registration_code: values.registration_code,
            };



            const formData = new FormData();
            for (const key in data) {
                formData.append(key, data[key]);
            }

            const loginResponse = await fetch(`${import.meta.env.VITE_SERVERURL}/registration-config-access`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            setCurrentResponseStatus(loginResponse.ok);

            const response_data = await loginResponse.json();

            setLoginResponseData(loginResponse);

            if (response_data.status === 401) {

                statusRef.current.textContent = response_data.message;
                return;
            }

            if (response_data.status) {
                handleSendOtp();
                return;

            } else {
                statusRef.current.textContent = response_data.message;
            }


        } catch (err) {
            console.error("Login failed:", err);
            if (statusRef.current) {
                statusRef.current.textContent = `Login failed: ${err.message}`;
            }
        }finally{
            setIsLogging(false);
        }

    };

    return (
        <div className="login">
            <div>
                <h4>Welcome Back! Log In to Porceed.</h4>
                {/* Step 1: check code login */}
                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={(values, formikHelpers) =>
                        handleLoginSubmit(values, formikHelpers)
                    }
                >
                    {({ values, setFieldValue, errors, touched, isSubmitting }) => (
                        <Form ref={loginRef}>
                            <div className="full">
                                <Field
                                    onChange={(e) => {
                                        setFieldValue('mobile_number', e.target.value)
                                        setMobile_number(e.target.value);
                                    }}
                                    name="mobile_number"
                                    type="tel"
                                    placeholder="Enter mobile number"
                                    className={`form-control ${errors.mobile_number && touched.mobile_number ? 'is-invalid' : ''}`}
                                />
                                <ErrorMessage
                                    name="mobile_number"
                                    component="div"
                                    className="text-danger small"
                                />
                            </div>

                            <div className="full">
                                <Field
                                    onChange={(e) => {
                                        setFieldValue('registration_code', e.target.value);
                                        setRegistration_code(e.target.value);
                                    }}
                                    name="registration_code"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder={showPassword ? 'Enter password' : '••••••••'}
                                    className={`form-control ${errors.registration_code && touched.registration_code ? 'is-invalid' : ''}`}
                                />
                                <ErrorMessage
                                    name="registration_code"
                                    component="div"
                                    className="text-danger small"
                                />
                            </div>

                            <div className="cta-zone mt-1 mb-4">
                                <button
                                    type="submit"
                                    className="cta-button dark"
                                    disabled={isSubmitting || showOtpInput}
                                >
                                    <img alt="login" src="/lock.svg" />
                                    {
                                        isLogging ? <CircularProgress
                                                        size={20}
                                                        color="inherit"
                                                    /> 
                                        : <span className="ms-2">Login</span>
                                    }
                                </button>

                                <span>
                                    <p className="me-1">Show Password</p>
                                    <input
                                        type="checkbox"
                                        onChange={() => setShowPassowrd((prev) => !prev)}
                                    />
                                </span>
                            </div>


                            <div className={`otp-slide ${showOtpInput ? "show" : ""}`}>
                                <OtpInput ref={otpRef}
                                    onComplete={(val) => {
                                        handlePostOTP(val);
                                    }}
                                />

                                {loginResponseData && (
                                    <OtpTimer
                                        loginResponseData={loginResponseData}
                                        onResend={handleOtpResend}
                                    />
                                )}
                            </div>
                        </Form>
                    )}
                </Formik>
                <p
                    ref={statusRef}
                    className={`mt-1 ${currentResponseStatus ? "" : "text-danger"}`}></p>
            </div>

        </div>
    );
};

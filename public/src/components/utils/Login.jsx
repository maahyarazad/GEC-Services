import { useState, useRef, useEffect } from "react";
import { UseLogin } from "../hooks/UseLogin";
import "./login.css";
import { UseFormValidator } from "../hooks/UseFormValidator";
import { useNavigate } from 'react-router-dom';
import OtpInput from '../utils/OtpInput';

const setWithExpiry = (key, value, ttlMs) => {
    const now = new Date();

    const item = {
        value,
        expiry: now.getTime() + ttlMs // time to live in milliseconds
    };

    localStorage.setItem(key, JSON.stringify(item));
}

const OtpTimer = ({ initialSeconds = 60, loginResponseData = {}, onResend }) => {
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
        <div>
            {expired ? (
                <button onClick={handleResend}>Send new OTP</button>
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
    

    const [mobile_number, setmobile_number] = useState("");

    const phoneRef = useRef();
    const registration_code = useRef();
    const loginRef = useRef();
    const statusRef = useRef();

    const navigate = useNavigate();

    const otpRef = useRef();

    useEffect(() => {
        const gecuser = JSON.parse(localStorage.getItem("gec-registration"));

        if (gecuser) {
            navigate(`/registration/${gecuser.value.page}`);
        }
    }, []);

    const handleSendOtp = () => {
        // TODO: Trigger backend OTP sending here
        setShowOtpInput(true);
        statusRef.current.innerText = "OTP sent to " + mobile_number;
    };



    const handlePostOTP = async (value) => {
        try {
            const data = {
                otp: value,
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                registration_code: registration_code.current.value,
                mobile_number: phoneRef.current.value,
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

                setWithExpiry("gec-registration", otp_response_data.data, 1000 * 60 * 10); // expires in 10 mins
                debugger;

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
        }

    };


    const handleOtpResend = async () => {
        try {

            const data = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                registration_code: registration_code.current.value,
                mobile_number: phoneRef.current.value,
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
        }

    };

    const handleLoginSubmit = async () => {
        try {
            const values = document.querySelectorAll(".loginvalue");
            const validate = UseFormValidator(values);

            if (!validate) {
                return;
            }



            const data = {
                userAgent: navigator.userAgent,
                mobile_number: phoneRef.current.value,
                platform: navigator.platform,
                language: navigator.language,
                registration_code: registration_code.current.value,
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
        }

    };

    return (
        <div className="login">
            <div>
                <h4>Please login to view this page</h4>
                {/* Step 1: check code login */}
                <form ref={loginRef}>
                    <label className="full">
                        <input
                            ref={phoneRef}
                            type="tel"
                            value={mobile_number}
                            onChange={(e) => setmobile_number(e.target.value)}
                            placeholder="Enter mobile_number Number"
                            className="loginvalue"
                        />
                    </label>
                    <label className="full">
                        <input
                            ref={registration_code}
                            defaultValue={"12345"}
                            name="confirm"
                            type={showPassword ? "text" : "password"}
                            placeholder={showPassword ? "Enter password" : "••••••••"}
                            className="loginvalue"
                        ></input>
                    </label>


                    {/* Step 1: mobile_number Number Input */}


                    <div className="cta-zone">
                        <button disabled={showOtpInput}
                            onClick={(e) => handleLoginSubmit(e)}
                            type="button"
                            className="cta-button dark"
                        >
                            <img alt="login" src="/lock.svg"></img>
                            <p>Login</p>
                        </button>
                        <span>
                            <p className="me-1">Show Password</p>
                            <input
                                onChange={() => setShowPassowrd((prev) => !prev)}
                                type="checkbox"
                            ></input>
                        </span>
                    </div>


                    {/* Step 2: OTP Input (appears after Send OTP) */}

                    {showOtpInput ? (
                        <>
                            <OtpInput
                                ref={otpRef}
                                onChange={(val) => console.log("Current OTP:", val)}
                                onComplete={(val) => {
                                    console.log("OTP Complete:", val);
                                    handlePostOTP(val);
                                }}
                            />
                            {loginResponseData !== null ?
                                <OtpTimer
                                    loginResponseData={loginResponseData}
                                    onResend={handleOtpResend}
                                    
                                /> : null}
                        </>
                    ) : null}

                </form>
                <p 
                    ref={statusRef} 
                    className={`mt-1 ${currentResponseStatus ? "" : "text-danger" }`}></p>
            </div>

        </div>
    );
};

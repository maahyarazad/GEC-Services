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


export const Login = () => {
    const [showPassword, setShowPassowrd] = useState(false);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [loginResponseData, setLoginResponseData] = useState(null);
    const [mobile, setMobile] = useState("");
    const [otp, setOtp] = useState("");

    const phoneRef = useRef();
    const registration_code = useRef();
    const loginRef = useRef();
    const statusRef = useRef();

    const navigate = useNavigate();

    useEffect(() => {
        const gecuser = JSON.parse(localStorage.getItem("gec-registration"));

        if (gecuser) {
            navigate(`/registration/${gecuser.value.page}`);
        }
    }, []);

    const handleSendOtp = () => {
        // TODO: Trigger backend OTP sending here
        setShowOtpInput(true);
        statusRef.current.innerText = "OTP sent to " + mobile;
    };



    const handleLoginSubmit = async () => {
        const values = document.querySelectorAll(".loginvalue");
        const validate = UseFormValidator(values);

        if (!validate) {
            return;
        }

        const data = {
            userAgent: navigator.userAgent,
            phone: mobile,
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
        });

        setLoginResponseData(await loginResponse.json());
        debugger;

        if (!loginResponseData) {
            statusRef.current.textContent = "An error occurred during login.";
            return;
        }

        if (loginResponseData.status) {

            handleSendOtp();
            return;


            setWithExpiry("gec-registration", loginResponseData.data, 1000 * 60 * 10); // expires in 10 mins
            debugger;

            statusRef.current.textContent = "Login successful, please wait.... ";

            setTimeout(() => {
                window.location.assign(`/registration/${loginResponseData.data.page}`);
            }, 500);

        } else {
            statusRef.current.textContent = loginResponseData.message;
        }
    };

    return (
        <div className="login">
            
                {showOtpInput ? (
                    <OtpInput
                        onChange={(val) => console.log("Current OTP:", val)}
                        onComplete={(val) => {
                            console.log("OTP Complete:", val);
                            // 👉 Call your server to verify OTP here
                            // verifyOtpOnServer(val);
                        }}
                    />
                ) :
                    <div>
                        <h4>Please login to view this page</h4>
                        {/* Step 1: check code login */}
                        <form ref={loginRef}>
                            <label className="full">
                                <input
                                    ref={phoneRef}
                                    type="tel"
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value)}
                                    placeholder="Enter Mobile Number"
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

                            {/* Step 1: Mobile Number Input */}


                            {/* Step 2: OTP Input (appears after Send OTP) */}


                            <div className="cta-zone">
                                <button
                                    onClick={(e) => handleLoginSubmit(e)}
                                    type="button"
                                    className="cta-button dark"
                                >
                                    <img alt="login" src="/lock.svg"></img>
                                    <p>Login</p>
                                </button>
                                <span>
                                    <p>Show Password</p>
                                    <input
                                        onChange={() => setShowPassowrd((prev) => !prev)}
                                        type="checkbox"
                                    ></input>
                                </span>
                            </div>
                        </form>
                        <p ref={statusRef}></p>
                    </div>
                }
            
        </div>
    );
};

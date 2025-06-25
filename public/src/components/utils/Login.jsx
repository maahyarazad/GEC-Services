import { useState, useRef, useEffect } from "react";
import { UseLogin } from "../hooks/UseLogin";
import "./login.css";
import { UseFormValidator } from "../hooks/UseFormValidator";

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
    const emailRef = useRef();
    const registration_code = useRef();
    const loginRef = useRef();
    const statusRef = useRef();

    // const [targetList, setTargetList] = useState([]);
    // useEffect(() => {
    //     const fetchData = async () => {
    //         try {
    //             const response = await fetch(`${import.meta.env.VITE_SERVERURL}/registration-config`, {
    //                 method: 'GET',
    //             });

    //             if (!response.ok) {
    //                 throw new Error('Failed to fetch');
    //             }

    //             const values = await response.json();
    //             console.log(values);
    //             setTargetList(values);
    //             debugger;

    //         } catch (err) {
    //             console.error('Error fetching data:', err);
    //         }
    //     };

    //     fetchData();
    // }, []);


    const handleLoginSubmit = async () => {
        const values = document.querySelectorAll(".loginvalue");
        const validate = UseFormValidator(values);

        if (!validate) {
            return;
        }

        // const formData = {
        //     [emailRef.current.name]: emailRef.current.value,
        //     [confirmRef.current.name]: confirmRef.current.value,
        // };
        
        // const loginResponse = await UseLogin(formData);

        const data = {
            userAgent: navigator.userAgent,
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
        
        const loginResponseData = await loginResponse.json();
        debugger;
        if(!loginResponseData) {
            statusRef.current.textContent = "An error occurred during login.";
            return;
        }

        if (loginResponseData.status) {
            setWithExpiry("gec-registration", loginResponseData.data, 1000 * 60 * 10); // expires in 10 mins
           

            statusRef.current.textContent = "Login successful, please wait.... ";
            setTimeout(() => {
                window.location.assign(`/registration/${loginResponse.data.page}`);
            }, 500);
        } else {
            statusRef.current.textContent = "Access code or username error...";
        }
    };

    return (
        <div className="login">
            <div>
                <h4>Please login to view this page</h4>
                <form ref={loginRef}>
                    <label className="full">
                        <input
                            defaultValue={"book@mailinator.com"}
                            ref={emailRef}
                            type="email"
                            placeholder="Email"
                            name="email"
                            className="loginvalue"
                        ></input>
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
        </div>
    );
};

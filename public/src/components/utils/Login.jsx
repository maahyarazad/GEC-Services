import { useState, useRef, useCallback } from "react";
import "./login.css";
import { useNavigate, Link } from "react-router-dom";
import GECLogo from "../../assets/background.webp";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
    setEncryptedLocalStorage,
} from "../utils/cookieUtils";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { GoShieldLock } from "react-icons/go";
import GECCard_Back from '../../assets/media/card_back.webp';
import WhatsAppButton from '../utils/WhatsAppButton';
import { useEffect } from "react";
const Login = ({ emailRequired, event }) => {
    const validationSchema = Yup.object({
        // email: emailRequired ? Yup.string().email("Enter a valid email").required("Email is required!") : Yup.string().nullable(), 
        registration_code: Yup.string().required("Login code is required!"),
    });

    const navigate = useNavigate();
    const [showPassword, setShowPassowrd] = useState(false);
    const [currentResponseStatus, setCurrentResponseStatus] = useState(true);
    const [loginResponseData, setLoginResponseData] = useState(null);

    const [mobile_number, setMobile_number] = useState(null);
    const [registration_code, setRegistration_code] = useState(true);
    const [isLogging, setIsLogging] = useState(false);
    const [viewPurchase, setViewPurchase] = useState({useMemberCard: false, showWizard: false});
    

    // const phoneRef = useRef();
    // const registration_code = useRef();
    const loginRef = useRef();
    const statusRef = useRef();
    

    const initialValues = {
        registration_code: "",
    };

    // useEffect(() => {

    //     const gecuser = getCookie("gec-registration");

    //     if (gecuser) {
    //         navigate(`/registration/${gecuser.page}`);
    //     }
    // }, []);


        const getRegistrationConfig = useCallback(async () => {
            try {
                
                // const value = location.pathname;
                const response = await fetch(`${import.meta.env.VITE_SERVERURL}/registration-config/optional-login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        "page": event
                    })
                });
    
                if (!response.ok) {
                     console.error('Failed to fetch optional-login');
                }
    
                const values = await response.json();
                
                if (values) {
                    
                
                    // Maahyar CM: Only one record return from server
                    values.rows.map(async (x) => {
                        
                       
                        if(x.use_member_card === "true"){
                            setViewPurchase(prev => ({...prev, useMemberCard: true}));
                        }
    
                       
    
                    });
    
                }
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                
            }
        },[]);

        useEffect(()=> {
            getRegistrationConfig();
        }, [getRegistrationConfig])

    const handleLoginSubmit = async (values, { setSubmitting, resetForm }) => {
        try {
            setIsLogging(true);
            const data = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                registration_code: values.registration_code,
                event: event
            };

            const formData = new FormData();
            for (const key in data) {
                formData.append(key, data[key]);
            }

            const loginResponse = await fetch(
                `${import.meta.env.VITE_SERVERURL}/registration-config-access`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (loginResponse.status === 429) {
              const errorData = await loginResponse.json();
              statusRef.current.textContent = errorData.error || "Too many attempts, please try again later.";
              setCurrentResponseStatus(false);      // ==> set className
              setIsLogging(false);
              return;
            }
            
            if (loginResponse.status === 401) {
                
              const errorData = await loginResponse.json();
              statusRef.current.textContent = errorData.message || "Unauthorized.";
              setCurrentResponseStatus(false);      // ==> set className
              setIsLogging(false);

                if(viewPurchase.useMemberCard){
                    setViewPurchase(prev => ({...prev, showWizard: true}));
                }

              return;
            }
            
            
            
            if (loginResponse.status === 200) {
                    
                setCurrentResponseStatus(loginResponse.ok);
                
                const response_data = await loginResponse.json();
                setLoginResponseData(loginResponse);
                // setEncryptedCookie("gec-registration", response_data.data[0]);
                // const queryParam = encryptQueryParam(response_data.data[0]);
                setEncryptedLocalStorage("gec-registration", response_data.data[0]);

                statusRef.current.textContent = "Login successful, please wait.... ";

                           
                setTimeout(() => {
                    
                    const params = new URLSearchParams({
                        from: "login",
                        memberId: data.registration_code,
                    }).toString();
                    window.location.assign(`/registration/${response_data.data[0].page}?${params}`);

                }, 50);
            } else {
                statusRef.current.textContent = response_data.message;
            }
        } catch (err) {
            console.error("Login failed:", err);
            if (statusRef.current) {
                setCurrentResponseStatus(false);      // ==> set className
                statusRef.current.textContent = `Login failed: ${err.message}`;
            }
        } finally {
            setIsLogging(false);
        }
    };

    return (
        <div className="login">
            <div>
                <div className="d-flex align-items-center mb-3">
                    <img alt="GEC Logo" src={GECLogo} height={50} style={{ borderRadius: 6 }} />
                    <div className="d-flex flex-column ps-3 w-100" style={{ fontWeight: 300 }}>
                        <div style={{ fontSize: 15, color: "#6b6347", fontWeight: 400 }}>GEC Services</div>
                        <div className="d-flex align-items-center justify-content-between gap-2" style={{ fontSize: 12, color: "#6b6347", fontWeight: 300 }}>
                            Member Portal
                            <Link to="/admin" style={{ color: "#1976d2", fontWeight: 300, fontSize: 12 }}>Admin Portal</Link>
                        </div>
                    </div>
                </div>
                {emailRequired ? (
                <h4>
                    Please check the back of your member card for the Card ID number to proceed further.
                </h4>
                ) : (
                    <h4>Welcome back! Please log in to continue.</h4>
                )}
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
                           
                            {emailRequired && (
                                <>
                                <img src={GECCard_Back} alt="GEC-Member-Card" className="gec-member-card"/>
                                    {/* <Field
                                        onChange={(e) => {
                                            setFieldValue('email', e.target.value)
                                        }}
                                        name="email"
                                        type="email"
                                        placeholder="Email"
                                        className={`form-control ${errors.email && touched.email ? 'is-invalid' : ''}`}
                                    />
                                    <div>
                                        <ErrorMessage
                                            name="email"
                                            component="div"
                                            className="text-danger small"
                                        />
                                    </div> */}
                                </>
                            )}
                            <div className="full position-relative">
                                <Field
                                    onChange={(e) => {
                                        setFieldValue("registration_code", e.target.value);
                                        setRegistration_code(e.target.value);
                                    }}
                                    name="registration_code"
                                    type={showPassword ? "text" : "password"}
                                    // placeholder={showPassword ? 'Enter password' : '••••••••'}
                                    placeholder={emailRequired ? "Use your member card number to login" : "Use your code to login"}
                                    className={`form-control ${errors.registration_code && touched.registration_code
                                            ? "is-invalid"
                                            : ""
                                        }`}
                                    style={{
                                        paddingRight: "2.5rem",
                                        backgroundImage: "none", // Removes the SVG icon
                                        backgroundRepeat: "no-repeat",
                                        backgroundPosition:
                                            "right calc(0.375em + 0.1875rem) center",
                                        backgroundSize: "0 0", // Forces it to be invisible
                                    }}
                                />
                                <span
                                    onClick={() => setShowPassowrd((prev) => !prev)}
                                    style={{
                                        position: "absolute",
                                        top: "50%",
                                        right: "10px",
                                        transform: "translateY(-50%)",
                                        cursor: "pointer",
                                        color: "#6c757d",
                                    }}
                                >
                                    {showPassword ? (
                                        <AiFillEyeInvisible size={20} />
                                    ) : (
                                        <AiFillEye size={20} />
                                    )}
                                </span>
                            </div>

                            <div className="cta-zone d-flex justify-content-between align-items-center">
                                <div>
                                    <ErrorMessage
                                        name="registration_code"
                                        component="div"
                                        className="text-danger small"
                                    />
                                </div>
                                <Button
                                    className="mt-1"
                                    type="submit"
                                    variant={`${viewPurchase.showWizard ? "outlined" : "contained"}`}
                                    disabled={isSubmitting}
                                    style={{ textTransform: "none", width: "100%" }}
                                    startIcon={
                                        isLogging ? (
                                            <CircularProgress size={20} color="inherit" />
                                        ) : (
                                            <GoShieldLock size={20} color={`${viewPurchase.showWizard ? "" : "white"}`} />
                                        )
                                    }
                                >
                                    {isLogging ? "" : "Login"}
                                </Button>
                            </div>
                        </Form>
                    )}
                </Formik>
                    
                
                <p
                    
                    ref={statusRef}
                    className={`mt-1 ${currentResponseStatus ? "" : "text-danger"} fw-normal fade-in ${currentResponseStatus ? "" : "visible"}`}
                    dangerouslySetInnerHTML={{ __html: statusRef.current?.textContent || "" }}
                    ></p>

                    <div className={`fade-in ${viewPurchase.showWizard ? "visible" : ""}`} style={{height: `${viewPurchase.showWizard ? "auto" : 0}`}}>
                            <Button
                                        className="mt-1 "
                                onClick={()=> navigate("/purchase-membership")}
                                variant="contained"
                                style={{ textTransform: "none", width: "100%" }}
                            >
                                Purchase
                            </Button>
                            </div>

            </div>
            <WhatsAppButton/>
        </div>
    );
};

export default Login;

// React & Hooks
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

// Third-Party Libraries
import { Formik, Form, Field, ErrorMessage } from "formik";
import { Button, Box, TextField, InputAdornment, MenuItem } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";

// Icons
import { FaWhatsapp } from "react-icons/fa6";
import { MdEmail, MdDriveFileRenameOutline } from "react-icons/md";
import { LuBriefcaseBusiness } from "react-icons/lu";
import { BsGenderAmbiguous } from "react-icons/bs";
import { IoClose, IoCloseCircleOutline } from "react-icons/io5";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { FaPhoneAlt } from "react-icons/fa";

// Utils & Helpers
import { Login } from "../utils/Login";
import {
    getEncryptedLocalStorage,
    removeEncryptedLocalStorage,
} from "../utils/cookieUtils";
import SimpleSnackbar from "../utils/Snackbar";
import OtpTimer from "../utils/OtpTimer";
import OtpInput from "../utils/OtpInput";
import CountDownComponent from "../utils/TenDayCountdown";

// Forms & Validation
import { getValidationSchema } from "./dynamicValidation";
import { SurveyTemplateForm } from "./SurveyTemplateForm";
import { initialValues } from "./InitialValues";
import GICRegistrationForm from "./GICRegistrationForm";

// Styles
import "./templateform.css";
import BirthdayField from "../utils/BirthdayField";
import { CustomDateTimePicker } from "../utils/CustomDateTimePicker";
import GECBackground from "../../assets/media/GECBackground.webp";
import StarsField from "../../assets/media/stars-field.webm";
import WhatsAppButton from "../utils/WhatsappButton";
import GECLogo from "../../assets/media/20-Jahre.webp";
import { IoMdArrowRoundBack } from "react-icons/io";
// const AutofillPhoneAndWhatsapp = ({ mobileNumber }) => {
//     const { setFieldValue } = useFormikContext();

//     useEffect(() => {
//         if (mobileNumber) {
//             setFieldValue("phone", mobileNumber);
//             setFieldValue("whatsapp", mobileNumber);
//         }
//     }, [mobileNumber, setFieldValue]);

//     return null;
// };



export const TemplateForm = () => {
    //OTP
    const { event } = useParams();
    const location = useLocation();
    const [showOtpInput, setShowOtpInput] = useState(false);
    const otpRef = useRef();
    const statusRef = useRef();
    const email_ref = useRef(null);
    const timeoutRef = useRef(null);
    const registrationHeader = useRef(null);
    const [currentResponseStatus, setCurrentResponseStatus] = useState(null);
    const [currentResponseMessage, setCurrentResponseMessage] = useState("");
    const [phoneRegistered, setPhoneRegistered] = useState(false);
    const [validOtp, setValidOtp] = useState(null);
    const [exapndedDescriptionMobileView, setExapndedDescriptionMobileView] = useState(false);
    const [global_whatsapp, setGlobalWhatsapp] = useState("");
    const [showDivFirst, setShowDivFirst] = useState(false);
    const [isLoading, setLoading] = useState(true);
    const [emailRequired, setEmailRequired] = useState(false);
    const [chosenCurrency, setChosenCurrency] = useState(null);
    const [initialCurrency, setInitialCurrency] = useState(null);
    const [initialTargetFee, setInitialTargetFee] = useState(null);
    const [rates, setRates] = useState(null);
    const [target, setTarget] = useState(null);
    const navigate = useNavigate();


    const params = new URLSearchParams(location.search);
    
    const from = params.get("from");
    const login_email = params.get("email");
    const login_memberId = params.get("memberId");
    const tax = 0.05;


    // http://localhost:5175/registration/october-party/success?reference=ordexc-PI-gec-op-17567159285689843&checkout=1842050180199175015

    const fetchCurrencyData = useCallback(async (currency) => {
        try {
            
            
            
            // const response = await fetch(`https://open.er-api.com/v6/latest/${currency}`, {
            //     method: 'GET',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            // });


            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/latest/${currency}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch');
            }

            const values = await response.json();
            
            if (values) {
                setRates(values.rates);

            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            
        }
    },[]);


    const serverAPICall = useCallback(async () => {
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
                throw new Error('Failed to fetch');
            }

            const values = await response.json();
            
            if (values) {
                                        debugger;
                // Maahyar CM: Only one record return from server
                values.rows.map(async (x) => {
                    
                    if(x.archived === 1){
                        navigate("/404")
                    }
                    

                    if(x.use_member_card === "true"){
                        setEmailRequired(true);
                    }

                    if (x.loginRequired === "false") {

                        // setPhoneRegistered(true);
                        
                        setTarget(values.rows[0]);
                        setLoading(false);
                        
                    }
                    
                    if(x.paymentRequired === "true"){
                        
                        setInitialTargetFee(values.rows[0].recordFee === "AED" ? (Number(values.rows[0].recordFee * 1.05)) :values.rows[0].recordFee)
                        setInitialCurrency(values.rows[0].currency)
                        setChosenCurrency(values.rows[0].currency)
                        // await fetchCurrencyData(values.rows[0].currency);

                    }

                    if (x.surveyForm === "true") {
                        setPhoneRegistered(true);
                    }

                    if (x.gic === "true") {
                        setPhoneRegistered(true);
                    }

                });

            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            
        }
    },[]);

    

    useEffect(() => {
        const init = async () => {
            const gecuser = getEncryptedLocalStorage("gec-registration");
            await serverAPICall();
            const url = window.location.pathname; // e.g., "/users/123"
            const parts = url.split("/").filter(Boolean); // ["users", "123"]
            const lastPart = parts[parts.length - 1];

            
            if (gecuser?.page === lastPart) {
                setTarget(gecuser);
                setLoading(false);
            }

            setLoading(false);
        };

        init();
    }, []);
    
    

    const handleSendOtp = async (values) => {
        try {
            
            setShowOtpInput(true);
            const formData = new FormData();

            for (const key in values) {
                if (key === "whatsapp") formData.append(key, values[key]);
            }

            formData.append("event", target.title);

            const otp_response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/send-otp`,
                {
                    method: "POST",
                    body: formData,
                    credentials: "include",
                }
            );

            if(otp_response.status === 429){
                
                const response_data = await otp_response.json();
                statusRef.current.innerText = response_data.error;
                setCurrentResponseMessage(false);
                statusRef.current.classList.add("text-danger");
                return;
            }
            
            if (otp_response.ok) {
                otpRef?.current?.clear();
                statusRef.current.classList.remove("text-danger");
                setGlobalWhatsapp(values["email"]);
                setCurrentResponseStatus(otp_response.ok);
                setValidOtp(true);

                statusRef.current.innerText = "OTP sent to " + values.email;

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
                registration_code: target.registration_code,
                mobile_number: global_whatsapp,
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

                setPhoneRegistered(true);
                setShowOtpInput(false);
                registrationHeader.current?.scrollIntoView({behavior:'smooth'});
                otpRef?.current?.blurAll();
                registrationHeader.current?.focus();
                snackbarRef.current?.openSnackbar(otp_response_data.message, "success");
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


    const [showSubmit, setShowSubmit] = useState(false);
    const [selectedDate, setSelectedDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [source, setIsSource] = useState(null);

    const snackbarRef = useRef();
    const fileInputRef = useRef();
    const identityConsentRef = useRef();




    const convertCurrency = (amount, source, target) => {
      if (source === target) return amount; // no conversion needed
    
      if (!rates[source] || !rates[target]) {
        throw new Error(`Missing rate for ${source} or ${target}`);
      }
    
      return Math.round(amount * (rates[target] / rates[source]));
      
    }

    // Cookie
    // useEffect(() => {
    //     const gecuser = getCookie("gec-registration");
    //     if (gecuser) {
    //         setTarget(gecuser);
    //     }
    // }, []);

    // Query Param
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
       const source = params.get('source')
        if(source){
            setIsSource(source);
        }

    }, []);


    const navigateToSource = () => {
        window.location.assign(source);
    };

    const clearLocalStorage = () => {
        removeEncryptedLocalStorage("gec-registration");
        navigate(`/`);
    };

    const handleSubmitRegistration = async (
        values,
        { resetForm, setFieldValue }
    ) => {
        try {
            setIsSubmitting(true);

            const { textarea, consent, ...data } = {
                ...values,
                event: target.page,
            };


            data.message = textarea;

            const formData = new FormData();
            for (const key in data) {
                if (key === "fileUpload") continue;
                formData.append(key, data[key]);
            }


            formData.append("registration_code", target.registration_code);
            formData.append("title", target.title);
            formData.append("event_date", target.event_date);

            // file attachment logic goes here
            if (
                target.fileUpload &&
                data.fileUpload &&
                typeof data.fileUpload !== "string"
            ) {
                const renamedFile = new File(
                    [data.fileUpload],
                    `${target.page}__${Date.now()}__${data.fileUpload.name}`,
                    {
                        type: data.fileUpload.type,
                    }
                );

                formData.append("attachment_file", renamedFile);
            }

            // Start Handle SurveyFormLogic   
            const dataObj = Object.fromEntries(formData.entries());
            
            const company_data = Object.fromEntries(
                Object.entries(dataObj).filter(([key]) => key.startsWith("company_"))
            );

            if (target.surveyForm === "true") {

                Object.entries(formData).filter(([key]) => !key.startsWith("company_"));

                formData.append("company_data", JSON.stringify(company_data));
            }

            Object.keys(company_data).forEach((key) => {
                formData.delete(key);
            });
            // End Handle SurveyFormLogic   


            // Start Handle GICFormLogic   
            const gic_data = Object.fromEntries(
                Object.entries(dataObj).filter(([key]) => key.startsWith("gic_"))
            );

            if (target.gic === "true") {

                Object.entries(formData).filter(([key]) => !key.startsWith("gic_"));

                formData.append("gic_data", JSON.stringify(gic_data));
            }

            Object.keys(gic_data).forEach((key) => {
                formData.delete(key);
            });
            // End Handle GICFormLogic   


            const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            if (target.paymentRequired === "true") {
                formData.append("registration_config_id", JSON.stringify(target.id));
                formData.append("recordFee", JSON.stringify(target.recordFee));
                formData.append("currency", JSON.stringify(chosenCurrency));
                const payment_response = await fetch(
                    `${import.meta.env.VITE_SERVERURL}/payment/create-record`,
                    {
                        method: "POST",
                        headers:{
                            "X-User-Timezone": userTimeZone
                        },
                        body: formData,
                    }
                );
                
                if (payment_response.status) {
                    const payment_response_data = await payment_response.json();
                    
                    
                    // Navigate to payment gateway
                    window.location.href = payment_response_data.payment?.result?.redirectUrl;
                } else {
                    registrationHeader.current?.scrollIntoView({behavior:'smooth'});
                    registrationHeader.current?.focus();
                    snackbarRef.current?.openSnackbar(
                        payment_response.error.message,
                        ""
                    );
                }
                
            } else {
                const registration_response = await fetch(
                    `${import.meta.env.VITE_SERVERURL}/registration`,
                    {
                        method: "POST",
                        headers:{
                            "X-User-Timezone": userTimeZone
                        },
                        body: formData,
                    }
                );

                const registration_response_data = await registration_response.json();

                if (registration_response_data.status) {
                    registrationHeader.current?.scrollIntoView({behavior:'smooth'});
                    registrationHeader.current?.focus();
                    snackbarRef.current?.openSnackbar(
                        registration_response_data.message,
                        "success"
                    );
                    resetForm(); // 👈 Reset the form after submission
                    if (target.surveyForm !== "true") {

                        setPhoneRegistered(false);
                    }
                    setValidOtp(false);
                    otpRef?.current?.clear();
                    timeoutRef.current = setTimeout(() => {
                        // document.cookie = "gec-registration=; path=/; max-age=0";
                        clearLocalStorage();
                    }, 10000);

                    // setFieldValue("phone", target.mobile_number);
                    // setFieldValue("whatsapp", target.mobile_number);

                    // Optionally clear file input manually if you're using ref
                    if (fileInputRef?.current && fileInputRef.current.value) {
                        fileInputRef.current.value = "";
                    }

                    if (identityConsentRef?.current && identityConsentRef.current.checked) {
                        identityConsentRef.current.checked = false;
                    }

                    setSelectedDate("");
                } else {
                    
                    snackbarRef.current?.openSnackbar(
                        registration_response_data.message,
                        ""
                    );
                }
            }

        } catch (e) {
            
            snackbarRef.current?.openSnackbar(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    if (isLoading) {
        return (

            <div className="w-100 min-vh-100 d-flex justify-content-center align-items-center flex-column">

                <CircularProgress />
            </div>
        )
    }else{
        
        if (!target) {
            return <Login emailRequired={emailRequired} event={event}/>;
        }else{

            return (
                <>
                    <SimpleSnackbar ref={snackbarRef} />
        
                    <div
                        className="template-form"
                    >
                        <button
                            onClick={() => setExapndedDescriptionMobileView(prev => !prev)}
                            className="cta-button simple"
                        >
                            <IoMdInformationCircleOutline size={20} />
                        </button>
                        <button onClick={source ? navigateToSource : clearLocalStorage} className={`${source ? "source" : "cache"} cta-button simple `}>
                            
                            {source ? (<IoMdArrowRoundBack size={20} />): (<IoCloseCircleOutline size={20} />)}
                        </button>
                        {(() => {
                            const trimmedDescription = (target.description || "").trim();
        
                            // Strip HTML tags and check if there's meaningful content
                            const plainText = trimmedDescription.replace(/<[^>]*>/g, "").trim();
        
                            if (plainText) {
                                return (
        
        
                                    <button
                                        className={`cta-button simple slider-button ${exapndedDescriptionMobileView ? "opened" : ""}`}
                                        onClick={() => setExapndedDescriptionMobileView(prev => !prev)}
                                    >
                                        {exapndedDescriptionMobileView ?
                                            <IoClose size={25} />
                                            :
                                            <></>
                                        }
                                    </button>
                                );
                            }
        
                            return null;
                        })()}
        
                        <div className={showDivFirst ? "active" : ""}>
                            {(() => {
                                const trimmedDescription = (target.description || "").trim();
        
                                // Strip HTML tags and check if there's meaningful content
                                const plainText = trimmedDescription.replace(/<[^>]*>/g, "").trim();
        
                                if (plainText) {
                                    return (
                                        <div
                                            className={`target-description ql-editor ${exapndedDescriptionMobileView ? "expanded" : ""}`}
                                            dangerouslySetInnerHTML={{ __html: trimmedDescription }}
                                        />
        
                                    );
                                }
        
                                return null;
                            })()}
        
                            {(() => {
                                const file = target.Image || "";
                                const extension = file.split(".").pop().toLowerCase();
                                const isVideo = ["mp4", "webm", "ogg"].includes(extension);
                                const fileUrl = `${import.meta.env.VITE_SERVERURL}/uploads/${file}`;
                                
                                if (isVideo) {
                                    return <video src={fileUrl} loop autoPlay muted playsInline 
                                    onError={(e) => {
                                        e.target.onerror = null; // prevent infinite loop
                                        e.target.src = StarsField;
                                    }}
                                    />;
                                } else {
                                    return <img src={fileUrl} alt={target.title} onError={(e) => {
                                        e.target.onerror = null; // prevent infinite loop
                                        e.target.src = GECBackground;
                                    }}/>;
                                }
                            })()}
                        </div>
        
                        <div>
                        <div className={`${target.lockRegistration === "true" ? "locked-template-form" : ""
                            }`}>
                                {target.countDown === "true" && (
                                    <div style={{ position: "relative", paddingBottom: 20 }}>
                                        {/* <CountDownComponent props={{event_date: "2025-07-20T00:00:00Z"}}/> */}
                                        <CountDownComponent props={{ event_date: target.event_date }} />
                                    </div>
                                )}
        <div ref={registrationHeader}></div>
                                <Formik
                                    enableReinitialize={true}
                                    initialValues={{
                                        ...initialValues,
                                        // email: login_email, // set your dynamic value here
                                    }}
                                    validationSchema={getValidationSchema(target)}
                                    onSubmit={async (values, { resetForm, setFieldValue }) => {
                                        await handleSubmitRegistration(values, {
        
                                            resetForm,
                                            setFieldValue,
                                        });
                                    }}
                                >
                                    {({
                                        setFieldValue,
                                        errors,
                                        touched,
                                        values,
                                        validateForm,
                                        setTouched,
                                        setFieldTouched
                                    }) => (
                                        <Form>
        
        
        
        
                                            {/* <Button
                            variant="contained"
                            color="primary"
                            onClick={clearLocalStorage}
                            type="button"
                            style={{
                              pointerEvents: "auto",
                              opacity: 1,
                              width: "100%",
                              textTransform: "none",
                            }}
                          >
                            Clear Cache and Exit
                          </Button> */}
        
                                            {/* Autofill phone and whatsapp fields */}
                                            {/* <AutofillPhoneAndWhatsapp mobileNumber={target.mobile_number} /> */}
                                            <img src={GECLogo} height={70} alt="german-emirates-club"/>
                                            <h1 className="mb-2">{target.title}</h1>
                                            {target.surveyForm === "false" && (
        
                                                     <h4 className="mb-1">
                                                        {target.event_date ? (
                                                            new Date(target.event_date).toLocaleDateString("de-DE", {
                                                            day: "2-digit",
                                                            month: "long",
                                                            year: "numeric",
                                                            weekday: "long",
                                                            })
                                                        ) : ""}
                                                        </h4>
                                            )}
                                            <div className="clearance-flat"></div>
        
                                            {target.gic === "false" && (
                                                <>
                                                    {target.surveyForm === "false" && (
        
                                                        <>
                                                            <div className="full">
                                                                <div className="w-100">
        
                                                                    <div className="input-group">
                                                                        <Field
                                                                        
                                                                            as={TextField}
                                                                            type="email"
                                                                            name="email"
                                                                            // disabled={phoneRegistered}
                                                                            size="small"
                                                                            fullWidth
                                                                            label="E-mail"
                                                                            helperText={<ErrorMessage name="email" />}
                                                                            className="pb-2"
                                                                            error={touched.email && Boolean(errors.email)}
                                                                            InputProps={{
                                                                                startAdornment: (
                                                                                    <InputAdornment position="start">
                                                                                        {target.fieldIcon === "true" && (
        
                                                                                            <MdEmail />
                                                                                        )}
                                                                                    </InputAdornment>
                                                                                ),
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
        
                                                            </div>
        
                                                            <div className="full">
        
                                                                <div className="input-group">
        
                                                                    <Field
                                                                        as={TextField}
        
                                                                        name="phone"
        
                                                                        size="small"
                                                                        fullWidth
                                                                        label="Handynummer"
                                                                        helperText={<ErrorMessage name="phone" />}
                                                                        className="pb-2"
                                                                        error={touched.phone && Boolean(errors.phone)}
                                                                        InputProps={{
                                                                            startAdornment: (
                                                                                <InputAdornment position="start">
                                                                                    {target.fieldIcon === "true" && (
        
                                                                                        <FaPhoneAlt />
                                                                                    )}
                                                                                </InputAdornment>
                                                                            ),
                                                                        }}
                                                                    />
                                                                </div>
        
                                                            </div>
        
                                                            <div className="full">
        
                                                                <div className="input-group">
        
                                                                    <Field
                                                                        as={TextField}
        
                                                                        name="whatsapp"
        
                                                                        size="small"
                                                                        fullWidth
                                                                        label="WhatsApp Number"
                                                                        helperText={<ErrorMessage name="whatsapp" />}
                                                                        className="pb-2"
                                                                        error={touched.whatsapp && Boolean(errors.whatsapp)}
                                                                        InputProps={{
                                                                            startAdornment: (
                                                                                <InputAdornment position="start">
                                                                                    {target.fieldIcon === "true" && (
        
                                                                                        <FaWhatsapp />
                                                                                    )}
                                                                                </InputAdornment>
                                                                            ),
                                                                        }}
                                                                    // We are using email verification
                                                                        disabled={phoneRegistered}
                                                                    />
                                                                </div>
        
                                                            </div>
        
                                                            <div className={`otp-slide ${showOtpInput ? "show" : ""}`}>
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
        
                                                            {!phoneRegistered && (
                                                                <>
                                                               
                                                                <Button
                                                                    variant="contained"
                                                                    color="primary"
                                                                    disabled={validOtp === true}
                                                                    type="button"
                                                                    onClick={async () => {
                                                                        const formErrors = await validateForm(); // validate entire form
        
                                                                        if (formErrors.whatsapp) {
                                                                            setTouched({ whatsapp: true });
                                                                        }
        
                                                                        if (!formErrors.whatsapp && values.whatsapp) {
                                                                            handleSendOtp(values);
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        pointerEvents: "auto",
                                                                        opacity: 1,
                                                                        width: "100%",
                                                                        textTransform: "none",
                                                                    }}
                                                                >
                                                                    
                                                                    <p>OTP gesendet</p>
                                                                </Button>
                                                                <div className="d-flex justify-content-center w-100">
                                                                    <p className="text-center">Bestätigen Sie Ihre E-Mail, bevor Sie Ihre Registrierung absenden.</p>
                                                                </div>
                                                                </>
                                                            )}
        
                                                            <div className="spacer"></div>
        
                                                            <div className="full">
        
                                                                {/* <div className="input-group">
        
        
                                                                    <Field name="gender"
                                                                        as={TextField}
                                                                        select
                                                                        size="small"
        
                                                                        label="Geschlecht"
                                                                        helperText={<ErrorMessage name="gender" />}
                                                                        className="pb-2"
                                                                        error={touched.gender && Boolean(errors.gender)}
                                                                        InputProps={{
                                                                            startAdornment: (
                                                                                <InputAdornment position="start">
                                                                                    {target.fieldIcon === "true" && (
        
                                                                                        <BsGenderAmbiguous />
                                                                                    )}
                                                                                </InputAdornment>
                                                                            ),
                                                                        }}
                                                                        SelectProps={{
                                                                            displayEmpty: true,
                                                                            renderValue: (selected) =>
                                                                                selected && selected.length > 0 ? (
                                                                                    selected
                                                                                ) : (
                                                                                    <span style={{ color: "#9e9e9e", fontSize: "0.8rem" }}>
                                                                                        Select Gender
                                                                                    </span>
                                                                                ),
                                                                        }}
                                                                    >
                                                                        <MenuItem value="Male">Male</MenuItem>
                                                                        <MenuItem value="Female">Female</MenuItem>
                                                                    </Field>
                                                                </div> */}
                                                            </div>
        
                                                            <div className="full">
        
                                                                <div className="input-group">
        
        
                                                                    <Field
                                                                        as={TextField}
                                                                        size="small"
                                                                        fullWidth
                                                                        label="Vorname"
                                                                        helperText={<ErrorMessage name="firstName" />}
                                                                        className="pb-2"
                                                                        type="text"
                                                                        name="firstName"
                                                                        error={touched.firstName && Boolean(errors.firstName)}
                                                                        InputProps={{
                                                                            startAdornment: (
                                                                                <InputAdornment position="start">
                                                                                    {target.fieldIcon === "true" && (
        
                                                                                        <MdDriveFileRenameOutline />
                                                                                    )}
                                                                                </InputAdornment>
                                                                            ),
                                                                        }}
                                                                    />
                                                                </div>
        
                                                            </div>
        
                                                            <div className="full">
        
                                                                <div className="input-group">
                                                                    <Field
                                                                        as={TextField}
                                                                        size="small"
                                                                        fullWidth
                                                                        label="Nachname"
                                                                        helperText={<ErrorMessage name="lastName" />}
                                                                        className="pb-2"
                                                                        type="text"
                                                                        name="lastName"
                                                                        error={touched.lastName && Boolean(errors.lastName)}
                                                                        InputProps={{
                                                                            startAdornment: (
                                                                                <InputAdornment position="start">
                                                                                    {target.fieldIcon === "true" && (
        
                                                                                        <MdDriveFileRenameOutline />
                                                                                    )}
                                                                                </InputAdornment>
                                                                            ),
                                                                        }}
                                                                    />
                                                                </div>
        
                                                            </div>
                                                        </>
                                                    )}
                                                    {target.birthdayRequired === "true" && (
                                                        <div className="full">
        
                                                            <div className="input-group">
                                                                
                                                                
        
                                                                <BirthdayField errors={errors} setFieldValue={setFieldValue} values={values} touched={touched} setFieldTouched={setFieldTouched}/>
                                                                
                                                            </div>
        
                                                        </div>
                                                    )}
        
                                                    {target.companyRequired === "true" && (
                                                        <div className="full">
        
                                                            <div className="input-group">
        
                                                                <Field
                                                                    as={TextField}
                                                                    size="small"
                                                                    fullWidth
                                                                    label="Firmenname"
                                                                    helperText={<ErrorMessage name="companyName" />}
                                                                    className="pb-2"
                                                                    type="text"
                                                                    name="companyName"
                                                                    error={touched.companyName && Boolean(errors.companyName)}
                                                                    InputProps={{
                                                                        startAdornment: (
                                                                            <InputAdornment position="start">
                                                                                {target.fieldIcon === "true" && (
        
                                                                                    <LuBriefcaseBusiness />
                                                                                )}
                                                                            </InputAdornment>
                                                                        ),
                                                                    }}
                                                                />
                                                            </div>
        
                                                        </div>
                                                    )}
        
                                                    {target.textarea === "true" && (
                                                        <div className="full">
        
                                                            <div className="input-group">
                                                                <Field
                                                                    as={TextField}
                                                                    size="small"
                                                                    fullWidth
                                                                    label="Nachricht"
                                                                    helperText={<ErrorMessage name="textarea" />}
                                                                    className="pb-2"
                                                                    type="text"
                                                                    name="textarea"
                                                                    multiline
                                                                    minRows={4} // adjust the number of visible rows
                                                                    error={touched.textarea && Boolean(errors.textarea)}
                                                                    InputProps={{
                                                                        startAdornment: (
                                                                            <InputAdornment position="start">
                                                                                {target.fieldIcon === "true" && <LuBriefcaseBusiness />}
                                                                            </InputAdornment>
                                                                        ),
                                                                    }}
                                                                />
                                                            </div>
        
                                                        </div>
                                                    )}
        
                                                    {target.fileUpload === "true" && (
                                                        <div className="full">
                                                            <div className="clearance"></div>
                                                            <label className="full" htmlFor="fileUpload">
                                                                <p>
                                                                    Please attach any documentation to support your
                                                                    application.
                                                                </p>
                                                            </label>
                                                            <input
                                                                ref={fileInputRef}
                                                                id="fileUpload"
                                                                name="fileUpload"
                                                                type="file"
                                                                accept=".pdf, .doc, .docx, .ppt, .pptx, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                                                className={`form-control ${errors.fileUpload && touched.fileUpload
                                                                    ? "is-invalid"
                                                                    : ""
                                                                    }`}
                                                                onChange={(e) => {
                                                                    const file = e.currentTarget.files[0];
                                                                    if (file) {
                                                                        setFieldValue("fileUpload", file);
                                                                    }
                                                                }}
                                                            />
        
                                                            <ErrorMessage
                                                                name="fileUpload"
                                                                component="div"
                                                                className="invalid-feedback small"
                                                            />
                                                        </div>
                                                    )}
        
                                                    {target.IdentityConsent === "true" && (
                                                        <div className="full">
                                                            <label htmlFor="consent">
                                                                Ich bestätige, dass ich einen gültigen Identitätsnachweis besitze und erkläre mich damit einverstanden, diesen am Veranstaltungsort vorzuzeigen.
                                                            </label>
                                                            <Field name="consent">
                                                                {({ field, form }) => (
                                                                    <input
                                                                        ref={identityConsentRef}
                                                                        {...field}
                                                                        type="checkbox"
                                                                        id="consent"
                                                                        className={`form-check-input ${form.errors.consent && form.touched.consent
                                                                            ? "is-invalid"
                                                                            : ""
                                                                            }`}
                                                                        onChange={(e) => {
                                                                            field.onChange(e);
                                                                            setShowSubmit(e.target.checked);
                                                                        }}
                                                                    />
                                                                )}
                                                            </Field>
                                                            <ErrorMessage
                                                                name="consent"
                                                                component="div"
                                                                className="invalid-feedback small"
                                                            />
                                                        </div>
                                                    )}
        
                                                    {target.surveyForm === "true" && (
                                                        <SurveyTemplateForm errors={errors} touched={touched} target={target} />
                                                    )}
                                                </>
                                            )}
        
                                            {target.gic === "true" && (
                                                <GICRegistrationForm errors={errors} touched={touched} target={target} initialValues={initialValues} setFieldValue={setFieldValue} />
                                            )}
        
                                            {target.paymentRequired === "true" &&(
        
                                             <div className="full">
        
                                                <div className="input-group">
        
        {/* {rates !== null && (
        
                                                    <Field
                                                        as={TextField}
                                                        select
                                                        size="small"
                                                        value={chosenCurrency}
                                                        label="Currency"
                                                        sx={{minWidth:127}}
                                                        className="pb-2"
                                                        onChange={(e) => {
                                                            // Currency Switch Logic goes here
                                                            if(e.target.value != initialCurrency){
                                                                    target.recordFee = convertCurrency(initialTargetFee, initialCurrency, e.target.value)
        
                                                                }else{
                                                                    target.recordFee = initialTargetFee;
                                                                    
                                                                }
                                                                
                                                                
                                                                setChosenCurrency(e.target.value);
                                                            }
                                                        }
                                                    >
                                                        <MenuItem value="AED">AED</MenuItem>
                                                        <MenuItem value="EUR">EUR</MenuItem>
                                                        <MenuItem value="USD">USD</MenuItem>
                                                        <MenuItem value="GBP">GBP</MenuItem>
                                                    </Field>
        )} */}
                                                </div>
                                                
                                                
                                            </div>
        )}
        
        
                                                    {target.consultationEnabled === "true" && (
                                                        <CustomDateTimePicker 
                                                        
                                                        errors={errors} 
                                                        touched={touched} 
                                                        target={target} 
                                                        setFieldValue={setFieldValue} 
                                                        values={values} 
                                                        name="metadata_selected_time" 
                                                        setFieldTouched={setFieldTouched}/>
                                                    )}
        
                                            <Box className="d-flex justify-content-end w-100 my-2">
                                                <Button
                                                    onClick={async () => {
        
                                                        const formErrors = await validateForm();
        
                                                        const errorFields = Object.keys(formErrors);
                                                        if (errorFields.length > 0) {
                                                            debugger;
                                                            const firstErrorField = document.querySelector(
                                                                `[name="${errorFields[0]}"]`
                                                            );
        
                                                            if (firstErrorField) {
                                                                firstErrorField.scrollIntoView({ behavior: "smooth", block: "start" });
                                                                // firstErrorField.focus();
                                                            }
        
                                                            return;
                                                        }
                                                    }}
                                                    variant="contained"
                                                    color="primary"
                                                    disabled={!phoneRegistered}
                                                    type="submit"
                                                    style={{
                                                        pointerEvents: "auto",
                                                        opacity: 1,
                                                        width: "100%",
                                                        textTransform: "none",
                                                    }}
                                                >
        
                                                    {(() => {
                                                        if (isSubmitting) {
                                                            return <CircularProgress size={20} color="inherit" />;
                                                        }
        
                                                        if (target.paymentRequired === "true") {
                                                            
                                                            return <span>Bestätigen & Bezahlen {target.currency === "AED" ?  Math.round(target.recordFee *(1+tax)) : Math.round(target.recordFee)} {target.currency}
                                                            {/* {initialCurrency !== chosenCurrency && (
                                                    <small style={{fontSize : '0.8rem'}}> (approximately)</small>
                                                )} */}
                                                            </span>;
                                                        }
        
                                                        return <span>{target.send_button_text}</span>;
                                                    })()}
                                                </Button>
                                            </Box>
                                            <WhatsAppButton data={target}/>
                                        </Form>
                                    )}
                                </Formik>
                            {target.lockRegistration === "true" && (
                                <div className="locked-overlay-message">
                                    Registration has been closed!
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
        
                </>
            );
        }
    }


};

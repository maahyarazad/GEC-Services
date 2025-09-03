// React & Hooks
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

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
    
    const [showOtpInput, setShowOtpInput] = useState(false);
    const otpRef = useRef();
    const statusRef = useRef();
    const timeoutRef = useRef(null);
    const [currentResponseStatus, setCurrentResponseStatus] = useState(null);
    const [currentResponseMessage, setCurrentResponseMessage] = useState("");
    const [phoneRegistered, setPhoneRegistered] = useState(false);
    const [validOtp, setValidOtp] = useState(null);
    const [exapndedDescriptionMobileView, setExapndedDescriptionMobileView] = useState(false);
    const [global_whatsapp, setGlobalWhatsapp] = useState("");
    const [showDivFirst, setShowDivFirst] = useState(false);
    const [isLoading, setLoading] = useState(true);
    
    const [chosenCurrency, setChosenCurrency] = useState(null);
    const [initialCurrency, setInitialCurrency] = useState(null);
    const [initialTargetFee, setInitialTargetFee] = useState(null);
    const [rates, setRates] = useState(null);
    const navigate = useNavigate();

    

    // http://localhost:5175/registration/october-party/success?reference=ordexc-PI-gec-op-17567159285689843&checkout=1842050180199175015

    const fetchCurrencyData = useCallback(async (currency) => {
        try {
            setLoading(true);
            
            
            const response = await fetch(`https://open.er-api.com/v6/latest/${currency}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });


            // const response = await fetch(`/api/v6/latest/${currency}`, {
            //     method: "GET",
            //     headers: {
            //         "Content-Type": "application/json",
            //     },
            // });

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
            setLoading(false);
        }
    },[]);

    const serverAPICall = useCallback(async () => {
        try {
            setLoading(true);
            
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
                values.rows.map(async (x) => {
                    if (x.loginRequired === "false") {
                        
                        setTarget(values.rows[0]);
                        setInitialTargetFee(values.rows[0].recordFee)
                        setInitialCurrency(values.rows[0].currency)
                        setChosenCurrency(values.rows[0].currency)
                        await fetchCurrencyData(values.rows[0].currency);
                    }
                });

            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    },[]);

    

    useEffect(() => {
        serverAPICall();
       

    }, [serverAPICall]);

    const handleSendOtp = async (values) => {
        try {
            setShowOtpInput(true);
            const formData = new FormData();

            for (const key in values) {
                if (key === "email") formData.append(key, values[key]);
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

            
            
            if (otp_response.ok) {
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

    const [target, setTarget] = useState(null);
    const [showSubmit, setShowSubmit] = useState(false);
    const [selectedDate, setSelectedDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const snackbarRef = useRef();
    const fileInputRef = useRef();
    const identityConsentRef = useRef();


    useEffect(() => {
        const gecuser = getEncryptedLocalStorage("gec-registration");
        if (gecuser) {
            if (gecuser.surveyForm === "true") {
                setPhoneRegistered(true);
            }

            if (gecuser.gic === "true") {
                setPhoneRegistered(true);
            }

            setTarget(gecuser);
        }
        setLoading(false);
    }, []);

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
    // useEffect(() => {
    //     const params = new URLSearchParams(window.location.search);
    //     const encrypted = params.get('__d__');
    //     console.log('Encrypted param:', encrypted);

    //     if (encrypted) {
    //     const data = decryptQueryParam(encrypted);
    //     if (data) {
    //         setTarget(data);
    //     }
    //     }
    // }, []);

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

            
            if (target.paymentRequired === "true") {
                formData.append("registration_config_id", JSON.stringify(target.id));
                formData.append("recordFee", JSON.stringify(target.recordFee));
                formData.append("currency", JSON.stringify(chosenCurrency));
                const payment_response = await fetch(
                    `${import.meta.env.VITE_SERVERURL}/payment/create-record`,
                    {
                        method: "POST",
                        body: formData,
                    }
                );
                
                if (payment_response.status) {
                    const payment_response_data = await payment_response.json();
                    // Navigate to payment gateway
                    window.location.href = payment_response_data.payment.result.redirectUrl;
                } else {
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
                        body: formData,
                    }
                );

                const registration_response_data = await registration_response.json();

                if (registration_response_data.status) {
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
    }

    if (!target) {
        return <Login />;
    }

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
                <button onClick={clearLocalStorage} className="cta-button simple">
                    <IoCloseCircleOutline size={20} />
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
                            return <video src={fileUrl} loop autoPlay muted playsInline />;
                        } else {
                            return <img src={fileUrl} alt={target.title} />;
                        }
                    })()}
                </div>

                <div>
                    <div                 className={`${target.lockRegistration === "true" ? "locked-template-form" : ""
                    }`}>
                        {target.countDown === "true" && (
                            <div style={{ position: "relative", paddingBottom: 20 }}>
                                {/* <CountDownComponent props={{event_date: "2025-07-20T00:00:00Z"}}/> */}
                                <CountDownComponent props={{ event_date: target.event_date }} />
                            </div>
                        )}

                        <Formik
                            enableReinitialize={true}
                            initialValues={initialValues}
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

                                    <h1 className="mb-2">{target.title}</h1>
                                    {target.surveyForm === "false" && (

                                        <h4 className="mb-1">
                                            {new Date(target.event_date).toLocaleDateString("en-GB", {
                                                day: "2-digit",
                                                month: "long",
                                                year: "numeric",
                                                weekday: "long",
                                            })}
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
                                                                    disabled={phoneRegistered}
                                                                    size="small"
                                                                    fullWidth
                                                                    label="Email"
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
                                                                label="Phone Number"
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
                                                            // disabled={phoneRegistered}
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
                                                                        loginResponseData={currentResponseStatus}
                                                                        onExpiredChange={handleExpiredChange}
                                                                    />
                                                                )}
                                                            </>
                                                        )}
                                                    </div>

                                                    {!phoneRegistered && (
                                                        <Button
                                                            variant="contained"
                                                            color="primary"
                                                            disabled={validOtp === true}
                                                            type="button"
                                                            onClick={async () => {
                                                                const formErrors = await validateForm(); // validate entire form

                                                                if (formErrors.email) {
                                                                    setTouched({ email: true });
                                                                }

                                                                if (!formErrors.email && values.email) {
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
                                                            <p>Send OTP</p>
                                                        </Button>
                                                    )}

                                                    <div className="spacer"></div>

                                                    <div className="full">

                                                        <div className="input-group">


                                                            <Field name="gender"
                                                                as={TextField}
                                                                select
                                                                size="small"

                                                                label="Gender"
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
                                                        </div>
                                                    </div>

                                                    <div className="full">

                                                        <div className="input-group">


                                                            <Field
                                                                as={TextField}
                                                                size="small"
                                                                fullWidth
                                                                label="First Name"
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
                                                                label="Last Name"
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

                                                        <Field
                                                            as={TextField}
                                                            size="small"
                                                            fullWidth
                                                            type="date"
                                                            label="Birthday"
                                                            name="birthday"
                                                            helperText={<ErrorMessage name="birthday" />}
                                                            className="pb-2"
                                                            error={touched.birthday && Boolean(errors.birthday)}
                                                            InputProps={{
                                                                startAdornment: (
                                                                    <InputAdornment position="start">
                                                                        {target.fieldIcon === "true" && <MdCake />} {/* your icon */}
                                                                    </InputAdornment>
                                                                ),
                                                            }}
                                                        />
                                                        {/* <Field
                                                            className={`form-control ${errors.birthday && touched.birthday
                                                                ? "is-invalid"
                                                                : ""
                                                                }`}
                                                            name="birthday"
                                                            type="date"
                                                            value={selectedDate}
                                                            onChange={(e) => {
                                                                setFieldValue("birthday", e.target.value);
                                                                setSelectedDate(e.target.value);
                                                            }}
                                                        /> */}
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
                                                            label="Company Name"
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
                                                            label="Message"
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
                                                        I confirm that I have a valid proof of identification
                                                        and consent to present it at the venue.
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
                                        </div>
                                        
                                        
                                    </div>
)}


                                    <Box className="d-flex justify-content-end w-100 my-2">
                                        <Button
                                            onClick={async () => {

                                                const formErrors = await validateForm();

                                                const errorFields = Object.keys(formErrors);
                                                if (errorFields.length > 0) {

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
                                                    
                                                    return <span>Confirm & Pay {target.recordFee} {chosenCurrency}
                                                    {initialCurrency !== chosenCurrency && (
                                            <small style={{fontSize : '0.8rem'}}> (approximately)</small>
                                        )}
                                                    </span>;
                                                }

                                                return <span>{target.send_button_text}</span>;
                                            })()}
                                        </Button>
                                    </Box>
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
};

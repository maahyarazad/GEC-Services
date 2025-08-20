import { Login } from "../utils/Login";
import "./templateform.css";
import { useEffect, useState } from "react";
import { UseCreateRecord } from "../hooks/UseCreateRecord";
import { Link } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage, useFormikContext } from "formik";
import * as Yup from "yup";
import {
    decryptQueryParam,
    encryptQueryParam,
    getEncryptedLocalStorage,
    removeEncryptedLocalStorage,
} from "../utils/cookieUtils";
import { Switch, Button, Box, Tooltip } from "@mui/material";
import { getValidationSchema } from "./dynamicValidation";
import { FaWhatsapp } from "react-icons/fa6";
import { MdEmail } from "react-icons/md";
import { FaPhoneAlt } from "react-icons/fa";
import { MdOutlineCalendarMonth } from "react-icons/md";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { LuBriefcaseBusiness } from "react-icons/lu";
import { BsGenderAmbiguous } from "react-icons/bs";
import SimpleSnackbar from "../utils/Snackbar";
import { useRef } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import OtpTimer from "../utils/OtpTimer";
import OtpInput from "../utils/OtpInput";
import CountDownComponent from "../utils/TenDayCountdown";
import { BiWorld } from "react-icons/bi";
import { FaMobileAlt } from "react-icons/fa";
import { VscOrganization } from "react-icons/vsc";
import { LiaIndustrySolid } from "react-icons/lia";
import Misc from "../../assets/misc.json";

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
    const [showOtpInput, setShowOtpInput] = useState(false);
    const otpRef = useRef();
    const statusRef = useRef();
    const timeoutRef = useRef(null);
    const [currentResponseStatus, setCurrentResponseStatus] = useState(null);
    const [currentResponseMessage, setCurrentResponseMessage] = useState("");
    const [phoneRegistered, setPhoneRegistered] = useState(false);
    const [validOtp, setValidOtp] = useState(null);
    const [global_whatsapp, setGlobalWhatsapp] = useState("");
    const [showDivFirst, setShowDivFirst] = useState(false);
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
            }
        } catch (err) {
            console.error("Login failed:", err);
            if (statusRef.current) {
                statusRef.current.textContent = `Login failed: ${err.message}`;
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

    const initialValues = {
        email: "",
        phone: "",
        whatsapp: "",
        gender: "male",
        firstName: "",
        lastName: "",
        companyName: "",
        birthday: "",
        textarea: "",
        fileUpload: null,
        consent: false,
        company_partnerBrand:"",
        company_partnerName:"",
        company_cityCountry:"",
        company_phone:"",
        company_mobile:"",
        company_email:"",
        company_website:"",
        company_employeeCount:"",
        company_industry:"",
        company_ceoOwnerGm:"",
        company_ceoOwnerGm_contactNumber:"",
        company_ceoOwnerGm_email:"",
        company_hrHead:"",
        company_hrHead_contactNumber:"",
        company_hrHead_email:"",
        company_accountingHead:"",
        company_accountingHead_contactNumber:"",
        company_accountingHead_email:"",
        company_marketingHead:"",
        company_marketingHead_contactNumber:"",
        company_marketingHead_email:"",
        company_pa:"",
        company_pa_contactNumber:"",
        company_pa_email:"",
    };

    useEffect(() => {
        const gecuser = getEncryptedLocalStorage("gec-registration");
        if (gecuser) {
            setTarget(gecuser);
        }
    }, []);

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
        window.location.assign(`/registration`);
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

            const companyData = {
                company_partnerBrand: values.company_partnerBrand,
                company_partnerName: values.company_partnerName,
                company_cityCountry: values.company_cityCountry,
                company_phone: values.company_phone,
                company_mobile: values.company_mobile,
                company_email: values.company_email,
                company_website: values.company_website,
                company_employeeCount: values.company_employeeCount,
                company_industry: values.company_industry,

                company_ceoOwnerGm: values.company_ceoOwnerGm,
                company_ceoOwnerGm_contactNumber: values.company_ceoOwnerGm_contactNumber,
                company_ceoOwnerGm_email: values.company_ceoOwnerGm_email,

                company_hrHead: values.company_hrHead,
                company_hrHead_contactNumber: values.company_hrHead_contactNumber,
                company_hrHead_email: values.company_hrHead_email,

                company_accountingHead: values.company_accountingHead,
                company_accountingHead_contactNumber: values.company_accountingHead_contactNumber,
                company_accountingHead_email: values.company_accountingHead_email,

                company_marketingHead: values.company_marketingHead,
                company_marketingHead_contactNumber: values.company_marketingHead_contactNumber,
                company_marketingHead_email: values.company_marketingHead_email,

                company_pa: values.company_pa,
                company_pa_contactNumber: values.company_pa_contactNumber,
                company_pa_email: values.company_pa_email,
            };


            Object.keys(companyData).forEach((key) => {
                formData.delete(key); // remove if present
            });

            if (target.surveyForm) {
                // Pick out only the company-related fields from values

                // Append JSON string to FormData
                formData.append("company_data", JSON.stringify(companyData));
            }

            const registration_response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/registration`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            const registration_response_data = await registration_response.json();
            debugger;
            if (registration_response_data.status) {
                snackbarRef.current?.openSnackbar(
                    registration_response_data.message,
                    "success"
                );
                resetForm(); // 👈 Reset the form after submission
                setPhoneRegistered(false);
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

    if (!target) {
        return <Login />;
    }

    return (
        <>
            <SimpleSnackbar ref={snackbarRef} />

            <div
                className={`template-form ${target.lockRegistration === "true" ? "locked-template-form" : ""
                    }`}
            >
                <button
                    onClick={() => setShowDivFirst((prev) => !prev)}
                    className="cta-button simple"
                >
                    <img src="/info.svg"></img>
                </button>
                <button onClick={clearLocalStorage} className="cta-button simple">
                    <img src="/close-info.svg"></img>
                </button>
                <div className={showDivFirst ? "active" : ""}>
                    {(() => {
                        const trimmedDescription = (target.description || "").trim();

                        // Strip HTML tags and check if there's meaningful content
                        const plainText = trimmedDescription.replace(/<[^>]*>/g, "").trim();

                        if (plainText) {
                            return (
                                <div
                                    className="target-description ql-editor"
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
                    <div>
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

                                    <div className="full">
                                        <div className="w-100">
                                            <label>
                                                <p>Email</p>
                                            </label>
                                            <div className="input-group">
                                                {target.fieldIcon === "true" && (
                                                    <span className="input-group-text">
                                                        <MdEmail />
                                                    </span>
                                                )}

                                                <Field
                                                    className={`form-control ${errors.email && touched.email ? "is-invalid" : ""
                                                        }`}
                                                    type="email"
                                                    name="email"
                                                    disabled={phoneRegistered}
                                                />
                                            </div>
                                        </div>
                                        <ErrorMessage
                                            name="email"
                                            component="div"
                                            className="text-danger small"
                                        />
                                    </div>

                                    <div className="full">
                                        <label>
                                            <p>Phone Number</p>
                                        </label>
                                        <div className="input-group">
                                            {target.fieldIcon === "true" && (
                                                <span className="input-group-text">
                                                    <FaPhoneAlt />
                                                </span>
                                            )}
                                            <Field
                                                className={`form-control ${errors.phone && touched.phone ? "is-invalid" : ""
                                                    }`}
                                                type="tel"
                                                name="phone"
                                                disabled={false}
                                            />
                                        </div>
                                        <ErrorMessage
                                            name="phone"
                                            component="div"
                                            className="text-danger small"
                                        />
                                    </div>

                                    <div className="full">
                                        <label>
                                            <p>Whatsapp Number</p>
                                        </label>
                                        <div className="input-group">
                                            {target.fieldIcon === "true" && (
                                                <span className="input-group-text">
                                                    <FaWhatsapp />
                                                </span>
                                            )}
                                            <Field
                                                className={`form-control ${errors.whatsapp && touched.whatsapp
                                                    ? "is-invalid"
                                                    : ""
                                                    }`}
                                                type="tel"
                                                name="whatsapp"
                                                // We are using email verification
                                                // disabled={phoneRegistered}
                                            />
                                        </div>
                                        <ErrorMessage
                                            name="whatsapp"
                                            component="div"
                                            className="text-danger small"
                                        />
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

                                    {!target.surveyForm  &&!phoneRegistered  && (
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
                                        <label>
                                            <p>Gender</p>
                                        </label>
                                        <div className="input-group">
                                            {target.fieldIcon === "true" && (
                                                <span className="input-group-text">
                                                    <BsGenderAmbiguous />
                                                </span>
                                            )}

                                            <Field as="select" name="gender">
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                            </Field>
                                        </div>
                                    </div>

                                    <div className="full">
                                        <label>
                                            <p>First Name</p>
                                        </label>
                                        <div className="input-group">
                                            {target.fieldIcon === "true" && (
                                                <span className="input-group-text">
                                                    <MdDriveFileRenameOutline />
                                                </span>
                                            )}

                                            <Field
                                                className={`form-control ${errors.firstName && touched.firstName
                                                    ? "is-invalid"
                                                    : ""
                                                    }`}
                                                type="text"
                                                name="firstName"
                                            />
                                        </div>
                                        <ErrorMessage
                                            name="firstName"
                                            component="div"
                                            className="text-danger small"
                                        />
                                    </div>

                                    <div className="full">
                                        <label>
                                            <p>Last Name</p>
                                        </label>
                                        <div className="input-group">
                                            {target.fieldIcon === "true" && (
                                                <span className="input-group-text">
                                                    <MdDriveFileRenameOutline />
                                                </span>
                                            )}

                                            <Field
                                                className={`form-control ${errors.lastName && touched.lastName
                                                    ? "is-invalid"
                                                    : ""
                                                    }`}
                                                type="text"
                                                name="lastName"
                                            />
                                        </div>
                                        <ErrorMessage
                                            name="lastName"
                                            component="div"
                                            className="text-danger small"
                                        />
                                    </div>

                                    {target.birthdayRequired === "true" && (
                                        <div className="full">
                                            <label>
                                                <p>Birthday</p>
                                            </label>
                                            <div className="input-group">
                                                <span className="input-group-text">
                                                    <MdOutlineCalendarMonth />
                                                </span>
                                                <Field
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
                                                />
                                            </div>
                                            <ErrorMessage
                                                name="birthday"
                                                component="div"
                                                className="text-danger small"
                                            />
                                        </div>
                                    )}

                                    {target.companyRequired === "true" && (
                                        <div className="full">
                                            <label>
                                                <p>Company Name</p>
                                            </label>
                                            <div className="input-group">
                                                {target.fieldIcon === "true" && (
                                                    <span className="input-group-text">
                                                        <LuBriefcaseBusiness />
                                                    </span>
                                                )}
                                                <Field
                                                    className={`form-control ${errors.companyName && touched.companyName
                                                        ? "is-invalid"
                                                        : ""
                                                        }`}
                                                    type="text"
                                                    name="companyName"
                                                />
                                            </div>
                                            <ErrorMessage
                                                name="companyName"
                                                component="div"
                                                className="text-danger small"
                                            />
                                        </div>
                                    )}

                                    {target.textarea === "true" && (
                                        <div className="full">
                                            <label htmlFor="textarea">
                                                <p>Message</p>
                                            </label>
                                            <div className="input-group">
                                                <Field
                                                    as="textarea"
                                                    rows={4}
                                                    className={`form-control ${errors.textarea && touched.textarea
                                                        ? "is-invalid"
                                                        : ""
                                                        }`}
                                                    name="textarea"
                                                />
                                            </div>
                                            <ErrorMessage
                                                name="textarea"
                                                component="div"
                                                className="text-danger small"
                                            />
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
                                        <div className="full">
                                            <h2 className="py-3">Company Information</h2>
                                            {/* <div className="clearance"></div> */}
                                            <label className="full" htmlFor="fileUpload">
                                                <p>
                                                    To ensure our CRM system remains accurate and up to date, we kindly ask you to provide the current contact details for your organization. This information helps the GEC team reach the right person directly when needed – whether it concerns management matters, HR requests, marketing content, or finance and billing.<br /><br />

                                                    The requested data will be used strictly for internal purposes within the German Emirates Club and will not be shared or published externally. If your company is small and does not have separate contacts for certain functions, please select “same as above” rather than leaving fields blank.<br /><br />

                                                    Thank you very much for your support in keeping our records current.<br /><br />

                                                </p>
                                            </label>

                                            {/* Partner Brand */}
                                            <div className="full">
                                                <label>
                                                    <p>Partner Brand</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <LuBriefcaseBusiness />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_partnerBrand && touched.company_partnerBrand
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_partnerBrand"
                                                    />
                                                </div>
                                                <ErrorMessage
                                                    name="company_partnerBrand"
                                                    component="div"
                                                    className="text-danger small"
                                                />
                                            </div>

                                            {/* Partner Name */}
                                            <div className="full">
                                                <label>
                                                    <p>Partner Name</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <MdDriveFileRenameOutline />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_partnerName && touched.company_partnerName
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_partnerName"
                                                    />
                                                </div>
                                                <ErrorMessage
                                                    name="company_partnerName"
                                                    component="div"
                                                    className="text-danger small"
                                                />
                                            </div>

                                            {/* City / Country */}
                                            <div className="full">
                                                <label>
                                                    <p>City / Country</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <BiWorld />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_cityCountry && touched.company_cityCountry
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_cityCountry"
                                                    />
                                                </div>
                                                <ErrorMessage
                                                    name="company_cityCountry"
                                                    component="div"
                                                    className="text-danger small"
                                                />
                                            </div>

                                            {/* Phone */}
                                            <div className="full">
                                                <label>
                                                    <p>Company Phone</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <FaPhoneAlt />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_phone && touched.company_phone ? "is-invalid" : ""
                                                            }`}
                                                        type="text"
                                                        name="company_phone"
                                                    />
                                                </div>
                                                <ErrorMessage
                                                    name="company_phone"
                                                    component="div"
                                                    className="text-danger small"
                                                />
                                            </div>

                                            {/* Mobile */}
                                            <div className="full">
                                                <label>
                                                    <p>Company Mobile</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <FaMobileAlt />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_mobile && touched.company_mobile ? "is-invalid" : ""
                                                            }`}
                                                        type="text"
                                                        name="company_mobile"
                                                    />
                                                </div>
                                                <ErrorMessage
                                                    name="company_mobile"
                                                    component="div"
                                                    className="text-danger small"
                                                />
                                            </div>

                                            {/* Email */}
                                            <div className="full">
                                                <label>
                                                    <p>Company Email</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <MdEmail />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_email && touched.company_email ? "is-invalid" : ""
                                                            }`}
                                                        type="email"
                                                        name="company_email"
                                                    />
                                                </div>
                                                <ErrorMessage
                                                    name="company_email"
                                                    component="div"
                                                    className="text-danger small"
                                                />
                                            </div>

                                            {/* Website */}
                                            <div className="full">
                                                <label>
                                                    <p>Company Website</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <LuBriefcaseBusiness />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_website && touched.company_website ? "is-invalid" : ""
                                                            }`}
                                                        type="url"
                                                        name="company_website"
                                                    />
                                                </div>
                                                <ErrorMessage
                                                    name="company_website"
                                                    component="div"
                                                    className="text-danger small"
                                                />
                                            </div>

                                            {/* Employee Count */}
                                            <div className="full">
                                                <label>
                                                    <p>Employee Count</p>
                                                </label>
                                                <div className="input-group">
                                                     {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <VscOrganization />
                                                        </span>
                                                    )}
                                                    <Field
                                                        as="select"
                                                        className={`form-control ${errors.company_employeeCount && touched.company_employeeCount
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        name="company_employeeCount"
                                                    >
                                                        <option value="">Select...</option>
                                                        <option value="small">Small</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="large">Large</option>
                                                    </Field>
                                                </div>
                                                <ErrorMessage
                                                    name="company_employeeCount"
                                                    component="div"
                                                    className="text-danger small"
                                                />
                                            </div>

                                            {/* Industry */}
                                            <div className="full">
                                                <label>
                                                    <p>Industry</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <LiaIndustrySolid />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_industry && touched.company_industry
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        as="select"
                                                        name="company_industry"
                                                    >
                                                        <option value="">Select...</option>
                                                        {Misc[0].industries.map((item) => (
                                                            <option key={item} value={item}>{item}</option>
                                                        ))}
                                                    </Field>
                                                </div>
                                                <ErrorMessage
                                                    name="company_industry"
                                                    component="div"
                                                    className="text-danger small"
                                                />
                                            </div>

                                            <h2 className="py-3">Contact Information</h2>      
                                                   
                                            {/* CEO/Owner/GM */}
                                            <div className="full border-1 border p-3">
                                                <label>
                                                    <h5>1. Main Contact (Owner / CEO / GM / Country Manager)</h5>
                                                </label>
                                                <label>
                                                    <p>Fullname</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <MdDriveFileRenameOutline />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_ceoOwnerGm && touched.company_ceoOwnerGm
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_ceoOwnerGm"
                                                    />
                                                    
                                                </div>
                                                <ErrorMessage
                                                    name="company_ceoOwnerGm"
                                                    component="div"
                                                    className="text-danger small"
                                                />
                                                
                                                <label>
                                                    <p>Email</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <MdEmail />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_ceoOwnerGm_email && touched.company_ceoOwnerGm_email
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_ceoOwnerGm_email"
                                                    />
                                                    
                                                </div>
                                                <ErrorMessage
                                                    name="company_ceoOwnerGm_email"
                                                    component="div"
                                                    className="text-danger small"
                                                />

                                                            <label>
                                                    <p>Contact Number</p>
                                                </label>
                                                 <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <FaMobileAlt />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_ceoOwnerGm_contactNumber && touched.company_ceoOwnerGm_contactNumber
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_ceoOwnerGm_contactNumber"
                                                    />
                                                    
                                                </div>
                                                <ErrorMessage
                                                    name="company_ceoOwnerGm_contactNumber"
                                                    component="div"
                                                    className="text-danger small"
                                                />

                                            </div>

                                             {/* HR Head */}
                                            <div className="full border-1 border p-3 my-2">
                                                <label>
                                                    <h5>2. HR Contact</h5>
                                                </label>
                                                <label>
                                                    <p>Fullname</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <MdDriveFileRenameOutline />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_hrHead && touched.company_hrHead
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_hrHead"
                                                    />
                                                    
                                                </div>
                                                <ErrorMessage
                                                    name="company_hrHead"
                                                    component="div"
                                                    className="text-danger small"
                                                />
                                                
                                                <label>
                                                    <p>Email</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <MdEmail />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_hrHead_email && touched.company_hrHead_email
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_hrHead_email"
                                                    />
                                                    
                                                </div>
                                                <ErrorMessage
                                                    name="company_hrHead_email"
                                                    component="div"
                                                    className="text-danger small"
                                                />

                                                            <label>
                                                    <p>Contact Number</p>
                                                </label>
                                                 <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <FaMobileAlt />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_hrHead_contactNumber && touched.company_hrHead_contactNumber
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_hrHead_contactNumber"
                                                    />
                                                    
                                                </div>
                                                <ErrorMessage
                                                    name="company_hrHead_contactNumber"
                                                    component="div"
                                                    className="text-danger small"
                                                />

                                            </div>

                                            {/* company_marketingHead */}
                                            <div className="full border-1 border p-3 my-2">
                                                <label>
                                                    <h5>3. Marketing Contact</h5>
                                                </label>
                                                <label>
                                                    <p>Fullname</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <MdDriveFileRenameOutline />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_marketingHead && touched.company_marketingHead
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_marketingHead"
                                                    />
                                                    
                                                </div>
                                                <ErrorMessage
                                                    name="company_marketingHead"
                                                    component="div"
                                                    className="text-danger small"
                                                />
                                                
                                                <label>
                                                    <p>Email</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <MdEmail />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_marketingHead_email && touched.company_marketingHead_email
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_marketingHead_email"
                                                    />
                                                    
                                                </div>
                                                <ErrorMessage
                                                    name="company_marketingHead_email"
                                                    component="div"
                                                    className="text-danger small"
                                                />

                                                            <label>
                                                    <p>Contact Number</p>
                                                </label>
                                                 <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <FaMobileAlt />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_marketingHead_contactNumber && touched.company_marketingHead_contactNumber
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_marketingHead_contactNumber"
                                                    />
                                                    
                                                </div>
                                                <ErrorMessage
                                                    name="company_marketingHead_contactNumber"
                                                    component="div"
                                                    className="text-danger small"
                                                />

                                            </div>


                                            {/* company_accountingHead */}
                                            <div className="full border-1 border p-3 my-2">
                                                <label>
                                                    <h5>4. Accounting / Billing Contact</h5>
                                                </label>
                                                <label>
                                                    <p>Fullname</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <MdDriveFileRenameOutline />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_accountingHead && touched.company_accountingHead
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_accountingHead"
                                                    />
                                                    
                                                </div>
                                                <ErrorMessage
                                                    name="company_accountingHead"
                                                    component="div"
                                                    className="text-danger small"
                                                />
                                                
                                                <label>
                                                    <p>Email</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <MdEmail />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_accountingHead_email && touched.company_accountingHead_email
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_accountingHead_email"
                                                    />
                                                    
                                                </div>
                                                <ErrorMessage
                                                    name="company_accountingHead_email"
                                                    component="div"
                                                    className="text-danger small"
                                                />

                                                            <label>
                                                    <p>Contact Number</p>
                                                </label>
                                                 <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <FaMobileAlt />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_accountingHead_contactNumber && touched.company_accountingHead_contactNumber
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_accountingHead_contactNumber"
                                                    />
                                                    
                                                </div>
                                                <ErrorMessage
                                                    name="company_accountingHead_contactNumber"
                                                    component="div"
                                                    className="text-danger small"
                                                />

                                            </div>


                                           

                                             {/* company_pa */}
                                            <div className="full border-1 border p-3 my-2">
                                                <label>
                                                    <h5>5. PA</h5>
                                                </label>
                                                <label>
                                                    <p>Fullname</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <MdDriveFileRenameOutline />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_pa && touched.company_pa
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_pa"
                                                    />
                                                    
                                                </div>
                                                <ErrorMessage
                                                    name="company_pa"
                                                    component="div"
                                                    className="text-danger small"
                                                />
                                                
                                                <label>
                                                    <p>Email</p>
                                                </label>
                                                <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <MdEmail />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_pa_email && touched.company_marketingHcompany_pa_emailead_email
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_pa_email"
                                                    />
                                                    
                                                </div>
                                                <ErrorMessage
                                                    name="company_pa_email"
                                                    component="div"
                                                    className="text-danger small"
                                                />

                                                            <label>
                                                    <p>Contact Number</p>
                                                </label>
                                                 <div className="input-group">
                                                    {target.fieldIcon === "true" && (
                                                        <span className="input-group-text">
                                                            <FaMobileAlt />
                                                        </span>
                                                    )}
                                                    <Field
                                                        className={`form-control ${errors.company_pa_contactNumber && touched.company_pa_contactNumber
                                                            ? "is-invalid"
                                                            : ""
                                                            }`}
                                                        type="text"
                                                        name="company_pa_contactNumber"
                                                    />
                                                    
                                                </div>
                                                <ErrorMessage
                                                    name="company_pa_contactNumber"
                                                    component="div"
                                                    className="text-danger small"
                                                />

                                            </div>
                                           
                                        </div>


                                    )}



                                    <Box className="d-flex justify-content-end w-100 my-2">
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            disabled={!target.surveyForm && !phoneRegistered}
                                            type="submit"
                                            style={{
                                                pointerEvents: "auto",
                                                opacity: 1,
                                                width: "100%",
                                                textTransform: "none",
                                            }}
                                        >
                                            {isSubmitting ? (
                                                <CircularProgress size={20} color="inherit" />
                                            ) : (
                                                target.send_button_text
                                            )}
                                        </Button>
                                    </Box>
                                </Form>
                            )}
                        </Formik>
                    </div>
                </div>
            </div>

            {target.lockRegistration === "true" && (
                <div className="locked-overlay-message">
                    Registration has been closed!
                </div>
            )}
        </>
    );
};

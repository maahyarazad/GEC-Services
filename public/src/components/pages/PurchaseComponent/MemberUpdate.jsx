import React, { useImperativeHandle, useRef, forwardRef, useState, useCallback } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button, TextField, Card, CardContent, Typography, Grid, Box } from "@mui/material";
import { IoIosSearch } from "react-icons/io";
import CircularProgress from "@mui/material/CircularProgress";
import { useEffect } from "react";
import { useSnackbar } from "../../Providers/Snackbar";
import { useAlertDialog } from '../../Providers/AlertProvider';
import OtpTimer from "../../utils/OtpTimer";
import OtpInput from "../../utils/OtpInput";




const MemberUpdate = forwardRef(({ handleLoginSubmit, isLogging = false, setRegistration_code, onMemberChange, wizardState, setWizardState }, ref) => {
 const formikRef = useRef();

    const timer = useRef(null);
    const [isSearching, setIsSearching] = useState(false);
    const [responseMessage, setResponseMessage] = useState("");
    const [authorized, setAuthorized] = useState(false);


    const validationSchema = Yup.object({
        email: Yup.string()
            .email("Enter a valid email")
            .required("Email is required!"),

        firstname: Yup.string()
            .min(2, "First name must be at least 2 characters")
            .max(50, "First name can't exceed 50 characters")
            .required("First name is required!"),

        lastname: Yup.string()
            .min(2, "Last name must be at least 2 characters")
            .max(50, "Last name can't exceed 50 characters")
            .required("Last name is required!"),

       mobile_number: Yup.string()
            .matches(
        /^\+?\d{1,3}[0-9\-() ]+$/,
        "Mobile number must start with a country code (e.g., 971 or +971) and can contain numbers and symbols like -, (, )"
    )
            .min(10, "Mobile number is too short. It should be at least 10 characters including country code.")
            .max(15, "Mobile number is too long")
            .required("Mobile number is required!"),

    });




    const initialValues = wizardState?.member
        ? {
            email: wizardState.member.email || "",
            firstname: wizardState.member.firstname || "",
            lastname: wizardState.member.lastname || "",
            mobile_number: wizardState.member.mobile_number || "",
            card_number: wizardState.member.card_number || "",
            card_expiry_date: wizardState.member.card_expiry_date || "",
        }
        : {
            email: "",
            firstname: "",
            lastname: "",
            mobile_number: "",
            card_number: "",
            card_expiry_date: "",
        };

    const showMessage = (msg, val) => {
        setResponseMessage(msg);


        if (timer.current) {
            clearTimeout(timer.current);
        }


        timer.current = setTimeout(() => {
            setResponseMessage("");
        }, val);
    };


    useEffect(() => {
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, []);


    const tick = useCallback(() => {
        setWizardState((prev) => ({
            ...prev,
            otpState: {
            ...prev.otpState,
            initialSeconds: prev.otpState.initialSeconds - 1,
            },
        }));
    }, []);


  useEffect(() => {
    console.log(wizardState.member)
    if (!wizardState.otpState) return;
    if (wizardState.otpState?.initialSeconds <= 0) return;
    
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [wizardState.otpState, tick]);
  
    
    const statusRef = useRef();
    const otpRef = useRef();
    const { showSnackbar } = useSnackbar();
    const { openDialog } = useAlertDialog();
    const [secondsLeft, setSecondsLeft] = useState(300);

    useEffect(()=>{
        
        if(wizardState.otpState?.currentResponseMessage !== undefined){

            statusRef.current.innerText = wizardState.otpState?.currentResponseMessage;
            if(wizardState.otpState?.responseMessageStyle===false)  statusRef.current.classList.add("text-danger") ;
            if(wizardState.otpState?.responseMessageStyle===true)  statusRef.current.classList.remove("text-danger") ;
        }
        
    }, [wizardState.otpState])


    const handleSendOtp = async (values) => {
        try {
            

            const formData = new FormData();


            formData.append("origin", "German Emirates Club Membership");
            formData.append("mobile_number", values.mobile_number);

            const otp_response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/send-otp-mobile`,
                {
                    method: "POST",
                    body: formData,
                    credentials: "include",
                }
            );

                      
            setWizardState((prev) => ({ ...prev, otpState:{...prev.otpState, showOtpInput: true} }));
            if (otp_response.status === 429) {

                const response_data = await otp_response.json();
                showSnackbar(response_data.error, "");
                return;

            }

            if (otp_response.ok) {

                otpRef?.current?.clear();
                statusRef.current.classList.remove("text-danger");

                const response_data = await otp_response.json();


 
                setWizardState((prev) => ({ ...prev, 
                    otpState:{...prev.otpState, 
                        currentResponseStatus: true, validOtp: true, currentResponseMessage: `OTP sent to  ${wizardState?.member.mobile_number}`, otp_data: response_data.data,
                        initialSeconds: 300, responseMessageStyle: true
                    } }));
               

            }else{
                

                setWizardState((prev) => ({ ...prev, otpState:{...prev.otpState, currentResponseMessage: otp_response.statusText, responseMessageStyle: false} }));
            }


        } catch (e) {
            
            setWizardState((prev) => ({ ...prev, otpState:{...prev.otpState, currentResponseMessage: e.message, responseMessageStyle: false} }));
            
        }
    };

    const handleExpiredChange = (val) => {
        setValidOtp(false);
    };

    const handlePostOTP = async (value) => {
        try {


            const data = {
                otp: value,
                otp_data: {...wizardState.otpState.otp_data}
            };
            


            const otpResponse = await fetch(
                `${import.meta.env.VITE_SERVERURL}/otp-check-mobile`,
                {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                     body: JSON.stringify(data),
                    credentials: "include",
                }
            );

            if (otpResponse.status === 400 || otpResponse.status === 500) {
                throw new Error(`Server responded with ${otpResponse.status}`);
            }


            
            const otp_response_data = await otpResponse.json();
            
            
            if (!otp_response_data.status) {
                
                setWizardState((prev) => ({ ...prev, 
                    otpState:{...prev.otpState, 
                        currentResponseMessage: `Verification failed: ${otp_response_data?.message?.error}`, responseMessageStyle: false
                    } }));
                return;

            }

            showSnackbar("Verification Successful");

             setWizardState((prev) => ({ ...prev, 
                    otpState:{...prev.otpState, 
                       currentResponseMessage: "Your mobile number has been verified",
                        getMemberPass: true,
                        currentResponseStatus: false,
                        responseMessageStyle: true
                    } }));

            await getMemberPass();



        } catch (err) {

            if (statusRef.current) {

                statusRef.current.textContent = `Verification failed: ${err.message}`;
                statusRef.current.classList.add("text-danger");
            }
        }
    };


   

    const getMemberPass = async () => {

        try {

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/member-pass`, {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
                body: JSON.stringify({
                    ...wizardState.member
                })
            });


            if (!response.ok) {
                throw new Error('Failed to fetch');
            }

            const result = await response.json();
            
            if (result.status) {
                setWizardState((prev) => ({ ...prev, passData: result.data }));
            }

            else {
                showMessage("No account found with this email address", 10000);
            }


        } catch (err) {
            showMessage(err);
            console.error('Error fetching data:', err);
        } finally {
            setIsSearching(false);
        }
    };


    // ✅ Expose methods to parent
    useImperativeHandle(ref, () => ({
        submitForm: () => {
            if (formikRef.current) formikRef.current.handleSubmit();
        },
        resetForm: () => {
            if (formikRef.current) formikRef.current.resetForm();
        },
        getMember: () => {
            wizardState.member;
        },
    }));




    return (
        <div className="w-100 d-flex justify-content-center align-items-center flex-column" >
            <div style={{ width: "100%", maxWidth: 400 }}>

                <Formik
                    innerRef={formikRef}
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={(values, formikHelpers) => handleSendOtp(values)}
                >
                    {({ setFieldValue, errors, touched, isSubmitting }) => (
                        <Form>

                            {/* Email Field */}
                            <Field

                                as={TextField}
                                type="email"
                                name="email"

                                fullWidth
                                label="E-mail"
                                helperText={<ErrorMessage name="email" />}
                                onChange={(e) => {
                                    formikRef.current?.setFieldValue("email", e.target.value);
                                    setWizardState((prev)=> ({...prev, member: {...prev.member, email: e.target.value}}));
                                }}
                                error={touched.email && Boolean(errors.email)}
                            />
                            {/* firstname Field */}
                            <Field
                                className="mt-1"
                                as={TextField}
                                type="text"
                                name="firstname"
                                size="firstname"
                                fullWidth
                                label="First Name"
                                helperText={<ErrorMessage name="firstname" />}
                                onChange={(e) => {
                                    formikRef.current?.setFieldValue("lastname", e.target.value);
                                    setWizardState((prev)=> ({...prev, member: {...prev.member, firstname: e.target.value}}));
                                }}
                                error={touched.firstname && Boolean(errors.firstname)}
                            />
                            {/* lastname Field */}
                            <Field
                                className="mt-1"
                                as={TextField}
                                type="text"
                                name="lastname"

                                fullWidth
                                label="Last Name"
                                helperText={<ErrorMessage name="lastname" />}
                                onChange={(e) => {
                                    formikRef.current?.setFieldValue("lastname", e.target.value);
                                    setWizardState((prev)=> ({...prev, member: {...prev.member, lastname: e.target.value}}));
                                }}
                                error={touched.lastname && Boolean(errors.lastname)}
                            />
                            {/* mobile_number Field */}
                            <Field
                                className="mt-1"
                                as={TextField}
                                type="text"
                                name="mobile_number"

                                fullWidth
                                label="Mobile Number"
                                helperText={<ErrorMessage name="mobile_number" />}
                                onChange={(e) => {
                                    formikRef.current?.setFieldValue("mobile_number", e.target.value);
                                    
                                    setWizardState((prev)=> ({...prev, member: {...prev.member, mobile_number: e.target.value}}));
                                }}
                                error={touched.mobile_number && Boolean(errors.mobile_number)}
                            />


                            {/* Submit Button */}

                            <Button
                                className="mt-1"
                                type="submit"
                                variant="contained"
                                 disabled={wizardState?.otpState?.getMemberPass}
                                style={{ textTransform: "none", width: "100%" }}

                            >
                                <span style={{ minWidth: 60, minHeight: 25 }} className="d-flex justify-content-center align-items-center">

                                    {isSubmitting ? (
                                        <CircularProgress size={20} color="inherit" />
                                    ) : (
                                        <>

                                            Verify Your Phone

                                        </>
                                    )}

                                </span>

                            </Button>

                            <div className={`otp-slide ${wizardState.otpState?.showOtpInput ? "show" : ""} mt-3`}>
                                <div ref={statusRef}></div>

                                {wizardState.otpState?.currentResponseStatus && (
                                    <>
                                        <OtpInput
                                            ref={otpRef}
                                            onComplete={(val) => {
                                                handlePostOTP(val);
                                            }}
                                        />
                                        {wizardState.otpState?.validOtp && (
                                            <OtpTimer
                                                initialSeconds={wizardState.otpState?.initialSeconds}
                                                loginResponseData={wizardState.otpState?.currentResponseStatus}
                                                onExpiredChange={handleExpiredChange}
                                            />
                                        )}
                                    </>
                                )}
                            </div>

                        </Form>
                    )}
                </Formik>
            </div>
            <div
                className={`fade-in ${responseMessage ? "visible" : ""} mt-2 mb-2`}
                style={{

                    minHeight: 50,
                    maxWidth: 300,
                    opacity: responseMessage ? 1 : 0,
                    transition: "opacity 0.5s ease",
                    // color: responseMessage.includes("success") ? "green" : "red",
                    textAlign: "center",
                    marginTop: "0rem",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    overflowWrap: "break-word"
                }}
            >
                {responseMessage}
            </div>



        </div>
    );
});

export default MemberUpdate;

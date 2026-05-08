import { useImperativeHandle, useRef, forwardRef, useState, useCallback, useEffect } from "react";
import { Formik, Form, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useTheme } from '@mui/material';
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import CountrySelect from "./CountryCode";

import { useSnackbar } from "../../Providers/Snackbar";
import { useAlertDialog } from "../../Providers/AlertProvider";

import OtpTimer from "../../utils/OtpTimer";
import OtpInput from "../../utils/OtpInput";
import BirthdayField from "../../utils/BirthdayField";
import { isValidPhoneNumber } from "libphonenumber-js";
import useMediaQuery from '@mui/material/useMediaQuery';
import {
    GEC, 
    FieldLabel,
    fieldSx,
    primaryBtnSx,
    toastAlertSx} from "../../PartnerOnboarding/PartnerOnboardingStyles";

const MemberUpdate = forwardRef(({ handleLoginSubmit, isLogging = false, setRegistration_code, onMemberChange, wizardState, setWizardState, setActiveStep }, ref) => {
    const formikRef = useRef();
    const otpFocus = useRef();
    const countryRef = useRef();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const timer = useRef(null);
    const [isSearching, setIsSearching] = useState(false);
    const [fetchingPasses, setFetchingPasses] = useState(false);
    const [responseMessage, setResponseMessage] = useState("");
    const [authorized, setAuthorized] = useState(false);
    const [libphone, setlibphone] = useState(null);
    const [selectedCountry, setSelectedCountry] = useState(null);


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


        birthday: Yup.date()
            .transform((value, originalValue) => {
                // Handle empty string from date inputs
                return originalValue ? new Date(originalValue) : value;
            })
            .test(
                "not-in-future",
                "Birthday cannot be in the future",
                value => {
                    if (!value) return false; // required will handle the message

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const inputDate = new Date(value);
                    inputDate.setHours(0, 0, 0, 0);

                    return inputDate <= today;
                }
            )
            .required("Birthday is required!")

    });


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
        setWizardState(prev => ({
            ...prev,
            otpState: {
                ...prev.otpState,
                initialSeconds: prev.otpState.initialSeconds - 1,
            },
        }));

    }, [setWizardState]);


    useEffect(() => {
        if (!wizardState.otpState) return;
        if (wizardState.otpState.initialSeconds <= 0) return;

        const interval = setInterval(() => tick(), 1000);
        return () => clearInterval(interval);

    }, [wizardState.otpState?.initialSeconds, tick]);




    const statusRef = useRef();
    const otpRef = useRef();
    const { showSnackbar } = useSnackbar();
    const { openDialog } = useAlertDialog();
    const [secondsLeft, setSecondsLeft] = useState(300);

    useEffect(() => {

        if (wizardState.otpState?.currentResponseMessage !== undefined) {

            statusRef.current.innerText = wizardState.otpState?.currentResponseMessage;
            if (wizardState.otpState?.responseMessageStyle === false) statusRef.current.classList.add("text-danger");
            if (wizardState.otpState?.responseMessageStyle === true) statusRef.current.classList.remove("text-danger");
        }

    }, [wizardState.otpState])

    useEffect(() => {

        if (wizardState?.passData !== null) {

            setWizardState((prev) => ({
                ...prev,
                otpState: {
                    ...prev.otpState,
                    currentResponseMessage: "Your pass is now ready.",
                    getMemberPass: true,
                    currentResponseStatus: false,
                    responseMessageStyle: true
                }
            }));

        }

    }, [wizardState?.passData])


    const handleSendOtp = async (values, setFieldError, setFieldTouched) => {
        try {


            if (!values.countryCallingCode) {
                countryRef.current?.setError("Country code required");
                return;
            }

            const mobile_number = `+${values.countryCallingCode}${values.mobile_number}`;
            const normilized = `${values.countryCallingCode}${values.mobile_number}`;
            const isValid = isValidPhoneNumber(mobile_number);


            if (!isValid) {
                setFieldTouched("mobile_number", true, false);
                setFieldError("mobile_number", "Invalid mobile number");
                return;
            }

            const otp_response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/send-otp-mobile`,
                {
                    headers: { "Content-Type": "application/json" },
                    method: "POST",
                    credentials: "include", // ✅ important for sessions
                    body: JSON.stringify({ origin: "German Emirates Club Membership", mobile_number: normilized }),

                }
            );


            setWizardState((prev) => ({ ...prev, otpState: { ...prev.otpState, showOtpInput: true } }));
            if (otp_response.status === 429) {

                const response_data = await otp_response.json();
                showSnackbar(response_data.error, "error");
                return;

            }

            if (otp_response.ok) {

                otpRef?.current?.clear();
                statusRef.current.classList.remove("text-danger");

                const response_data = await otp_response.json();



                setWizardState((prev) => ({
                    ...prev,
                    otpState: {
                        ...prev.otpState,
                        currentResponseStatus: true, validOtp: true, currentResponseMessage: `OTP sent to  ${mobile_number}`, otp_data: response_data.data,
                        initialSeconds: 300, responseMessageStyle: true
                    }
                }));
                otpFocus?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

            } else {


                setWizardState((prev) => ({ ...prev, otpState: { ...prev.otpState, currentResponseMessage: otp_response.statusText, responseMessageStyle: false } }));
            }


        } catch (e) {

            setWizardState((prev) => ({ ...prev, otpState: { ...prev.otpState, currentResponseMessage: e.message, responseMessageStyle: false } }));

        }
    };

    const handleExpiredChange = (val) => {
        setWizardState((prev) => ({
            ...prev,
            otpState: {
                ...prev.otpState,
                validOtp: false
            }
        }));
    };

    const handlePostOTP = async (value) => {
        try {


            const data = {
                otp: value,
                otp_data: { ...wizardState.otpState.otp_data }
            };



            const otpResponse = await fetch(
                `${import.meta.env.VITE_SERVERURL}/otp-check-mobile`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                    credentials: 'include'
                }
            );


            if (otpResponse.status === 400 || otpResponse.status === 500) {
                throw new Error(`Server responded with ${otpResponse.status}`);
            }


            const otp_response_data = await otpResponse.json();


            if (!otp_response_data.status) {

                setWizardState((prev) => ({
                    ...prev,
                    otpState: {
                        ...prev.otpState,
                        currentResponseMessage: `Verification failed: ${otp_response_data?.message?.error}`, responseMessageStyle: false
                    }
                }));
                return;

            }

            showSnackbar("Verification Successful");
            setFetchingPasses(true);
            await getMemberPass();



        } catch (err) {

            if (statusRef.current) {

                statusRef.current.textContent = `Verification failed: ${err.message}`;
                statusRef.current.classList.add("text-danger");
            }
        } finally {


        }
    };




    const getMemberPass = async () => {

        try {

            wizardState.member.mobile_number = `${wizardState.member.countryCallingCode}${wizardState.member.nationalNumber}`;


            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/member-pass`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
                body: JSON.stringify({
                    member: { ...wizardState.member }
                })
            });


            if (!response.ok) {

                showSnackbar("💬 Oops! Something went wrong. Please contact us.", "error");

            }

            const result = await response.json();

            if (result.status) {

                setWizardState((prev) => ({ ...prev, passData: result.data }));
                setFetchingPasses(false);
                setActiveStep((prev) => prev + 1);
                showSnackbar("Your pass is now ready.", "success");
            }

            else {
                showMessage("No account found with this email address", 10000);
            }


        } catch (err) {

            showMessage(err);
            console.error('Error fetching data:', err);
        } finally {
            setIsSearching(false);
            setFetchingPasses(false);
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



    // Loader
    const [dots, setDots] = useState("");

    useEffect(() => {
        if (!fetchingPasses) return;

        const interval = setInterval(() => {
            setDots((prev) => (prev.length === 4 ? "" : prev + "."));
        }, 300); // change speed if you like

        return () => clearInterval(interval);
    }, [fetchingPasses]);



    return (
          <Box
                   className="w-100 d-flex justify-content-center align-items-center flex-column"
               >
                   {/* ── Title ──────────────────────────────────────────────────── */}
                   <Typography
                       sx={{
                           textAlign: "center",
                           maxWidth: 560,
                           fontSize: isMobile ? 14 : 17,
                           color: GEC.textSecondary,
                           fontFamily: "'Georgia', serif",
                           lineHeight: 1.65,
                           mb: 3,
                       }}
                   >
                       Check your account details
                   </Typography>
       
                   {/* ── Form wrapper ───────────────────────────────────────────── */}
                   <Box
                       className="w-100 d-flex justify-content-center align-items-center flex-column"
                   >
                       <Box sx={{ width: "100%", maxWidth: 420 }}>
                           <Formik
                               innerRef={formikRef}
                               enableReinitialize={true}
                               initialValues={{
                                   email: wizardState.member?.email || "",
                                   firstname: wizardState.member?.firstname || "",
                                   lastname: wizardState.member?.lastname || "",
                                   mobile_number: wizardState.member?.nationalNumber || "",
                                   card_number: wizardState.member?.card_number || "",
                                   card_expiry_date: wizardState.member?.card_expiry_date || "",
                                   birthday: wizardState.member?.birthday || "",
                                   countryCallingCode: wizardState.member?.countryCallingCode || "",
                               }}
                               validationSchema={validationSchema}
                               onSubmit={(values, { setFieldError, setFieldTouched, setSubmitting }) =>
                                   handleSendOtp(values, setFieldError, setFieldTouched, setSubmitting)
                               }
                           >
                               {({ setFieldValue, errors, touched, isSubmitting, values, setFieldTouched }) => (
                                   <Form>
       
                                       {/* ── Email ────────────────────────────────── */}
                                       <Box sx={{ mb: 2, width: '100%' }}>
                                           <FieldLabel>Email Address</FieldLabel>
                                           <TextField
                                               type="email"
                                               name="email"
                                               fullWidth
                                               placeholder="you@example.com"
                                               value={values.email}
                                               disabled={wizardState?.otpState?.getMemberPass}
                                               helperText={<ErrorMessage name="email" />}
                                               error={touched.email && Boolean(errors.email)}
                                               sx={fieldSx}
                                               onChange={(e) => {
                                                   const value = e.target.value;
                                                   setFieldValue("email", value);
                                                   setWizardState((prev) => ({
                                                       ...prev,
                                                       member: { ...prev.member, email: value },
                                                   }));
                                               }}
                                           />
                                       </Box>
       
                                       {/* ── First Name ───────────────────────────── */}
                                       <Box  sx={{mb: 2,width: {xs: "100%",sm: "48.5%"}}}>
                                           <FieldLabel>First Name</FieldLabel>
                                           <TextField
                                               type="text"
                                               name="firstname"
                                               fullWidth
                                               placeholder="First name"
                                               value={values.firstname}
                                               disabled={wizardState?.otpState?.getMemberPass}
                                               helperText={<ErrorMessage name="firstname" />}
                                               error={touched.firstname && Boolean(errors.firstname)}
                                               sx={fieldSx}
                                               onChange={(e) => {
                                                   const value = e.target.value;
                                                   setFieldValue("firstname", value);
                                                   setWizardState((prev) => ({
                                                       ...prev,
                                                       member: { ...prev.member, firstname: value },
                                                   }));
                                               }}
                                           />
                                       </Box>
       
                                       {/* ── Last Name ────────────────────────────── */}
                                       <Box  sx={{mb: 2,width: {xs: "100%",sm: "48.5%"}}}>
                                           <FieldLabel>Last Name</FieldLabel>
                                           <TextField
                                               type="text"
                                               name="lastname"
                                               fullWidth
                                               placeholder="Last name"
                                               value={values.lastname}
                                               disabled={wizardState?.otpState?.getMemberPass}
                                               helperText={<ErrorMessage name="lastname" />}
                                               error={touched.lastname && Boolean(errors.lastname)}
                                               sx={fieldSx}
                                               onChange={(e) => {
                                                   const value = e.target.value;
                                                   setFieldValue("lastname", value);
                                                   setWizardState((prev) => ({
                                                       ...prev,
                                                       member: { ...prev.member, lastname: value },
                                                   }));
                                               }}
                                           />
                                       </Box>
       
                                       {/* ── Country Select ───────────────────────── */}
                                       <Box sx={{ mb: 2, width: '100%' }}>
                                           <FieldLabel>Country</FieldLabel>
                                           <CountrySelect
                                               ref={countryRef}
                                               wizardState={wizardState}
                                               setWizardState={setWizardState}
                                           />
                                       </Box>
       
                                       {/* ── Mobile Number ────────────────────────── */}
                                       <Box sx={{ mb: 2, width: '100%' }}>
                                           <FieldLabel>Mobile Number</FieldLabel>
                                           <TextField
                                               type="text"
                                               name="mobile_number"
                                               fullWidth
                                               placeholder="e.g. 501234567"
                                               value={values.mobile_number}
                                               disabled={wizardState?.otpState?.getMemberPass}
                                               helperText={touched.mobile_number ? errors.mobile_number : ""}
                                               error={touched.mobile_number && Boolean(errors.mobile_number)}
                                               sx={fieldSx}
                                               onChange={(e) => {
                                                   const value = e.target.value;
                                                   setFieldValue("mobile_number", value);
                                                   setWizardState((prev) => ({
                                                       ...prev,
                                                       member: { ...prev.member, nationalNumber: value },
                                                   }));
                                               }}
                                               onBlur={() => setFieldTouched("mobile_number", true)}
                                           />
                                       </Box>
       
                                       {/* ── Birthday ─────────────────────────────── */}
                                       <Box sx={{ mb: 2.5 , width: '100%'}}>
                                           <FieldLabel>Date of Birth</FieldLabel>
                                           <BirthdayField
                                                useGECStyle={true}
                                               errors={errors}
                                               setFieldValue={setFieldValue}
                                               size="medium"
                                               setWizardState={setWizardState}
                                               values={values}
                                               touched={touched}
                                               setFieldTouched={setFieldTouched}
                                           />
                                       </Box>
       
                                       {/* ── Submit Button ────────────────────────── */}
                                       <Button
                                           type="submit"
                                           variant="contained"
                                           fullWidth
                                           disabled={wizardState?.otpState?.getMemberPass}
                                           sx={primaryBtnSx}
                                       >
                                           <Box
                                               sx={{
                                                   minWidth: 60,
                                                   minHeight: 25,
                                                   display: "flex",
                                                   justifyContent: "center",
                                                   alignItems: "center",
                                               }}
                                           >
                                               {isSubmitting ? (
                                                   <CircularProgress size={20} color="inherit" />
                                               ) : (
                                                   "Final Step: Send an SMS OTP"
                                               )}
                                           </Box>
                                       </Button>
       
                                       {/* ── OTP section ──────────────────────────── */}
                                       <Box
                                           className={`otp-slide ${wizardState.otpState?.showOtpInput ? "show" : ""}`}
                                           sx={{
                                               mt: 2,
                                               display: "flex",
                                               flexDirection: "column",
                                               alignItems: "flex-start",
                                               justifyContent: "flex-start",
                                               textAlign: "start",
                                           }}
                                       >
                                           {fetchingPasses && (
                                               <Box
                                                   sx={{
                                                       display: "flex",
                                                       alignItems: "center",
                                                       gap: 1,
                                                       px: 2,
                                                       py: 1,
                                                       mb: 1,
                                                       background: GEC.goldMuted,
                                                       border: `1px solid ${GEC.goldBorder}`,
                                                       borderRadius: 2,
                                                       width: "100%",
                                                   }}
                                               >
                                                   <CircularProgress
                                                       size={14}
                                                       sx={{ color: GEC.gold }}
                                                   />
                                                   <Typography
                                                       sx={{
                                                           fontSize: 13,
                                                           color: GEC.textSecondary,
                                                           whiteSpace: "pre",
                                                           fontStyle: "italic",
                                                       }}
                                                   >
                                                       Generating your pass{dots}
                                                   </Typography>
                                               </Box>
                                           )}
       
                                           <Box ref={statusRef} />
       
                                           {wizardState.otpState?.currentResponseStatus && (
                                               <>
                                                   <OtpInput
                                                       useGECStyle={true}
                                                       ref={otpRef}
                                                       onComplete={(val) => handlePostOTP(val)}
                                                   />
                                                   {wizardState.otpState?.validOtp && (
                                                       <OtpTimer
                                                           key={wizardState.otpState?.initialSeconds}
                                                           initialSeconds={wizardState.otpState?.initialSeconds}
                                                           loginResponseData={wizardState.otpState?.currentResponseStatus}
                                                           onExpiredChange={handleExpiredChange}
                                                       />
                                                   )}
                                               </>
                                           )}
                                       </Box>
       
                                       <Box ref={otpFocus} />
                                   </Form>
                               )}
                           </Formik>
                       </Box>
       
                       {/* ── Response message ───────────────────────────────────── */}
                       <Box
                           sx={{
                               minHeight: 50,
                               maxWidth: 320,
                               opacity: responseMessage ? 1 : 0,
                               transition: "opacity 0.5s ease",
                               textAlign: "center",
                               mt: 2,
                               mb: 2,
                               whiteSpace: "normal",
                               wordBreak: "break-word",
                               overflowWrap: "break-word",
                               ...(responseMessage && {
                                   ...toastAlertSx,
                                   borderRadius: 2,
                                   px: 2,
                                   py: 1,
                               }),
                           }}
                       >
                           {responseMessage}
                       </Box>
                   </Box>
               </Box>
    );
});

export default MemberUpdate;

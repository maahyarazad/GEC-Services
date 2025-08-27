import { useState, useRef, useEffect } from "react";
import { UseLogin } from "../hooks/UseLogin";
import "./login.css";
import { UseFormValidator } from "../hooks/UseFormValidator";
import { useNavigate } from "react-router-dom";
import OtpInput from "../utils/OtpInput";
import CryptoJS from "crypto-js";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  getCookie,
  setEncryptedCookie,
  decryptQueryParam,
  encryptQueryParam,
  setEncryptedLocalStorage,
} from "../utils/cookieUtils";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { GoShieldLock } from "react-icons/go";

const validationSchema = Yup.object({
  // mobile_number: Yup.string()
  //     .matches(/^\+?[0-9]{12,15}$/, 'Enter a valid phone number')
  //     .required('Required'),
  registration_code: Yup.string().required("Login code is required!"),
});

export const Login = () => {
  const [showPassword, setShowPassowrd] = useState(false);
  const [currentResponseStatus, setCurrentResponseStatus] = useState(true);
  const [loginResponseData, setLoginResponseData] = useState(null);

  const [mobile_number, setMobile_number] = useState(null);
  const [registration_code, setRegistration_code] = useState(true);
  const [isLogging, setIsLogging] = useState(false);

  // const phoneRef = useRef();
  // const registration_code = useRef();
  const loginRef = useRef();
  const statusRef = useRef();
  const navigate = useNavigate();

  const initialValues = {
    // mobile_number: '',
    registration_code: "",
  };

  // useEffect(() => {

  //     const gecuser = getCookie("gec-registration");

  //     if (gecuser) {
  //         navigate(`/registration/${gecuser.page}`);
  //     }
  // }, []);

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

      const loginResponse = await fetch(
        `${import.meta.env.VITE_SERVERURL}/registration-config-access`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );
      
      setCurrentResponseStatus(loginResponse.ok);

      const response_data = await loginResponse.json();
      setLoginResponseData(loginResponse);

      if (response_data.status === 401) {
        statusRef.current.textContent = response_data.message;
        return;
      }

      if (response_data.status) {
        console.log(response_data.status);

        // setEncryptedCookie("gec-registration", response_data.data[0]);
        // const queryParam = encryptQueryParam(response_data.data[0]);
        setEncryptedLocalStorage("gec-registration", response_data.data[0]);

        statusRef.current.textContent = "Login successful, please wait.... ";

        setTimeout(() => {
          window.location.assign(`/registration/${response_data.data[0].page}`);
        }, 500);
      } else {
        statusRef.current.textContent = response_data.message;
      }
    } catch (err) {
      console.error("Login failed:", err);
      if (statusRef.current) {
        statusRef.current.textContent = `Login failed: ${err.message}`;
      }
    } finally {
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
              {/* <div className="full">
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
                            </div> */}

              <div className="full position-relative">
                <Field
                  onChange={(e) => {
                    setFieldValue("registration_code", e.target.value);
                    setRegistration_code(e.target.value);
                  }}
                  name="registration_code"
                  type={showPassword ? "text" : "password"}
                  // placeholder={showPassword ? 'Enter password' : '••••••••'}
                  placeholder="Use your code to login"
                  className={`form-control ${
                    errors.registration_code && touched.registration_code
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
                  variant="contained"
                  disabled={isSubmitting}
                  style={{ textTransform: "none", width: "100%" }}
                  startIcon={
                    isLogging ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <GoShieldLock size={20} color="white" />
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
          className={`mt-1 ${currentResponseStatus ? "" : "text-danger"}`}
        ></p>
      </div>
    </div>
  );
};

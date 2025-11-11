// React & Core
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import React from 'react';
// Form & Validation
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";


// Import only what you use (tree-shake safe)
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";

// Icons
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { BsCalendar2Event, BsPeopleFill } from "react-icons/bs";
import { FaWhatsapp } from "react-icons/fa";
import { FcSurvey } from "react-icons/fc";
import { GiArchiveRegister } from "react-icons/gi";
import { GoShieldLock } from "react-icons/go";
import { GrCatalog, GrCatalogOption } from "react-icons/gr";
import { IoIdCardOutline } from "react-icons/io5";
import { MdPictureAsPdf } from "react-icons/md";
import { RxDoubleArrowLeft } from "react-icons/rx";

// Utils
import { Header } from "../utils/Header";
import { getCookie, setEncryptedCookie } from "../utils/cookieUtils";

// Context
import { useWebSocket } from "./WebSocketContext";

// Components
const RegistrationList = React.lazy(() => import("./Registration/RegistrationList"));
const RegistrationDataGrid = React.lazy(() => import("../gallery/RegistrationDataGrid"));
const MemberDataGrid = React.lazy(() => import("../gallery/MembersDataGrid"));
const MemberCardDataGrid = React.lazy(() => import("../gallery/MemberCardDataGrid"));
const SurveyDataGrid = React.lazy(() => import("../gallery/SurveyDataGrid"));
const GICDataGrid = React.lazy(() => import("../gallery/GICDataGrid"));
const WhatsappBroadcast = React.lazy(() => import("../../components/admin/WhatsApp/WhatsApp"));
const PDFGenerator = React.lazy(() => import("./PDFGenerator/PDFGenerator"));

// import RegistrationList from "./Registration/RegistrationList";
// import RegistrationDataGrid from "../gallery/RegistrationDataGrid";
// import MemberDataGrid from "../gallery/MembersDataGrid";
// import MemberCardDataGrid from "../gallery/MemberCardDataGrid";
// import SurveyDataGrid from "../gallery/SurveyDataGrid";
// import GICDataGrid from "../gallery/GICDataGrid";
// import WhatsappBroadcast from "../../components/admin/WhatsApp/WhatsApp";
// import PDFGenerator from "./PDFGenerator/PDFGenerator";


// Styles
import "./admin.css";
import "../utils/login.css";


const validationSchema = Yup.object({
    login_code: Yup.string().required('Login code is required!'),
});
const Admin = ({ data }) => {


    const { _data } = useWebSocket();
    const initialValues = {
        login_code: '',
    };
    const navigate = useNavigate();
    const location = useLocation();
    const statusRef = useRef();
    const [loginClass, setLoginClass] = useState(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [adminUser, setAdminUser] = useState(false);
    const [showPassword, setShowPassowrd] = useState(false);

    const checkAuth = useCallback(async () => {
        try {

            const res = await fetch(`${import.meta.env.VITE_SERVERURL}/admin/check-auth`, {
                method: "GET",
                credentials: "include",
            });

            if (res.status === 401) {

                console.warn("Unauthorized");
                setAdminUser(null);

                return;
            }

            if (res.ok) {
                const data = await res.json();
                setAdminUser(true);
            }


        } catch (err) {
            console.error("Auth check failed:", err);
            setAdminUser(null);
        } finally {
            setIsCheckingAuth(false);
        }
    }, [])


    useEffect(() => {
        checkAuth();

    }, [checkAuth]);


    
   


    const handleLoginSubmit = async (values, { setSubmitting, resetForm }) => {
        const setStatus = (message, type = "danger") => {
            if (statusRef.current) {
                setLoginClass(`text-${type}`);
                statusRef.current.textContent = message;
            }
        };

        try {
            setSubmitting(true);

            const res = await fetch(`${import.meta.env.VITE_SERVERURL}/admin/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include", // ensure cookie/session is set
                body: JSON.stringify({ password: values.login_code }),
            });

            if (res.status === 429) {
                const errorData = await res.json();
                return setStatus(errorData.error || "Too many attempts, please try again later.");


            }

            if (res.status === 401) {
                const errorData = await res.json();
                return setStatus(errorData.error || "Unauthorized, please try again later.");
            }

            if (res.ok) {
                const data = await res.json();

                if (data.success) {
                    // backend sets secure cookie, you just store a flag in state
                    setAdminUser(true);
                    resetForm();

                    navigate(`/admin?tab=registration-config`, {
                        state: { tab: 'registration-config' },
                    });
                    return setStatus("Login successful!", "dark");

                } else {
                    if (statusRef.current) {
                        return setStatus("Invalid Password!");
                    }
                }
            } else {

                setStatus(data.error || "Login failed. Please try again.");
            }
        } catch (err) {
            console.error("Login error:", err);
            setStatus("An unexpected error occurred.");
        } finally {
            setSubmitting(false);
        }
    };


    const tabStyle = { textTransform: 'none', alignSelf: 'baseline', mi: '10px' };
    const tabConfig = [
        {
            icon: <GiArchiveRegister size={20} />,
            label: "Registration Config",
        },
        {
            icon: <GrCatalogOption size={20} />,
            label: "Events",
        },
        {
            icon: <FcSurvey size={24} />,
            label: "Surveys",
        },
        {
            icon: <IoIdCardOutline size={24} />,
            label: "Member Cards",
        },
        {
            icon: <GrCatalog size={20} />,
            label: "GIC Data",
        },
        {
            icon: <BsPeopleFill size={20} />,
            label: "Member Data",
        },
        {
            icon: <MdPictureAsPdf size={20} />,
            label: "Procurement PDF Generator",
        },
        {
            icon: <FaWhatsapp size={20} />,
            label: "WhatsApp Broadcast",
        },
    ];

    const [tabValue, setTabValue] = useState(0);
    const [burgerActive, setBurgerActive] = useState(false);
    const [showMenu, setShowMenu] = useState(null);

    useEffect(() => {
        const setWidth = () => {
            const width = window.innerWidth;
            if (width < 768) {
                setShowMenu(true);
            } else {
                setShowMenu(false);
            }
        };

        setWidth();

        window.addEventListener("resize", setWidth);

        return () => {
            window.removeEventListener("resize", setWidth);
        };
    }, []);


    const slugify = (text) =>
        text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

    useEffect(() => {
        const tabSlug = slugify(tabConfig[0].label);

        if (location.search) {
            const params = new URLSearchParams(location.search);

            const index = tabConfig.findIndex(tab => slugify(tab.label) === params.get("tab"));
            setTabValue(index);


        } else {

            navigate(`/admin?tab=${tabSlug}`, {
                state: { tab: tabSlug },
            });

            setTabValue(0);
        }

    }, [])

    const handletabChange = (event, newValue) => {

        const tabSlug = slugify(tabConfig[newValue].label);

        // Push new history entry with state
        navigate(`/admin?tab=${tabSlug}`, {
            state: { tab: tabSlug },
        });
        setTabValue(newValue);
        setBurgerActive(false);
    };



    useEffect(() => {
        const onPopState = () => {
            const tabFromState = window.history.state?.usr?.tab;
            if (tabFromState) {
                const index = tabConfig.findIndex(tab => slugify(tab.label) === tabFromState);
                setTabValue(index);
            }
        };

        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);

    useEffect(()=>{
        if (_data && !_data.Auth) {
                           setAdminUser(null);
                       }
    }, [])


    let content;
    switch (tabValue) {
        case 0:
            content = <RegistrationList />;
            break;
        case 1:
            content = <RegistrationDataGrid />;
            break;
        case 2:
            content = <SurveyDataGrid />;
            break;
        case 3:
            content = <MemberCardDataGrid />;
            break;
        case 4:
            content = <GICDataGrid />;
            break;
        case 5:
            content = <MemberDataGrid />;
            break;
        case 6:
            content = <PDFGenerator />;
            break;
        case 7:
            content = <WhatsappBroadcast />;
            break;
    }


const FallBackLoader = () => (
  <div
    className="d-flex justify-content-center align-items-center flex-column"
    style={{ height: "100vh", width: "100vw" }}
  >
    <CircularProgress />
  </div>
);

    return isCheckingAuth ? (
       <FallBackLoader/>
    ) : adminUser ? (
        <>
            <Header adminUser={adminUser} setAdminUser={setAdminUser} showMenu={showMenu} burgerActive={burgerActive} setBurgerActive={setBurgerActive} />
            <div className="admin">
                <div className={burgerActive ? "show" : ""}>
                    <Box

                        sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex' }}
                    >
                        
                        <Tabs
                            orientation="vertical"
                            variant="scrollable"
                            value={tabValue}
                            onChange={handletabChange}
                            aria-label=""
                            TabIndicatorProps={{
                                sx: {
                                    left: 0,
                                    right: 'auto',
                                    width: 3,
                                    bgcolor: 'primary.main',
                                }
                            }}
                            sx={{
                                '& .MuiTab-root': {
                                    minHeight: 45,  // reduce height of all tabs
                                    py: 0.5,
                                },
                            }}
                        >
                            {tabConfig.map((tab, index) => (
                                <Tab
                                    key={index}
                                    icon={tab.icon}
                                    iconPosition="start"
                                    label={tab.label}
                                    style={tabStyle}
                                />
                            ))}

                        </Tabs>
                    </Box>
                </div>
                <React.Suspense fallback={   <FallBackLoader/>}>
                    <div >{content}</div>
                </React.Suspense>
            </div>
        </>
    ) : (
        <div className="login">
            <div>
                <h4>Welcome back! Please log in to continue.</h4>
                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={(values, formikHelpers) =>
                        handleLoginSubmit(values, formikHelpers)
                    }
                >
                    {({ values, setFieldValue, errors, touched, isSubmitting }) => (
                        <Form>
                            <div className="full position-relative">
                                <Field
                                    onChange={(e) => {
                                        setFieldValue('login_code', e.target.value);
                                    }}
                                    name="login_code"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Use your code to login"
                                    className={`form-control ${errors.login_code && touched.login_code ? 'is-invalid' : ''}`}
                                    style={{
                                        paddingRight: '2.5rem',
                                        backgroundImage: 'none',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right calc(0.375em + 0.1875rem) center',
                                        backgroundSize: '0 0'
                                    }}
                                />
                                <span
                                    onClick={() => setShowPassowrd((prev) => !prev)}
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        right: '10px',
                                        transform: 'translateY(-50%)',
                                        cursor: 'pointer',
                                        color: '#6c757d',
                                    }}
                                >
                                    {showPassword ? <AiFillEyeInvisible size={20} /> : <AiFillEye size={20} />}
                                </span>
                            </div>
                            <div className="cta-zone d-flex justify-content-between align-items-center">
                                <div>
                                    <ErrorMessage
                                        name="login_code"
                                        component="div"
                                        className="text-danger small"
                                    />
                                </div>
                                <Button
                                    className="mt-1"
                                    type="submit"
                                    variant="contained"
                                    disabled={isSubmitting}
                                    style={{ textTransform: 'none', width: '100%' }}
                                    startIcon={<GoShieldLock size={20} color="white" />}
                                >
                                    Login
                                </Button>
                            </div>
                        </Form>
                    )}
                </Formik>
                <p
                    ref={statusRef}
                    className={loginClass}
                ></p>
            </div>
        </div>
    );
};
export default Admin;


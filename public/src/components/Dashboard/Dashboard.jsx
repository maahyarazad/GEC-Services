// React & Core
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import React from 'react';
// Form & Validation
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";


// Import only what you use (tree-shake safe)
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";

// Icons
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { BsPeopleFill } from "react-icons/bs";
import { FaWhatsapp } from "react-icons/fa";
import { FcSurvey } from "react-icons/fc";
import { GiArchiveRegister } from "react-icons/gi";
import { GoShieldLock } from "react-icons/go";
import { GrCatalogOption } from "react-icons/gr";
import { MdPictureAsPdf, MdOutlineHealthAndSafety, MdChevronLeft, MdChevronRight, MdTerminal, MdLocalShipping, MdLocationOn, MdSupportAgent } from "react-icons/md";
import { PiBriefcaseDuotone } from "react-icons/pi";

// Utils
import { Header } from "../utils/Header";

// Context
import { useWebSocket } from "./WebSocketContext";

// Components
const HealthCheck = React.lazy(() => import("./HealthCheck/HealthCheck"));
const RegistrationConfig = React.lazy(() => import("./Registration/RegistrationConfig"));
const RegistrantSection = React.lazy(() => import("../Sections/RegistrantSection"));
const MemberDataGrid = React.lazy(() => import("../Sections/MembersDataGrid"));
const MemberCardDataGrid = React.lazy(() => import("../Sections/MemberCardDataGrid"));
const SurveyDataGrid = React.lazy(() => import("../Sections/SurveyDataGrid"));
const WhatsappBroadcast = React.lazy(() => import("./WhatsApp/WhatsApp"));
const PDFGenerator = React.lazy(() => import("./PDFGenerator/PDFGenerator"));
const ServerLogs = React.lazy(() => import("./ServerLogs/ServerLogs"));
const DeliveryTrackingSection = React.lazy(() => import("../Sections/DeliveryTrackingSection"));
const PlaceIdFinder = React.lazy(() => import("./PlaceIdFinder/PlaceIdFinder"));
const SupportSection = React.lazy(() => import("./Support/SupportSection"));

// import RegistrationList from "./Registration/RegistrationList";
// import RegistrationDataGrid from "../gallery/RegistrationDataGrid";
// import MemberDataGrid from "../gallery/MembersDataGrid";
// import MemberCardDataGrid from "../gallery/MemberCardDataGrid";
// import SurveyDataGrid from "../gallery/SurveyDataGrid";
// import GICDataGrid from "../gallery/GICDataGrid";
// import WhatsappBroadcast from "../../components/admin/WhatsApp/WhatsApp";
// import PDFGenerator from "./PDFGenerator/PDFGenerator";


// Styles
import "./Dashboard.css";
import "../utils/login.css";
import GECLogo from "../../assets/background.webp";

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
    const [adminEmail, setAdminEmail] = useState(null);
    const [showPassword, setShowPassowrd] = useState(false);

    const checkAuth = useCallback(async () => {
        try {
            // If the URL carries admin auto-login params, validate them server-side first.
            const params = new URLSearchParams(window.location.search);
            const autoEmail = params.get("email");
            const autoToken = params.get("token");

            if (autoEmail && autoToken) {
                const autoRes = await fetch(
                    `${import.meta.env.VITE_SERVERURL}/admin/auto-login?email=${encodeURIComponent(autoEmail)}&token=${encodeURIComponent(autoToken)}`,
                    {
                        method: "GET",
                        credentials: "include",
                    }
                );

                if (autoRes.ok) {
                    const autoData = await autoRes.json();
                    if (autoData.success) {
                        setAdminUser(true);
                        setAdminEmail(autoData.email || autoEmail);

                        // Strip the sensitive credentials from the URL so the token
                        // isn't left in history / shareable links.
                        params.delete("email");
                        params.delete("token");
                        const remaining = params.toString();
                        window.history.replaceState(
                            {},
                            "",
                            `/admin${remaining ? `?${remaining}` : ""}`
                        );
                        return;
                    }
                }
                // Auto-login failed → fall through to the normal session check / login page.
            }

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
                setAdminEmail(data.email || null);
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
                    const params = new URLSearchParams(location.search);

                    // Ensure tab exists, but keep all other params (e.g. view)
                    if (!params.get("tab")) {
                        params.set("tab", "registration-config");
                    }

                    // backend sets secure cookie, you just store a flag in state
                    setAdminUser(true);
                    resetForm();

                    navigate(`/admin?${params.toString()}`, {
                        state: { tab: params.get("tab") },
                    });

                    setStatus("Login successful!", "dark");
                    return;

                } else {
                    if (statusRef.current) {
                        setStatus("Invalid Password!");
                        return;
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
            icon: <MdOutlineHealthAndSafety size={20} />,
            label: "Website Health",
        },
        {
            icon: <GiArchiveRegister size={20} />,
            label: "Registration Config",
        },
        {
            icon: <GrCatalogOption size={20} />,
            label: "Registrant Section",
        },
        {
            icon: <FcSurvey size={24} />,
            label: "Surveys",
        },
        {
            icon: <PiBriefcaseDuotone size={24} />,
            label: "Partner Onboarding",
        },

        {
            icon: <BsPeopleFill size={20} />,
            label: "Expert Circle",
        },
        {
            icon: <MdPictureAsPdf size={20} />,
            label: "Procurement PDF Generator",
        },
        {
            icon: <FaWhatsapp size={20} />,
            label: "WhatsApp Broadcast",
        },
        {
            icon: <MdTerminal size={20} />,
            label: "Server Logs",
        },
        {
            icon: <MdLocalShipping size={20} />,
            label: "Delivery & Tracking",
        },
        {
            icon: <MdLocationOn size={20} />,
            label: "Place ID Finder",
        },
        {
            icon: <MdSupportAgent size={20} />,
            label: "Support Center",
        },
    ];

    const [tabValue, setTabValue] = useState(0);
    const [burgerActive, setBurgerActive] = useState(false);
    const [showMenu, setShowMenu] = useState(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
            const tab = params.get("tab");
            const index = tabConfig.findIndex(tabItem => slugify(tabItem.label) === tab);

            // If index is invalid, fallback to 0
            setTabValue(index >= 0 ? index : 0);
        } else {
            navigate(`/admin?tab=${tabSlug}`, {
                state: { tab: tabSlug },
            });
            setTabValue(0);
        }
    }, []);

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

    useEffect(() => {
        if (_data && !_data.Auth) {
            setAdminUser(null);
        }
    }, [])


    let content;
    switch (tabValue) {
        case 0:
            content = <HealthCheck />;
            break;
        case 1:
            content = <RegistrationConfig />;
            break;
        case 2:
            content = <RegistrantSection />;
            break;
        case 3:
            content = <SurveyDataGrid />;
            break;
        case 4:
            content = <MemberCardDataGrid />;
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
        case 8:
            content = <ServerLogs />;
            break;
        case 9:
            content = <DeliveryTrackingSection />;
            break;
        case 10:
            content = <PlaceIdFinder />;
            break;
        case 11:
            content = <SupportSection />;
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
        <FallBackLoader />
    ) : adminUser ? (
        <>
            <Header adminUser={adminUser} adminEmail={adminEmail} setAdminUser={setAdminUser} showMenu={showMenu} burgerActive={burgerActive} setBurgerActive={setBurgerActive} />
            <div className={`admin${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
                <div className={burgerActive ? "show" : ""}>
                    {!showMenu && (
                        <Box sx={{ display: 'flex', justifyContent: sidebarCollapsed ? 'center' : 'flex-end', borderBottom: '1px solid', borderColor: 'divider', p: 0.25 }}>
                            <IconButton size="small" onClick={() => setSidebarCollapsed(prev => !prev)} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                                {sidebarCollapsed ? <MdChevronRight size={18} /> : <MdChevronLeft size={18} />}
                            </IconButton>
                        </Box>
                    )}
                    <Box sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex' }}>
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
                                    minHeight: 45,
                                    py: 0.5,
                                    ...(sidebarCollapsed && { minWidth: 56, px: 0 }),
                                },
                            }}
                        >
                            {tabConfig.map((tab, index) => (
                                <Tab
                                    key={index}
                                    icon={tab.icon}
                                    iconPosition="start"
                                    label={sidebarCollapsed ? undefined : tab.label}
                                    style={sidebarCollapsed ? { textTransform: 'none' } : tabStyle}
                                />
                            ))}
                        </Tabs>
                    </Box>
                </div>
                <React.Suspense fallback={<FallBackLoader />}>
                    <div>{content}</div>
                </React.Suspense>
            </div>
        </>
    ) : (
        <div className="login">
            <div>
                <div className="d-flex align-items-center mb-3">
                    <img alt="GEC Logo" src={GECLogo} height={50} style={{ borderRadius: 6 }} />
                    <div className="d-flex flex-column ps-3 w-100" style={{ fontWeight: 300 }}>
                        <div style={{ fontSize: 15, color: "#6b6347", fontWeight: 400 }}>GEC Services</div>
                        <div className="d-flex align-items-center justify-content-between gap-2" style={{ fontSize: 12, color: "#6b6347", fontWeight: 300 }}>
                            Admin Dashboard
                            <Link to="/" style={{ color: "#1976d2", fontWeight: 300, fontSize: 12 }}>Member Portal</Link>
                        </div>
                    </div>
                </div>
                <h4>Login into Admin Dashboard</h4>
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


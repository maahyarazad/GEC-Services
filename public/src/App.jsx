import React, { useEffect, useRef } from "react";

import "./App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
const Login = React.lazy(() => import("./components/utils/Login"));
const TemplateForm = React.lazy(() => import("./components/templates/TemplateForm"));
const SuccessTemplatePage = React.lazy(() => import("./components/templates/SuccessTemplatePage"));
const GuestRegistration = React.lazy(() => import("./components/guestRegistration/GuestRegistration"));
const EventRegistration = React.lazy(() => import("./components/eventRegistration/EventRegistration"));
const PurchaseMemberShip = React.lazy(() => import("./components/pages/PurchaseMemberShip"));
const PartnerOnboarding = React.lazy(() => import("./components/PartnerOnboarding/PartnerOnboarding"));
const SupportPortal = React.lazy(() => import("./components/pages/SupportPortal"));
const TicketTracker = React.lazy(() => import("./components/pages/TicketTracker"));
// const Admin = React.lazy(() => import("./components/admin/Admin"));
import Dashboard from "./components/Dashboard/Dashboard";

import 'nprogress/nprogress.css';
import NProgress from 'nprogress';

import NotFound from "./components/pages/NotFound";
import Footer from "./components/utils/Footer";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { WebSocketProvider } from "./components/Dashboard/WebSocketContext";
import { Buffer } from 'buffer';
window.Buffer = Buffer;
import { SnackbarProvider } from "./components/Providers/Snackbar";
import { AlertDialogProvider } from "./components/Providers/AlertProvider";
import { SlideModalProvider } from "./components/Providers/SlideModalProvider";
import AccountDeletionRequestPage from "./components/pages/AccountDeletionRequestPage";
import { Provider } from "react-redux";
import { store } from "./store/store";

const RouteLoader = () => {
    const location = useLocation();
    const prevPathRef = useRef(location.pathname);

    useEffect(() => {
        if (location.pathname !== prevPathRef.current) {
            NProgress.start();
        }

        // Let the DOM update before stopping
        requestAnimationFrame(() => {
            NProgress.done();
            prevPathRef.current = location.pathname;
        });
    }, [location]);

    return null;
};

function TitleManager() {
    const location = useLocation();

    useEffect(() => {
        const segments = location.pathname.split("/").filter(Boolean); // remove empty strings
        const capitalizedSegments = segments.map(
            (segment) => segment.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
        );
        const formattedPath = capitalizedSegments.join(" | ");

        document.title = formattedPath
            ? `GEC - Services | ${formattedPath}`
            : "GEC - Services";
    }, [location.pathname]);

    return null;
}


// CircularProgress strokes with `currentColor`, so a plain `color` can't
// render a gradient — define it once as an SVG gradient and reference it
// via `stroke: url(#id)` instead.
const FallBackLoader = () => (
        <div
            className="d-flex justify-content-center align-items-center flex-column"
            style={{ height: "100vh", width: "100vw" }}
        >
            <svg width={0} height={0}>
                <defs>
                    <linearGradient id="fallback-loader-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="rgb(221, 174, 58)" />
                        <stop offset="100%" stopColor="rgb(185, 150, 43)" />
                    </linearGradient>
                </defs>
            </svg>
            <CircularProgress sx={{ "& .MuiCircularProgress-circle": { stroke: "url(#fallback-loader-gradient)" } }} />
        </div>
    );


function AppRoutes() {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith("/admin");

    return (
        <>
            <RouteLoader />
            <TitleManager />
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/account-deletion" element={<AccountDeletionRequestPage />} />
                <Route path="/registration/:event" element={<TemplateForm />} />
                <Route path="/registration/:event/success" element={<SuccessTemplatePage />} />
                <Route path="/guest-registration/:eventSlug" element={<GuestRegistration />} />
                <Route path="/event-registration/:queryParam" element={<EventRegistration />} />
                <Route path="/membership" element={
                    <React.Suspense fallback={<FallBackLoader/>}>
                        <PurchaseMemberShip />
                    </React.Suspense>
                } />
                <Route path="/support" element={
                    <React.Suspense fallback={<FallBackLoader/>}>
                        <SupportPortal />
                    </React.Suspense>
                } />
                <Route path="/support/track" element={
                    <React.Suspense fallback={<FallBackLoader/>}>
                        <TicketTracker />
                    </React.Suspense>
                } />
                <Route path="/partner-onboarding" element={
                    <SnackbarProvider useGECStyle={true}>
                        <React.Suspense fallback={<FallBackLoader/>}>
                            <PartnerOnboarding />
                        </React.Suspense>
                    </SnackbarProvider>
                } />
                <Route
                    path="/admin"
                    element={
                        <WebSocketProvider>
                            <Dashboard />
                        </WebSocketProvider>
                    }
                />
                <Route path="*" element={<NotFound />} />
            </Routes>
            {!isAdminRoute && <Footer />}
        </>
    );
}

function App() {


    useEffect(() => {
        const setVhVar = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty("--vh", `${vh}px`);
        };

        setVhVar();
        window.addEventListener("resize", setVhVar);

        return () => {
            window.removeEventListener("resize", setVhVar);
        };
    }, []);

    return (
        <BrowserRouter>
            <SnackbarProvider>
                <AlertDialogProvider>
                    <SlideModalProvider>
                        <Provider store={store}>

                            <AppRoutes />
                            {/* Available on every route — offers PWA install when eligible. */}
                            <PWAInstallPrompt />
                        </Provider>
                    </SlideModalProvider>
                </AlertDialogProvider>
            </SnackbarProvider>
        </BrowserRouter>
    );
}

export default App;

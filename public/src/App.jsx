import React, { useEffect, useRef } from "react";

import "./App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
const Login = React.lazy(() => import("./components/utils/Login"));
const TemplateForm = React.lazy(() => import("./components/templates/TemplateForm"));
const SuccessTemplatePage = React.lazy(() => import("./components/templates/SuccessTemplatePage"));
const GuestRegistration = React.lazy(() => import("./components/guestRegistration/GuestRegistration"));
const PurchaseMemberShip = React.lazy(() => import("./components/pages/PurchaseMemberShip"));
const PartnerOnboarding = React.lazy(() => import("./components/PartnerOnboarding/PartnerOnboarding"));
// const Admin = React.lazy(() => import("./components/admin/Admin"));
import Dashboard from "./components/Dashboard/Dashboard";

import 'nprogress/nprogress.css';
import NProgress from 'nprogress';

import NotFound from "./components/pages/NotFound";
import Footer from "./components/utils/Footer";
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
                <Route path="/membership" element={<PurchaseMemberShip />} />
                <Route path="/partner-onboarding" element={
                    <SnackbarProvider useGECStyle={true}>
                        <PartnerOnboarding />
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

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            e.prompt();
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);
    return (
        <BrowserRouter>
            <SnackbarProvider>
                <AlertDialogProvider>
                    <SlideModalProvider>
                        <Provider store={store}>

                            <AppRoutes />
                        </Provider>
                    </SlideModalProvider>
                </AlertDialogProvider>
            </SnackbarProvider>
        </BrowserRouter>
    );
}

export default App;

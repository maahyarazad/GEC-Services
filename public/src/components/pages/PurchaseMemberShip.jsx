import * as React from 'react';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Slide from '@mui/material/Slide';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material';
import { useRef } from "react";
import GECLogo from '../../assets/background.webp'
const MemberLogin = React.lazy(() => import("./PurchaseComponent/MemberLogin"));
const MemberUpdate = React.lazy(() => import("./PurchaseComponent/MemberUpdate"));


import applePass from '../../../../file_storage/apple-wallet.png';
import googlePass from '../../../../file_storage/enUS_add_to_google_wallet_add-wallet-badge.png';
import AppStore from '../../assets/download-app-store.png';
import PlayStore from '../../assets/download-play-store.png';




const steps = ['Check Your Current Status', 'Update Your Profile', 'Get Your Membership Pass'];
const PurchaseMemberShip = () => {
    const [activeStep, setActiveStep] = React.useState(0);
    const [skipped, setSkipped] = React.useState(new Set());
    const [slideDirection, setSlideDirection] = React.useState('left');



    const [wizardState, setWizardState] = React.useState({ member: null, authenticate: false, passData: null, otpState: null, isMounted: false });

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const memberComponent = React.useRef();
    const isStepOptional = (step) => step === 1;
    const isStepSkipped = (step) => skipped.has(step);


    const handleNext = () => {
        setSlideDirection('left');

        setActiveStep((prev) => prev + 1);

        if (isStepSkipped(activeStep)) {
            const newSkipped = new Set(skipped.values());
            newSkipped.delete(activeStep);
            setSkipped(newSkipped);
        }
    };


    const handleBack = () => {

        setSlideDirection('right');
        setActiveStep((prev) => prev - 1);
    };

    const handleSkip = () => {
        if (!isStepOptional(activeStep)) {
            throw new Error("You can't skip a step that isn't optional.");
        }
        setSlideDirection('left');
        setActiveStep((prev) => prev + 1);
        setSkipped((prevSkipped) => {
            const newSkipped = new Set(prevSkipped.values());
            newSkipped.add(activeStep);
            return newSkipped;
        });
    };

    const handleReset = () => setActiveStep(0);


    const boxStyle = {
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 1.5 : 0,
        maxWidth: isMobile ? '500px' : '100vw',
        mt: 3,
    };



    async function downloadPass(url) {
        const res = await fetch(url, { credentials: 'include' }); // include cookies if needed

        if (!res.ok) throw new Error('Failed to fetch pass');
        const blob = await res.blob();
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        const filename = url.split('/').pop();
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
    }




    return (
        <div
            className="d-flex justify-content-center align-items-start"
            style={{
                backgroundColor: ' var(--light)',
                padding: isMobile ? '0rem' : '1rem',
                height: '100vh',
                width: '100vw',
                boxSizing: 'border-box',
            }}
        >
            <Box
                sx={{
                    boxShadow: 10,
                    backgroundColor: 'white',
                    borderRadius: isMobile ? 0 : 5,
                    padding: isMobile ? '1rem' : '2rem',
                    width: '100vw',
                    maxWidth: '1000px',
                    height: isMobile ? '100dvh' : '97vh',
                }}
            >
                <img src={GECLogo} height={55} />
                {/* Stepper Header */}
                <Stepper
                    activeStep={activeStep}
                    orientation={isMobile ? 'vertical' : 'horizontal'}
                    sx={{
                        '& .MuiStepLabel-label': {
                            fontSize: isMobile ? '0.85rem' : '1rem',
                        },
                        mb: 3,
                    }}
                >
                    {steps.map((label, index) => {
                        const stepProps = {};
                        const labelProps = {};
                        if (isStepOptional(index)) {
                            labelProps.optional = (
                                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                                    Optional
                                </Typography>
                            );
                        }
                        if (isStepSkipped(index)) stepProps.completed = false;

                        return (
                            <Step key={label} {...stepProps}>
                                <StepLabel {...labelProps}>{label}</StepLabel>
                            </Step>
                        );
                    })}
                </Stepper>

                <Divider sx={{ borderBottomWidth: 1, borderColor: '#000', my: 2 }} />


                {/* Step Content with Slide Animation */}
                <Box
                    sx={{
                        position: 'relative',
                        overflow: 'scroll',
                        //    display:'inline-block',

                        // height: '65vh',
                        minHeight: isMobile ? '50vh' : '60vh',
                    }}
                >
                    <Slide
                        key={activeStep}
                        direction={slideDirection}
                        in
                        mountOnEnter
                        unmountOnExit
                        timeout={400}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center', // horizontal centering
                                alignItems: 'center',     // vertical centering
                                position: 'absolute',
                                width: '100%',
                                minHeight: isMobile ? '50vh' : '65vh',
                                padding: isMobile ? '1rem' : '2rem',
                                left: 0,
                                overflow: 'scroll',
                                textAlign: isMobile ? 'center' : 'left',
                            }}
                        >
                            {activeStep === steps.length ? (
                                <>
                                    <Typography sx={{ mb: 2 }}>
                                        All steps completed — you're finished!
                                    </Typography>
                                    <Button onClick={handleReset} variant="outlined">
                                        Reset
                                    </Button>
                                </>
                            ) : (

                                <>



                                    {/* Put JS logic outside JSX */}
                                    {(() => {
                                        switch (activeStep) {
                                            case 0:
                                                return <MemberLogin wizardState={wizardState} setWizardState={setWizardState} setActiveStep={setActiveStep} />

                                            case 1:
                                                return <MemberUpdate wizardState={wizardState} setWizardState={setWizardState} setActiveStep={setActiveStep} />


                                            case 2:
                                                const passStyle = { border: 0, borderRadius: 12, display: "block" };
                                                return (
                                                    <div className="w-100 d-flex justify-content-center align-items-center flex-column" style={{ width: "100%" }}>
                                                        <div className='py-1 pb-5' style={{ fontSize: '1.5rem', lineHeight: 1.2 }}>
                                                            Congratulations! Your corporate membership pass has been issued and sent to your email. Please <strong style={{}}>download the application</strong> and register your account to access it on your mobile device.
                                                        </div>
                                                        <div className='py-2'>
                                                            <a href="https://play.google.com/store/apps/details?id=com.buenapublica.GECRewards" target="_blank" rel="noopener noreferrer" style={{ minHeight: '70px', display: 'block' }}>
                                                                <img src={PlayStore} alt="Get it on Google Play" class="download-img" width="300" />
                                                            </a>
                                                        </div>
                                                        <div className='py-2'>

                                                            <a href="https://apps.apple.com/ae/app/gec-rewards/id6444924851" target="_blank" rel="noopener noreferrer" style={{ minHeight: '70px', display: 'block' }}>
                                                                <img src={AppStore} alt="Download on the App Store" class="download-img" width="300" />
                                                            </a>

                                                        </div>

                                                    </div>
                                                );

                                                break;

                                            default:
                                                break;
                                        }
                                        return null;
                                    })()}





                                </>
                            )}
                        </Box>
                    </Slide>
                </Box>

                {/* ✅ Static Navigation Buttons (outside the Slide) */}
                <Divider sx={{ borderBottomWidth: 1, borderColor: '#000', my: 2 }} />
                {activeStep < steps.length && (
                    <Box sx={boxStyle}>
                        <Button
                            color="inherit"
                            disabled={activeStep === 0}
                            onClick={handleBack}
                            fullWidth={isMobile}
                            sx={{ textTransform: 'none' }}
                        >
                            Back
                        </Button>

                        {(() => {
                            switch (activeStep) {
                                case 0:
                                    return (
                                        <Button
                                            onClick={handleNext}
                                            variant="contained"
                                            fullWidth={isMobile}
                                            disabled={!wizardState.authenticate}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Next
                                        </Button>
                                    );

                                case 1:
                                    return (
                                        <Button
                                            onClick={handleNext}
                                            variant="contained"
                                            fullWidth={isMobile}
                                            disabled={!wizardState?.otpState?.getMemberPass}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Get Your Pass
                                        </Button>
                                    );

                                default:
                                    return null;
                            }
                        })()}
                    </Box>
                )}

            </Box>
        </div>
    );


}

export default PurchaseMemberShip;

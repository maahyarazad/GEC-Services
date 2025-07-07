import {useState, useEffect} from 'react';

const OtpTimer = ({ initialSeconds = 59, loginResponseData = {}, onResend, onExpiredChange }) => {
    const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
    const [expired, setExpired] = useState(false);


    useEffect(() => {
        if (secondsLeft === 0) {
            setExpired(true);
            if (typeof onExpiredChange === 'function') {
                    onExpiredChange(true);
                }
            return;
        }

        const timerId = setInterval(() => {
            setSecondsLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timerId);
    }, [secondsLeft, onExpiredChange]);

    const handleResend = () => {
        setSecondsLeft(initialSeconds);
        setExpired(false);

        if (typeof onResend === "function") {
            onResend(loginResponseData);
        }
    };
    
    

    return (
       <div className="mt-2">
            {!expired ? (
                <span>OTP expires in: {secondsLeft} seconds</span>
            ) : (
                null
            )}
        </div>
    );
};


export default OtpTimer;
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Animate each digit independently
const AnimatedDigit = ({ digit }) => {
    const [prevDigit, setPrevDigit] = useState(digit);
    const [animKey, setAnimKey] = useState(0);

    useEffect(() => {


        if (digit !== prevDigit) {
            setPrevDigit(digit);
            setAnimKey((k) => k + 1);
        }
    }, [digit, prevDigit]);

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={animKey}
                initial={{ y: 0, opacity: 1 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 0, opacity: 1 }}
                // transition={{
                //     y: { duration: 0.1 },
                //     // opacity: { duration: 0 }  
                // }}
                style={{ fontSize: '2rem', fontWeight: 'bold', width: 20, textAlign: 'center' }}
            >
                {digit}
            </motion.div>
        </AnimatePresence>
    );
};

// Display each time unit (e.g., hours) as two animated digits
const TimeUnit = ({ label, value }) => {
    const digits = value.toString().padStart(2, '0').split('');

    return (
        <div style={{ textAlign: 'center', minWidth: 60 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                {digits.map((digit, idx) => (
                    <AnimatedDigit key={`${label}-${idx}`} digit={digit} />
                    
                ))}
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: 4 }}>{label}</div>
        </div>
    );
};

// Main countdown component
const TenDayCountdown = () => {
    
    const serverStartDate = new Date("2025-06-11T00:00:00Z");
    const endDate = new Date(serverStartDate.getTime());
    const calculateTimeLeft = () => {
        

        const now = new Date();
        
        const difference = endDate - now;

        if (difference <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        return {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / (1000 * 60)) % 60),
            seconds: Math.floor((difference / 1000) % 60),
        };
        
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    
    return (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', alignItems: 'center', position:'relative' }}>
            <TimeUnit label="Days" value={timeLeft.days} />
            <div style={{position:"absolute", top: '12px', left: '3.8em'}}>
                <strong>
                    -
                </strong>
             </div>
            <TimeUnit label="Hours" value={timeLeft.hours} />
             <div style={{position:"absolute", top: '12px', left: '8em'}}>
                <strong>
                    :
                </strong>
             </div>
            <TimeUnit label="Minutes" value={timeLeft.minutes} />
              <div style={{position:"absolute", top: '12px', left: '12em'}}>
                <strong>
                    :
                </strong>
             </div>
            <TimeUnit label="Seconds" value={timeLeft.seconds} />
        </div>
    );
};

export default TenDayCountdown;

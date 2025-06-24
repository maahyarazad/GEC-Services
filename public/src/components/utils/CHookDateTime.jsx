import { useEffect, useState } from 'react';

const CHookDateTime = () => {
    const [formattedDate, setFormattedDate] = useState('');

    useEffect(() => {
        const dateTime = new Date();
        
        // Define options for formatting the date
        const options = { 
            weekday: 'long', // Full name of the day
            month: 'long',   // Full name of the month
            day: 'numeric',  // Numeric day
            year: 'numeric'  // Numeric year
        };

        // Format the date
        const formatted = dateTime.toLocaleDateString('en-US', options);
        
        // Set the formatted date
        setFormattedDate(formatted);
    }, []);

    return formattedDate
    
};

export default CHookDateTime;

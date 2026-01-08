import { useEffect, useState, useCallback } from "react";
import Box from '@mui/material/Box';
import './HealthCheck.css';

import CircularProgress from '@mui/material/CircularProgress';

function SiteHealthChecker() {
    const websites = [
        "https://experts.german-emirates-club.com",
        "https://www.german-emirates-club.com",
        "https://www.angels-bureau.com",
        "https://www.difa.agency",
        "https://www.palm-x.com",
    ];

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
        const checkHealth = async () => {
            const checks = await Promise.all(
                websites.map(async (url) => {
                    try {
                        const response = await fetch(url, {
                            method: "GET",
                            cache: "no-store",
                        });

                        return {
                            url,
                            status: response.ok ? "up" : "down",
                        };
                    } catch {
                        return {
                            url,
                            status: "down",
                        };
                    }
                })
            );

            setResults(
                checks.map((c) => ({
                    ...c,
                    lastChecked: new Date().toLocaleTimeString(),
                }))
            );
        };

        
        // run immediately
        checkHealth();
        debugger;
        setLoading(false);
        // every 1 minute
        const intervalId = setInterval(checkHealth, 60_000);

        return () => clearInterval(intervalId);
    }, []);


    return (

        <Box sx={{ padding: 2 }}>
            <div style={{ width: '100%', height: 'calc(100vh - 155px)' }}>

            {loading ? (
                
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            ) : (

                results.map(({ url, status, lastChecked }) => (
                    <div key={url} style={{ marginBottom: 8 }} >
                        <b onClick={() => window.open(url, '_blank')} style={{ marginBottom: 8 , cursor:'pointer'}} >{url}</b>
                        <div className="status-container">Status: <span className={`status-dot  ${status === "up" ? "up" : "down"}`}></span></div>
                        <p>Last checked: {lastChecked}</p>
                    </div>
                ))
            )
            }
            </div>
        </Box>


    );
}

export default SiteHealthChecker;

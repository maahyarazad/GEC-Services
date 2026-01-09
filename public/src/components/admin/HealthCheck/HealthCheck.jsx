import { useEffect, useState, useCallback, useRef } from "react";
import Box from '@mui/material/Box';
import './HealthCheck.css';

import CircularProgress from '@mui/material/CircularProgress';
import { Paper } from "@mui/material";

function SiteHealthChecker() {
    

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
  

    const intervalRef = useRef(null);



     const checkHealth = useCallback(async () => {
            try {
                setLoading(true);
                const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/health-check`, {
                    method: 'GET',
                    credentials: "include"
                });
    
                const respnse_data = await response.json();
                debugger;
                if (!response.ok) {
    
                   
                    throw new Error(response.message);
                }
    
    
                if (respnse_data) {
                    setResults(respnse_data)
                  
                }
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        }, []);





   
useEffect(() => {
    // initial run
    checkHealth();

    // store interval id in ref
    intervalRef.current = window.setInterval(() => {
        checkHealth();
    }, 60_000);

    return () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };
}, [checkHealth]);


    return (

        <Box sx={{ padding: 2 }}>
            <div style={{ width: '100%', height: 'calc(100vh - 155px)' }}>

            {loading ? (
                
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            ) : (

                results.map(({ url, status, lastChecked }) => (
                    <Paper key={url} className={`paper-container ${status === "up" ? "up": "down"}` } elevation={5}  >
                        <b onClick={() => window.open(url, '_blank')} style={{ marginBottom: 8 , cursor:'pointer'}} > 
                            <span> {url}</span>
                           
                        </b>
                        <div className="status-container">Status: 
                            <span className={`status-dot  ${status === "up" ? "up pulse" : "down"}`}></span>
                            <span className={`status-info  ${status === "up" ? "up" : "down"}`}>{status === "up" ? "No Issues" : status}</span>
                        </div>
                        <div>Last checked: { new Date(lastChecked).toLocaleString()}</div>
                    </Paper>
                ))
            )
            }
            </div>
        </Box>


    );
}

export default SiteHealthChecker;

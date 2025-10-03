import React, {useState, useEffect, useCallback} from "react";
import { Grid, Paper, Typography, Box, CircularProgress } from "@mui/material";
import { IoPeople } from "react-icons/io5";
import { MdWorkspacePremium, MdOutlineAccessTime } from "react-icons/md";
const paidBlue = '#0f0faf';
const nonpaidBlue = '#55729e';
const red = '#cc0000';


const DashboardCards = () => {
        const [loading, setLoading] = useState(true);
        const [panelData, setPanelData] = useState(null);
          const [stats, setStats] = useState([]);

        const fetchDashboardData = useCallback(async()=>{
            try {
                    
    
                    const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/member_card_report`, {credentials:"include"});
                    
                    if(response.status === 200){
                        const response_data = await response.json();
                        setPanelData(response_data.data);
                        
                    }
                } catch (err) {
                    console.error('Failed to fetch:', err);
                } finally {
                    setLoading(false);
                }
        },
            
            []
        );

        useEffect(() => {
            
            fetchDashboardData();
        }, [fetchDashboardData]);

useEffect(() => {
    if (!panelData) return;

    setStats([
      {
        label: "Total Members",
        value: panelData.count_total_valid,
        icon: <IoPeople  size={35}/>,
        bgColor: "primary.white",
        color: "primary.main",
      },
      {
        label: "Expiring Soon",
        value: panelData.expiring_soon_count,
        icon: <MdOutlineAccessTime size={35}/>,
        bgColor: "success.white",
        color: "warning.main",
      },
      {
        label: "Blue (Paid Type 1)",
        value: panelData.blue_paid,
        icon: <MdWorkspacePremium  size={35}/>,
        bgColor: "primary.white",
        color:paidBlue
      },
      {
        label: "Blue (Non Paid Type 5)",
        value: panelData.blue_non_paid,
        icon: <MdWorkspacePremium  size={35}/>,
        bgColor: "primary.white",
        color:nonpaidBlue
      },
      {
        label: "Red (Type 7)",
        value: panelData.red,
        icon: <MdWorkspacePremium  size={35}/>,
        bgColor: "primary.white",
        color:red
      },
    ]);
  }, [panelData]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={2} sx={{ p: 1 }}>
      {stats.map((stat, index) => (
        <Grid item xs={12} md={3} key={index}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              borderRadius: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                {stat.label}
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {stat.value}
              </Typography>
            </Box>
            <Box
              sx={{
                p: 1.5,
                borderRadius: "50%",
                bgcolor: stat.bgColor,
                color: stat.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {stat.icon}
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

export default DashboardCards;


import { useEffect, useRef, useState, useCallback } from "react";
import templates from '../../../assets/whatsapp-template.json';
import { FaWhatsapp } from "react-icons/fa";
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
const tabstyle = {
    backgroundColor: "#00000",      // background of the header
    color: "#fffff",                // text color
    "& .MuiAccordionSummary-expandIconWrapper": {
        color: "#fffff",             // icon color
    },
    '&.Mui-expanded': {
        bgcolor: '#037bfc',
        '& .MuiTypography-root': {
            color: '#fff',   // text color when expanded
        },
        '& .MuiSvgIcon-root': {
            color: '#fff',   // expand icon color when expanded
        },
    },

}
const WhatsappBroadcast = () => {

    const [data, setData] = useState();
    const [groupedByTypeKey, setGroupedByTypeKey] = useState();

    const [loading, setLoading] = useState(true);



    const fetchData = useCallback(async () => {
        try {


            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/whatsapp/list`, { credentials: "include" });


            if (response.status === 200) {
                const response_data = await response.json();
                setData(response_data.templates);




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

        fetchData();
    }, [fetchData]);



    useEffect(() => {
        if (data) {
            const _groupedByTypeKey = data.reduce((acc, obj) => {
                if (!obj.types) return acc;

                Object.keys(obj.types).forEach((typeKey) => {
                    if (!acc[typeKey]) {
                        acc[typeKey] = [];
                    }
                    acc[typeKey].push(obj);
                });

                return acc;
            }, {});
            setGroupedByTypeKey(_groupedByTypeKey);
        }

    }, [data]);







    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '80%' }}>
                <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                    <CircularProgress />
                </Box>
            </div>
        );
    }

    return (

        <Box sx={{ padding: 1, height: '70%', overflow: 'scrollY' }}>
            <div className="row">

            <div className="col-4">
                {groupedByTypeKey && Object.keys(groupedByTypeKey).length > 0 ? (
                Object.keys(groupedByTypeKey).map((key) => (
                    <Accordion key={key}>
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls="panel2-content"
                            id="panel2-header"
                            sx={tabstyle}
                        >
                            <Typography component="span">{key}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box style={{ width: '100%' }}>
                                <div className="d-flex">
                                    <div className="col form-control">
  {Object.values(groupedByTypeKey[key]).map((item, idx) => (
    <div key={idx} style={{ marginBottom: 12 }} onClick={()=> console.log(item)}>
      <strong>{item.friendlyName}</strong> ({item.language})<br />
      SID: {item.sid}<br />
      Created: {new Date(item.dateCreated).toLocaleString()}<br />
      Updated: {new Date(item.dateUpdated).toLocaleString()}<br />
      URL: <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
    </div>
  ))}
</div>
                                </div>
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ))
            ) : (
                <Typography>No data available</Typography>
            )}
            </div>
            <div className="col-8"></div>
            </div>
            

        </Box>





    );
};



export default WhatsappBroadcast;
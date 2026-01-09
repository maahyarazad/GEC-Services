
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
import { Icon, Paper } from "@mui/material";
import { Button } from '@mui/material'
import Modal from '../../Modal';


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
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [testAction, setTestAction] = useState(false);
    const [inputValue, setInputValue] = useState();



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



    const handleSubmit = async (e) => {
        e.preventDefault(); // prevent page reload on form submit

        try {
            if (!inputValue) {
                alert("Please enter a phone number");
                return;
            }
            if (!content) {
                alert("Please select a template");
                return;
            }

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/whatsapp/send`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    mobile_number: inputValue,
                    template: content,
                }),
            });

            if (response.ok) {
                const responseData = await response.json();
                alert(`Message sent! Status: ${responseData.result || "unknown"}`);
            } else {
                const errorData = await response.json();
                alert(`Failed to send message: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error("Failed to send:", error);
            alert("Error sending message. See console.");
        }
    };



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

        <Box sx={{ padding: 1, position: 'relative' }}>
                <Button variant="contained" color="primary" sx={{textTransform : 'none'}} onClick={() => setTestAction(true)} disabled={content === null}>  
                    <FaWhatsapp size={17} style={{marginRight: 10}}/> Test Message
                </Button>
            <div style={{ height: 'calc(100vh - 155px)', overflow: 'scroll' }} >
                <div className="mt-2">

                    <div className="row m-0">

                    <div className="col-lg-4 col-12">
                        {groupedByTypeKey && Object.keys(groupedByTypeKey).length > 0 ? (
                            Object.keys(groupedByTypeKey).map((key) => (
                                <Accordion key={key}>
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        aria-controls="panel2-content"
                                        id="panel2-header"
                                        sx={tabstyle}
                                    >
                                        <Typography component="span">{key.charAt(0).toUpperCase() + key.slice(1)}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <div className="d-flex">
                                            <div className="col form-control">
                                                {Object.values(groupedByTypeKey[key]).map((item, idx) => (
                                                    <div key={idx}  onClick={() => { setContent(item); console.log(item)}} 
                                                        style={{ border: 'solid', borderRadius: '5px', borderColor: 'gray', borderWidth: '1px', padding: '5px', marginBottom:'5px', cursor:'pointer'}}>
                                                        
                                                            <strong>{item.friendlyName}</strong> ({item.language})<br />
                                                            SID: <small style={{fontSize: '15px'}}>{item.sid}</small><br />
                                                            Created: {new Date(item.dateCreated).toLocaleString()}<br />
                                                            Updated: {new Date(item.dateUpdated).toLocaleString()}<br />
                                                            URL: <a href={item.url} target="_blank" rel="noopener noreferrer">View in Twilio</a>
                                                        
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </AccordionDetails>
                                </Accordion>
                            ))
                        ) : (
                            <Typography>No data available</Typography>
                        )}
                    </div>
                    <div className="col-lg-8 col-12">
                        
                        {content && content.types ? (
                            (() => {
                                const typeKey = Object.keys(content.types)[0];
                                const data = content.types[typeKey];

                                switch (typeKey) {
                                    case "whatsapp/authentication": {
                                        const { body, actions, add_security_recommendation } = data;
                                        return (
                                            <Paper sx={{ p: 2 }} elevation={5}>
                                                <Typography variant="h6">WhatsApp Authentication</Typography>
                                                <Typography sx={{ my: 2 }}>{body.replace("{{1}}", "123456")}</Typography>
                                                {actions?.map((action, i) => {
                                                    if (action.type === "COPY_CODE") {

                                                        return (
                                                            <div key={i}>

                                                            <Button variant="contained" color="primary" sx={{textTransform : 'none'}}
                                                                
                                                                onClick={() => navigator.clipboard.writeText("123456")}
                                                                style={{ padding: "8px 16px", cursor: "pointer" }}
                                                            >
                                                                {action.copy_code_text}
                                                            </Button>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                                {add_security_recommendation && (
                                                    <Typography color="error" sx={{ mt: 2 }}>
                                                        Please add security recommendations.
                                                    </Typography>
                                                )}
                                            </Paper>
                                        );
                                    }

                                    case "twilio/list-picker": {
                                        const { body, button, items } = data;
                                        return (
                                            <Paper sx={{ p: 2 }} elevation={5}>
                                                <Typography variant="h6">Twilio List Picker</Typography>
                                                <Typography sx={{ my: 2 }}>
                                                    {body.replace("{{order_number}}", "12345").replace("{{date}}", "Jan 10")}
                                                </Typography>
                                                <ul style={{ listStyle: "none", padding: 0 }}>
                                                    {items.map(({ id, item, description }) => (
                                                        <li
                                                            key={id}
                                                            style={{
                                                                marginBottom: 10,
                                                                padding: 10,
                                                                background: "#f0f0f0",
                                                                borderRadius: 4,
                                                            }}
                                                        >
                                                            <strong>{item}</strong>
                                                            <div style={{ fontSize: 12, color: "#555" }}>{description}</div>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <Button variant="contained" color="primary" sx={{textTransform : 'none'}}> 
                                                    {button}
                                                </Button>
                                            </Paper>
                                        );
                                    }

                                    case "twilio/text": {
                                        const { body } = data;
                                        return (
                                            <Paper sx={{ p: 2 }} elevation={5}>
                                                <Typography variant="h6">Twilio Text</Typography>
                                                <Typography sx={{ my: 2 }}>{body.replace("{{1}}", "User")}</Typography>
                                            </Paper>
                                        );
                                    }

                                    case "twilio/media": {
                                        const { body, media } = data;
                                        return (
                                            <Paper sx={{ p: 2 }} elevation={5}>
                                                <Typography variant="h6">Twilio Media</Typography>
                                                <Typography sx={{ my: 2 }}>{body}</Typography>
                                                {media?.map((url, idx) => (
                                                    <img
                                                        key={idx}
                                                        src={url}
                                                        alt={`media-${idx}`}
                                                        style={{ maxWidth: "100%", marginBottom: 10, borderRadius: 4 }}
                                                    />
                                                ))}
                                            </Paper>
                                        );
                                    }

                                    case "twilio/card": {
                                        const { title, subtitle, body, media, actions, orientation } = data;
                                        return (
                                            <Paper sx={{ p: 2, maxWidth: 400, border: "1px solid #ccc", borderRadius: 4 }}>
                                                <Typography variant="h5">{title}</Typography>
                                                {subtitle && <Typography variant="subtitle1" color="text.secondary">{subtitle}</Typography>}
                                                {media?.length > 0 && (
                                                    <img
                                                        src={media[0]}
                                                        alt="card media"
                                                        style={{
                                                            width: "100%",
                                                            height: orientation === "VERTICAL" ? 200 : 100,
                                                            objectFit: "cover",
                                                            borderRadius: 4,
                                                            marginTop: 8,
                                                            marginBottom: 8,
                                                        }}
                                                    />
                                                )}
                                                {body && <Typography sx={{ my: 1 }}>{body}</Typography>}
                                                {actions?.length > 0 && (
                                                    <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                                                        {actions.map((action, i) => (
                                                            <div  key={action}>

                                                            <Button variant="contained" color="primary" sx={{textTransform : 'none'}}>

                                                                {action.title || action.label || "Action"}
                                                            </Button>
                                                            </div>
                                                        ))}
                                                    </Box>
                                                )}
                                            </Paper>
                                        );
                                    }

                                    case "twilio/quick-reply": {
                                        const { body, actions } = data;
                                        return (
                                            <Paper sx={{ p: 2 }} elevation={5}>
                                                <Typography variant="h6">Twilio Quick Reply</Typography>
                                                <Typography sx={{ my: 2 }}>{body}</Typography>
                                                <Box sx={{ display: "flex", gap: 1 }}>
                                                    {actions?.map(({ id, title }) => (
                                                        <div  key={id}>
                                                        <Button variant="contained" color="primary" sx={{textTransform : 'none'}}
                                                            onClick={() => alert(`You clicked: ${title}`)}>
                                                        
                                                            {title}
                                                        </Button>
                                                        </div>
                                                    ))}
                                                </Box>
                                            </Paper>
                                        );
                                    }

                                    case "twilio/call-to-action": {
                                        const { body, actions } = data;
                                        return (
                                            <Paper sx={{ p: 2 }} elevation={5}>
                                                <Typography variant="h6">Twilio Call To Action</Typography>
                                                <Typography sx={{ my: 2 }}>{body.replace("{{first_name}}", "John")}</Typography>
                                                <Box sx={{ display: "flex", gap: 1 }}>
                                                    {actions?.map((action, i) => {
                                                        if (action.type === "URL" && action.url) {
                                                            return (
                                                                <div  key={i}>

                                                                    <Button variant="contained" color="primary" sx={{textTransform : 'none'}}
                                                                    

                                                                        onClick={() => window.open(action.url, "_blank", "noopener noreferrer")}
                                                                    >
                                                                        {action.title}
                                                                    </Button>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                </Box>
                                            </Paper>
                                        );
                                    }

                                    default:
                                        return <Typography>Unsupported template type: {typeKey}</Typography>;
                                }
                            })()
                        ) : (
                            <Typography>Select a template to preview</Typography>
                        )}
                    </div>
                    </div>
                </div>

            </div>


            <Modal isOpen={testAction}
                onRequestClose={() => setTestAction(false)}
                title={`Test Message → ${content?.friendlyName}`}>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="test-input">Recipient phone number:</label>
                    <input
                        id="test-input"
                        type="tel"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="+971501234567"
                        pattern="^\+?[0-9]{7,15}$" // allows optional + and 7-15 digits
                        required
                        style={{ width: "100%", padding: "8px", margin: "10px 0" }}
                    />
                    <Button variant="contained" color="primary" sx={{textTransform : 'none'}} type="submit" >
                        Send Message
                    </Button>
                </form>

            </Modal>

        </Box>





    );
};



export default WhatsappBroadcast;
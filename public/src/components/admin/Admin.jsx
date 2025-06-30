import { Events } from "../gallery/Events";
import { Header } from "../utils/Header";
import PropTypes from "prop-types";
import "./admin.css";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useState } from "react";
import { RegistrationList } from "./Registration/RegistrationList";


export const Admin = ({ data }) => {


    const [tabValue, setTabValue] = useState(0);

    const handletabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    let content;
    switch (tabValue) {
        case 1:
            content = <Events data={data} />;
            break;
        default:
            content = <RegistrationList/>
            break;
    }

    return (
        <>
            <Header />
            <div className="admin">
                <div>

                    <Box
                        sx={{ flexGrow: 0, bgcolor: 'background.paper', display: 'flex' }}
                    >
                        <Tabs
                            orientation="vertical"
                            variant="scrollable"
                            value={tabValue}
                            onChange={handletabChange}
                            aria-label=""
                            TabIndicatorProps={{
                                sx: {
                                    left: 0,           // move to left
                                    right: 'auto',     // prevent default right-side behavior
                                    width: 3,          // thickness of the indicator
                                    bgcolor: 'primary.main', // color of the indicator
                                }
                            }}
                            
                        >
                            <Tab label="Registration Management" />
                            <Tab label="Event Management" />
                        </Tabs>

                    </Box>
                </div>
                <div>
                    {content}
                </div>
            </div>
        </>
    );
};

Admin.propTypes = {
    data: PropTypes.array.isRequired,
};

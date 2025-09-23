import React from 'react';
import { Card, CardContent } from '@mui/material';


const Slots = ({ data }) => {
const lineStyle = { 
  lineHeight: 1.2, 
  fontSize: 12, 
  whiteSpace: "nowrap", 
  overflow: "hidden", 
  textOverflow: "ellipsis", 
  maxWidth: "180px"  // adjust width as needed
};

    if (data) {

        return (
            <div className="px-1">
                <div className="row">
                    {Object.keys(data.slots).map((hour) => {
                        const slot = data.slots[hour];
                        const isTaken = slot && slot.registerant_info;

                        return (
                            <div key={hour} className="col-12 col-md-4 py-1">
                                <Card
                                   style={{
                                        backgroundColor: isTaken ? "#f5f5f5" : "white", // avoid 'default'
                                        border: "1px solid #ccc",
                                        boxShadow: isTaken
                                        ? "0 2px 6px rgba(0,0,0,0.15)" // shadow if taken
                                        : "0 1px 3px rgba(0,0,0,0.1)", // lighter shadow if available
                                        transition: "box-shadow 0.3s ease",
                                    }}
                                >
                                    <CardContent style={{ padding: '5px 4px 5px 4px', minHeight: 50 }}>
                                        <div className='d-flex justify-content-between'>

                                            <p className="fw-bold" style={{ lineHeight: 1 }}>{hour}:00</p>
                                            {isTaken ? (
                                                <div className='text-sm'>
                                                    <p className="text-muted mb-0" style={lineStyle}>
                                                        Booked by {slot.registerant_info.fullname}
                                                    </p>
                                                    <p className="text-muted mb-0" style={lineStyle}>

                                                        {slot.registerant_info.email}
                                                    </p>
                                                    <p className="text-muted mb-0" style={lineStyle}>
                                                        {slot.registerant_info.phone_number}
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-muted mb-0">Available</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
};

export default Slots;

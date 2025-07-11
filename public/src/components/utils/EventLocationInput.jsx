import React, { useState } from 'react';
import { Field, ErrorMessage } from 'formik';
import MapModal from './MapModal';
import { Tooltip } from '@mui/material';
import eventLocation from '../../assets/media/Mapbox.png';
import { IoClose } from "react-icons/io5";
const EventLocationInput = ({ errors, touched, setFieldValue, isParentModalOpen, initialLon, initialLat }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleLocationSelect = ({ lat, lng }) => {
        const locationStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setFieldValue('event_location', locationStr);
        setIsModalOpen(false);
    };

    return (
        <>
            <div className='col-6'>
                <Tooltip
                    title={
                        <div className="d-flex flex-column align-items-center text-center">
                            <img src={eventLocation} alt="Lock icon" style={{
                                width: 200,
                                height: 200,
                                borderRadius: 5,
                                objectFit: 'contain', // or 'cover', depending on your need
                                imageRendering: 'auto' // or 'crisp-edges' or 'pixelated' for specific use cases
                            }}
                                className='' />
                            <span>This field will generate a map image in the confirmation email received by the registrant, which can be used for navigation.</span>
                        </div>
                    }
                    componentsProps={{
                        tooltip: {
                            sx: { fontSize: 14 }
                        }
                    }}
                >

                    <div className="align-items-center">
                        <label htmlFor="event_location" className="form-label">Event Location</label>
                        <div onClick={() => setIsModalOpen(true)}>
                            <div className="position-relative" style={{ minHeight: 38 }}>
                                <Field
                                    name="event_location"
                                    type="text"
                                    className={`form-control pe-5 ${errors.event_location && touched.event_location ? 'is-invalid' : ''}`}
                                    placeholder="Event Location"
                                    style={{ minHeight: 38 }}
                                    readOnly
                                />
                                {/** Clear button */}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setFieldValue('event_location', '')}}
                                    className="position-absolute border-0 bg-transparent d-flex align-items-center justify-content-center"
                                    style={{
                                        top: '50%',
                                        right: '8px',
                                        transform: 'translateY(-50%)',
                                        padding: 0,
                                        lineHeight: 1,
                                        cursor: 'pointer'
                                    }}
                                    aria-label="Clear location"
                                >
                                    <IoClose size={20} color="#666" />
                                </button>
                            </div>
                        </div>
                        <ErrorMessage name="event_location" component="div" className="text-danger small mt-1" />
                    </div>

                </Tooltip>
            </div>
            <MapModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSelect={handleLocationSelect}
                isParentModalOpen={isParentModalOpen}
                initialLon={initialLon}
                initialLat={initialLat}
            />

            {/* <MapModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSelect={handleLocationSelect}
                /> */}
        </>
    );
};

export default EventLocationInput;

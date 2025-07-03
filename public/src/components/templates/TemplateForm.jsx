import "./templateform.css";
import { Login } from "../utils/Login";
import { useEffect, useState } from "react";
import { UseCreateRecord } from "../hooks/UseCreateRecord";
import { Link } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { getCookie } from '../utils/cookieUtils';
import { Switch, Button, Box, Tooltip } from '@mui/material';
import { getValidationSchema } from "./dynamicValidation";
import { FaWhatsapp } from "react-icons/fa6";
import { MdEmail } from "react-icons/md";
import { FaPhoneAlt } from "react-icons/fa";
import { MdOutlineCalendarMonth } from "react-icons/md";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { LuBriefcaseBusiness } from "react-icons/lu";
import { BsGenderAmbiguous } from "react-icons/bs";
import SimpleSnackbar from "../utils/Snackbar";
import { useRef } from "react";


const AutofillPhoneAndWhatsapp = ({ mobileNumber }) => {
    const { setFieldValue } = useFormikContext();

    useEffect(() => {
        if (mobileNumber) {
            setFieldValue("phone", mobileNumber);
            setFieldValue("whatsapp", mobileNumber);
        }
    }, [mobileNumber, setFieldValue]);

    return null;
};

export const TemplateForm = () => {
    const [target, setTarget] = useState(null);
    const [showSubmit, setShowSubmit] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const snackbarRef = useRef();

    const initialValues = {
        email: '',
        phone: '',
        whatsapp: '',
        gender: 'male',
        firstName: '',
        lastName: '',
        companyName: '',
        birthday: '',
        consent: false,
    };

    useEffect(() => {
        const gecuser = getCookie("gec-registration");
        if (gecuser) {
            setTarget(gecuser);
        }
    }, []);

    const handleSubmitRegistration = async (values) => {

        const { consent, registration_code, ...data } = {
            ...values,
            event: target.page,
        };

        debugger;
        const formData = new FormData();
        for (const key in data) {
            formData.append(key, data[key]);
        }


        const registration_response = await fetch(`${import.meta.env.VITE_SERVERURL}/registration`, {
            method: 'POST',
            body: formData,
        });


        const registration_response_data = await registration_response.json();
        debugger;
        snackbarRef.current?.openSnackbar(registration_response_data.message);
        // Your submit logic here, for example:
        // const createRecordResponse = await UseCreateRecord(...);
        // if (createRecordResponse.status) { ... }
    };

    if (!target) {
        return <Login />;
    }

    return (
        <>
            <SimpleSnackbar ref={snackbarRef} />
            <div className={`template-form ${target.lockRegistration === 'true' ? "locked-template-form" : ""}`}>
                <div>
                    <div className="target-description">{target.description}</div>
                    <img src={`${import.meta.env.VITE_SERVERURL}/uploads/${target.Image}`} alt={target.title} />
                </div>
                <div>
                    <div>
                        <Formik
                            enableReinitialize={true}
                            initialValues={initialValues}
                            validationSchema={getValidationSchema(target)}
                            onSubmit={handleSubmitRegistration}
                        >
                            {({ setFieldValue, errors, touched }) => (
                                <Form>
                                    {/* Autofill phone and whatsapp fields */}
                                    <AutofillPhoneAndWhatsapp mobileNumber={target.mobile_number} />

                                    <h1>Welcome to {target.title} – Please Register</h1>
                                    <h4>{new Date(target.event_date).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        weekday: 'long',
                                    })}</h4>
                                    <div className="clearance-flat"></div>

                                    <div className="full">
                                        <div className="w-100">
                                            <label>Email</label>
                                            <div className="input-group">
                                                {target.fieldIcon === 'true' && (
                                                    <span className="input-group-text">
                                                        <MdEmail />
                                                    </span>
                                                )}

                                                <Field
                                                    className={`form-control ${errors.email && touched.email ? 'is-invalid' : ''}`}
                                                    type="email"
                                                    name="email"
                                                />
                                            </div>
                                        </div>
                                        <ErrorMessage name="email" component="div" className="text-danger small" />
                                    </div>

                                    <div className="full">
                                        <label>Phone Number</label>
                                        <div className="input-group">
                                            {target.fieldIcon === 'true' && (
                                                <span className="input-group-text">
                                                    <FaPhoneAlt />
                                                </span>

                                            )}
                                            <Field
                                                className={`form-control ${errors.phone && touched.phone ? 'is-invalid' : ''}`}
                                                type="tel"
                                                name="phone"
                                                disabled={true}
                                            />
                                        </div>
                                        <ErrorMessage name="phone" component="div" className="text-danger small" />
                                    </div>

                                    <div className="full">
                                        <label>Whatsapp Number</label>
                                        <div className="input-group">
                                            {target.fieldIcon === 'true' && (

                                                <span className="input-group-text">
                                                    <FaWhatsapp />
                                                </span>

                                            )}
                                            <Field
                                                className={`form-control ${errors.whatsapp && touched.whatsapp ? 'is-invalid' : ''}`}
                                                type="tel"
                                                name="whatsapp"
                                                disabled={true}
                                            />
                                        </div>
                                        <ErrorMessage name="whatsapp" component="div" className="text-danger small" />
                                    </div>

                                    <div className="spacer"></div>

                                    <div className="full">
                                        <label>Gender</label>
                                        <div className="input-group">
                                            {target.fieldIcon === 'true' && (

                                                <span className="input-group-text">
                                                    <BsGenderAmbiguous />
                                                </span>

                                            )}

                                            <Field as="select" name="gender">
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                            </Field>
                                        </div>
                                    </div>

                                    <div className="full">
                                        <label>First Name</label>
                                        <div className="input-group">
                                            {target.fieldIcon === 'true' && (


                                                <span className="input-group-text">
                                                    <MdDriveFileRenameOutline />
                                                </span>
                                            )}

                                            <Field
                                                className={`form-control ${errors.firstName && touched.firstName ? 'is-invalid' : ''}`}
                                                type="text"
                                                name="firstName"
                                            />
                                        </div>
                                        <ErrorMessage name="firstName" component="div" className="text-danger small" />
                                    </div>

                                    <div className="full">
                                        <label>Last Name</label>
                                        <div className="input-group">
                                            {target.fieldIcon === 'true' && (


                                                <span className="input-group-text">
                                                    <MdDriveFileRenameOutline />
                                                </span>
                                            )}

                                            <Field
                                                className={`form-control ${errors.lastName && touched.lastName ? 'is-invalid' : ''}`}
                                                type="text"
                                                name="lastName"
                                            />
                                        </div>
                                        <ErrorMessage name="lastName" component="div" className="text-danger small" />
                                    </div>

                                    {target.companyRequired === 'true' && (
                                        <div className="full">
                                            <label>Company Name</label>
                                            <div className="input-group">
                                                {target.fieldIcon === 'true' && (

                                                    <span className="input-group-text">
                                                        <LuBriefcaseBusiness />
                                                    </span>
                                                )}
                                                <Field
                                                    className={`form-control ${errors.companyName && touched.companyName ? 'is-invalid' : ''}`}
                                                    type="text"
                                                    name="companyName"
                                                />
                                            </div>
                                            <ErrorMessage name="companyName" component="div" className="text-danger small" />
                                        </div>
                                    )}

                                    {target.birthdayRequired === 'true' && (
                                        <div className="full">
                                            <label>Birthday</label>
                                            <div className="input-group">

                                                <span className="input-group-text">
                                                    <MdOutlineCalendarMonth />
                                                </span>
                                                <Field
                                                    className={`form-control ${errors.birthday && touched.birthday ? 'is-invalid' : ''}`}
                                                    name="birthday"
                                                    type="date"
                                                    value={selectedDate}
                                                    onChange={(e) => {
                                                        setFieldValue('birthday', e.target.value);
                                                        setSelectedDate(e.target.value);
                                                    }}
                                                />
                                            </div>
                                            <ErrorMessage name="birthday" component="div" className="text-danger small" />
                                        </div>
                                    )}

                                    {target.IdentityConsent === 'true' && (
                                        <div className="full">
                                            <label htmlFor="consent">
                                                I confirm that I have a valid proof of identification and consent to present it at the venue.
                                            </label>
                                            <Field name="consent">
                                                {({ field, form }) => (
                                                    <input
                                                        {...field}
                                                        type="checkbox"
                                                        id="consent"
                                                        className={`form-check-input ${form.errors.consent && form.touched.consent ? 'is-invalid' : ''}`}
                                                        onChange={e => {
                                                            field.onChange(e);
                                                            setShowSubmit(e.target.checked);
                                                        }}
                                                    />
                                                )}
                                            </Field>
                                            <ErrorMessage name="consent" component="div" className="invalid-feedback small" />
                                        </div>
                                    )}
                                    <Box className="d-flex justify-content-end w-100 my-2">

                                        <Button
                                            variant="contained"
                                            color="primary"
                                            disabled={false}
                                            type="submit"
                                            style={{ pointerEvents: 'auto', opacity: 1, width: '100%', textTransform: 'none' }}

                                        >
                                            {isSubmitting ? 'Saving...' : 'Submit'}
                                        </Button>
                                    </Box>


                                </Form>
                            )}
                        </Formik>
                    </div>
                </div>
            </div>

            {target.lockRegistration === 'true' && (
                <div className="locked-overlay-message">
                    Registration has been closed!
                </div>
            )}
        </>
    );
};

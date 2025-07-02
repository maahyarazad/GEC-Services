import "./templateform.css";
import { Login } from "../utils/Login";
import { useEffect, useState } from "react";
import { UseCreateRecord } from "../hooks/UseCreateRecord";
import { Link } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { getCookie } from '../utils/cookieUtils';
import { Switch, Button, Box, Tooltip } from '@mui/material';


const validationSchema = Yup.object().shape({
    email: Yup.string()
        .email("Please enter a valid email address.")
        .required("Email is required."),

    phone: Yup.string()
        .matches(
            /^\+?[0-9]{10,15}$/,
            "Phone number must be 10–15 digits, and may start with +."
        )
        .required("Phone number is required."),

    whatsapp: Yup.string()
        .matches(
            /^\+?[0-9]{10,15}$/,
            "WhatsApp number must be 10–15 digits, and may start with +."
        )
        .required("WhatsApp number is required."),

    firstName: Yup.string()
        .min(2, "First name must be at least 2 characters.")
        .required("First name is required."),

    lastName: Yup.string()
        .min(2, "Last name must be at least 2 characters.")
        .required("Last name is required."),

    companyName: Yup.string()
        .min(2, "Company name must be at least 2 characters.")
        .required("Company name is required."),

    birthday: Yup.date()
        .max(new Date(), "Birthday cannot be in the future.")
        .required("Birthday is required."),

    consent: Yup.boolean()
        .oneOf([true], "You must agree to the terms and conditions."),
});

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
        debugger;
        console.log("🟢 handleSubmitRegistration fired", values);
        debugger;

        // Your submit logic here, for example:
        // const createRecordResponse = await UseCreateRecord(...);
        // if (createRecordResponse.status) { ... }
    };

    if (!target) {
        return <Login />;
    }

    return (
        <>
            <div className={`template-form ${target.lockRegistration === 'true' ? "locked-template-form" : ""}`}>
                <div>
                    <div className="target-description">{target.description}</div>
                    <img src={`${import.meta.env.VITE_SERVERURL}/uploads/${target.Image}`} alt={target.title} />
                </div>
                <div>
                    <Link to={"/"}>
                        <img alt="home" src="/logo-gec.png" />
                    </Link>
                    <div>
                        <button
                            onClick={() => {
                                // your modal logic here
                            }}
                            className="cta-button simple"
                        >
                            <img alt="" src="/info.svg" />
                        </button>
                        <Formik
                            enableReinitialize={true}
                            initialValues={initialValues}
                            validationSchema={validationSchema}
                            onSubmit={handleSubmitRegistration}
                        >
                            {({ setFieldValue, errors, touched }) => (
                                <Form>
                                    {/* Autofill phone and whatsapp fields */}
                                    <AutofillPhoneAndWhatsapp mobileNumber={target.mobile_number} />

                                    <h1>Please fill in the boxes below</h1>
                                    <h4>17 June 2025 - Tuesday</h4>
                                    <div className="clearance-flat"></div>

                                    <div className="full">
                                        <div className="w-100">
                                            <label>Email</label>
                                            <Field
                                                className={`form-control ${errors.email && touched.email ? 'is-invalid' : ''}`}
                                                type="email"
                                                name="email"
                                            />
                                        </div>
                                        <ErrorMessage name="email" component="div" className="text-danger small" />
                                    </div>

                                    <div className="full">
                                        <label>Phone Number</label>
                                        <Field
                                            className={`form-control ${errors.phone && touched.phone ? 'is-invalid' : ''}`}
                                            type="tel"
                                            name="phone"
                                            disabled={true}
                                        />
                                        <ErrorMessage name="phone" component="div" className="text-danger small" />
                                    </div>

                                    <div className="full">
                                        <label>Whatsapp Number</label>
                                        <Field
                                            className={`form-control ${errors.whatsapp && touched.whatsapp ? 'is-invalid' : ''}`}
                                            type="tel"
                                            name="whatsapp"
                                            disabled={true}
                                        />
                                        <ErrorMessage name="whatsapp" component="div" className="text-danger small" />
                                    </div>

                                    <div className="spacer"></div>

                                    <div className="full">
                                        <label>Gender</label>
                                        <Field as="select" name="gender">
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                        </Field>
                                    </div>

                                    <div className="full">
                                        <label>First Name</label>
                                        <Field
                                            className={`form-control ${errors.firstName && touched.firstName ? 'is-invalid' : ''}`}
                                            type="text"
                                            name="firstName"
                                        />
                                        <ErrorMessage name="firstName" component="div" className="text-danger small" />
                                    </div>

                                    <div className="full">
                                        <label>Last Name</label>
                                        <Field
                                            className={`form-control ${errors.lastName && touched.lastName ? 'is-invalid' : ''}`}
                                            type="text"
                                            name="lastName"
                                        />
                                        <ErrorMessage name="lastName" component="div" className="text-danger small" />
                                    </div>

                                    {target.companyRequired === 'true' && (
                                        <div className="full">
                                            <label>Company Name</label>
                                            <Field
                                                className={`form-control ${errors.companyName && touched.companyName ? 'is-invalid' : ''}`}
                                                type="text"
                                                name="companyName"
                                            />
                                            <ErrorMessage name="companyName" component="div" className="text-danger small" />
                                        </div>
                                    )}

                                    {target.birthdayRequired === 'true' && (
                                        <div className="full">
                                            <label>Birthday</label>
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
                                            <ErrorMessage name="birthday" component="div" className="text-danger small" />
                                        </div>
                                    )}

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
                                    </div>
                                    <ErrorMessage name="consent" component="div" className="invalid-feedback small" />
                                    <Box className="d-flex justify-content-end w-100">

                                        <Button
                                            variant="contained"
                                            color="primary"

                                            type="submit"
                                            style={{ pointerEvents: 'auto', opacity: 1, width: '100%' }}

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

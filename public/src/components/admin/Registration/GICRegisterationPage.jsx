// RegistrationForm.jsx
import React, { useState, useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
    TextField,
    MenuItem,
    Button,
    CircularProgress,
    
} from "@mui/material";
import misc from '../../../assets/misc.json'
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';

// import { snackbarSignal } from '../components/Snackbar';
import { getCodeList } from "country-list";

const steps = [
    'Step 1: Submit Your Company Information',
    'Step 2: Reset Your Password'
];


const GICRegistrationForm = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
        const [activeStep, setActiveStep] = useState(0);
    const handleNext = () => {
        setActiveStep((prev) => prev + 1);
        
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    useEffect(() => {
        
    }, [])

    const phoneSchema = Yup.string()
    .matches(/^\+?[0-9]{10,15}$/, "Phone number must be 10–15 digits, and may start with +.");

    const initialValues = {
        firstName: "",
        lastName: "",
        email:"",
        phone: "",
        mobile: "",
        gender: "",
        industry: "",
        company: "",
        website: "",
        address_street: "",
        address_area: "",
        address_city: "",
        address_emirate: "",
        address_country: "",
    };

    const validationSchema = Yup.object().shape({
        firstName: Yup.string().required("First Name is required"),
        lastName: Yup.string().required("Last Name is required"),
            email: Yup.string()
      .email("Please enter a valid email address.")
      .required("Email is required."),
        phone: phoneSchema,
        mobile: phoneSchema,
        gender: Yup.string().oneOf(["Male", "Female"]).required("Gender is required"),
        industry: Yup.string().required("Industry is required"),
        company: Yup.string().required("Company is required"),
        website: Yup.string().url("Invalid URL").required("Website is required"),
        address_street: Yup.string().required("Street is required"),
        // address_area: Yup.string().required("Area is required"),
        address_city: Yup.string().required("City is required"),
        // address_emirate: Yup.string().required("Emirate is required"),
        address_country: Yup.string().required("Country is required"),
    });

    const handleSubmit = async (values, { resetForm }) => {
        try{
            setIsSubmitting(true);

            const formData = new FormData();
            for (const key in values) {
                formData.append(key, values[key]);
            }
            
            
    
            const registration_response = await fetch(
                    `${import.meta.env.VITE_SERVER_URL}/registration`,
                    {
                        method: "POST",
                        body: formData,
                    }
                );
    
                
            const registration_response_data = await registration_response.json();
        //    snackbarSignal.open({
        //         message: registration_response_data.message,
        //         messageType: registration_response_data.status
        //     });
            
            // handleNext();
    
           
        }catch (e) {
            
            // snackbarSignal.open({
            //     message: e.message,
            
            // });
            

        } finally {
            setIsSubmitting(false);
        }
    };

    return (

        <div className="registration mb-2">
         <Stepper activeStep={activeStep} alternativeLabel>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>


    {activeStep === 0 && (

            <>
                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                    >
                    {({ errors, touched }) => (
                        <Form>
                            <h2 className="py-3">Register</h2>
                            <div className="row">
                                {Object.keys(initialValues).map((key) => {
                                    let fieldElement;

                                    switch (key) {
                                        case "gender":
                                            fieldElement = (
                                                <Field
                                                    size="small"
                                                    name={key}
                                                    as={TextField}
                                                    select
                                                    fullWidth
                                                    label="Gender"
                                                    error={touched[key] && Boolean(errors[key])}
                                                    helperText={<ErrorMessage name={key} />}
                                                >
                                                    <MenuItem value="Male">Male</MenuItem>
                                                    <MenuItem value="Female">Female</MenuItem>
                                                </Field>
                                            );
                                            break;

                                        case "industry":
                                            fieldElement = (
                                                <Field
                                                    size="small"
                                                    name={key}
                                                    as={TextField}
                                                    select
                                                    fullWidth
                                                    label="Industry"
                                                    error={touched[key] && Boolean(errors[key])}
                                                    helperText={<ErrorMessage name={key} />}
                                                >
                                                    {misc[0].industries.map((v) => (
                                                        <MenuItem key={v} value={v}>
                                                            {v}
                                                        </MenuItem>
                                                    ))}
                                                </Field>
                                            );
                                            break;

                                             case "address_emirate":
                                            fieldElement = (
                                                <Field
                                                    size="small"
                                                    name={key}
                                                    as={TextField}
                                                    select
                                                    fullWidth
                                                    label="Emirate"
                                                    error={touched[key] && Boolean(errors[key])}
                                                    helperText={<ErrorMessage name={key} />}
                                                >
                                                    {misc[0].emirate.map((v) => (
                                                        <MenuItem key={v} value={v}>
                                                            {v}
                                                        </MenuItem>
                                                    ))}
                                                </Field>
                                            );
                                            break;

                                        case "address_country":
                                            fieldElement = (
                                                <Field
                                                    size="small"
                                                    name={key}
                                                    as={TextField}
                                                    select
                                                    fullWidth
                                                    label="Country"
                                                    error={touched[key] && Boolean(errors[key])}
                                                    helperText={<ErrorMessage name={key} />}
                                                >
                                                    {Object.entries(getCodeList()).map(([name, code]) => (
                                                        <MenuItem key={name} value={name}>
                                                            {code}
                                                        </MenuItem>
                                                        ))}
                                                </Field>
                                            );
                                            break;

                                        default:
                                            fieldElement = (
                                                <Field
                                                    size="small"
                                                    name={key}
                                                    as={TextField}
                                                    label={key.replace("address_", " ").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                                                    fullWidth
                                                    error={touched[key] && Boolean(errors[key])}
                                                    helperText={<ErrorMessage name={key} />}
                                                />
                                            );
                                    }

                                    return (
                                        <div className="col-12 col-md-6 mb-3" key={key}>
                                            {fieldElement}
                                        </div>
                                    );
                                })}
                            </div>

                            
                                <Button
                                    className="w-100"
                                    type="submit"
                                    variant="contained"
                                    color="secondary"
                                    style={{height: 40, fontSize: 16}}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? <CircularProgress size={20} /> : "Register"}
                                </Button>
                        </Form>

                    )}
                </Formik>
            </>
    )}
        </div>
    );
};

export default GICRegistrationForm;

import "./templateform.css";
import { Login } from "../utils/Login";
import { useEffect, useRef, useState } from "react";
import { UseFormValidator } from "../hooks/UseFormValidator";
import { UseCreateRecord } from "../hooks/UseCreateRecord";
import { Link } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import CryptoJS from 'crypto-js';

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
  
//   companyName: Yup.string()
//     .min(2, "Company name must be at least 2 characters.")
//     .required("Company name is required."),
  
  birthday: Yup.date()
    .max(new Date(), "Birthday cannot be in the future.")
    .required("Birthday is required."),
  
//   consent: Yup.boolean()
//     .oneOf([true], "You must agree to the terms and conditions."),
});


export const TemplateForm = () => {

    const [target, setTarget] = useState(null);
    const [showSubmit, setShowSubmit] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const formRegRef = useRef();
    const modalRef = useRef();



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
        const ciphertext = localStorage.getItem("gec-registration");

        if (ciphertext) {
            const bytes = CryptoJS.AES.decrypt(ciphertext, import.meta.env.VITE_LOCAL_STORAGE_KEY);
            const decryptedJson = bytes.toString(CryptoJS.enc.Utf8);
            const gecuser = JSON.parse(decryptedJson);
            if (gecuser) {
                
                setTarget(gecuser.value);
            }
        }

    }, []);


    const handleSubmitRegistration = async (values) => {
        
        debugger;
        console.log("🟢 handleSubmitRegistration fired", values);
        debugger;

    
        // const formData = {};
        // formData["eventPage"] = target;

        // Array.from(values).forEach((item) => {
        //     if (item.name) {
        //         formData[item.name] = item.value;
        //     }
        // });

        // // console.log("Form data:", formData);
        // debugger;
        // const createRecordResponse = await UseCreateRecord(
        //     formData,
        //     null,
        //     null,
        //     "registration",
        //     "create"
        // );

        // if (createRecordResponse.status) {
        //     setShowModal((prev) => !prev);
        //     modalRef.current.textContent = createRecordResponse.message;

        //     Array.from(values).forEach((item) => (item.value = ""));
        // }
    };

    if (!target) {
        return <Login />;
    }


    return (
        <>
            <div className={`template-form ${target.lockRegistration  === 'true' ? "locked-template-form" : ""}`}>
                <div >
                    <div className="target-description">
                        {target.description}
                    </div>
                    <img src={`${import.meta.env.VITE_SERVERURL}/uploads/${target.Image}`} alt={target.title} />
                </div>
                <div>
                    <Link to={"/"}>
                        <img alt="home" src="/logo-gec.png"></img>
                    </Link>
                    <div>
                        <button
                            onClick={() => {
                                setShowModal((prev) => !prev);
                                modalRef.current.textContent =
                                    "Lorem ipsum dolor sit amet consectetur adipisicing elit. Doloribus beatae natus cupiditate eaque, qui tempora quisquam voluptatem";
                            }}
                            className="cta-button simple"
                        >
                            <img alt="" src="/info.svg"></img>
                        </button>
                        <Formik
                            initialValues={initialValues}
                            validationSchema={validationSchema}
                            onSubmit={handleSubmitRegistration}
                        >
                            {({ values, setFieldValue, errors, touched }) => (
                                <Form>
                                    <h1>Please fill in the boxes below</h1>
                                    <h4>17 June 2025 - Tuesday</h4>
                                    <div className="clearance-flat"></div>

                                    <div className="full">
                                        <div className="w-100">
                                            <label>Email</label>
                                            <Field 
                                                className={`form-control ${errors.email && touched.email ? 'is-invalid' : ''}`}
                                                type="email" 
                                                name="email" />
                                        </div>
                                        <ErrorMessage name="email" component="div" className="text-danger small" />
                                    </div>

                                    <div className="full">
                                        <label>Phone Number</label>
                                        <Field 
                                            className={`form-control ${errors.phone && touched.phone ? 'is-invalid' : ''}`}
                                            // pattern="^(\+?[0-9]{1,3}-)?[0-9]{3}-[0-9]{3}-[0-9]{4}$"
                                            type="tel" 
                                            name="phone" />
                                        <ErrorMessage name="phone" component="div" className="text-danger small" />
                                    </div>

                                    <div className="full">
                                        <label>Whatsapp Number</label>
                                        <Field 
                                            className={`form-control ${errors.whatsapp && touched.whatsapp ? 'is-invalid' : ''}`}
                                            type="tel" 
                                            name="whatsapp" />
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
                                            name="firstName" />
                                        <ErrorMessage name="firstName" component="div" className="text-danger small" />
                                    </div>

                                    <div className="full">
                                        <label>Last Name</label>
                                        <Field
                                            className={`form-control ${errors.lastName && touched.lastName ? 'is-invalid' : ''}`} 
                                            type="text" 
                                            name="lastName" />
                                        <ErrorMessage name="lastName" component="div" className="text-danger small" />
                                    </div>

                                    {target.companyRequired === 'true' && (
                                        <div className="full">
                                            <label>Company Name</label>
                                            <Field 
                                                className={`form-control ${errors.companyName && touched.companyName ? 'is-invalid' : ''}`}
                                                type="text" 
                                                name="companyName" />
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
                                                    field.onChange(e);               // update Formik state
                                                    setShowSubmit(e.target.checked); // toggle your local submit button visibility
                                                }}
                                            />
                                            )}
                                        </Field>
                                    </div>
                                        <ErrorMessage
                                            name="consent"
                                            component="div"
                                            className="invalid-feedback small"
                                        />

                                   <button
                                        type="submit"
                                        onClick={() => console.log("clicked")}
                                        disabled={false}
                                        style={{ pointerEvents: 'auto', opacity: 1 }}
                                        >
                                        Submit
                                    </button>
                                </Form>
                            )}
                        </Formik>
                    </div>
                </div>
            </div>

            {target.lockRegistration  === 'true' && (<div className="locked-overlay-message">
                Registration has been closed!
            </div> )}

        </>
    );
};

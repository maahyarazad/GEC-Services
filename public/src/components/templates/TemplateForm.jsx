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
    email: Yup.string().email('Invalid email').required('Required'),
    phone: Yup.string().required('Required'),
    whatsapp: Yup.string().required('Required'),
    firstName: Yup.string().required('Required'),
    lastName: Yup.string().required('Required'),
    companyName: Yup.string().required('Required'),
    birthday: Yup.string().required('Required'),
    consent: Yup.boolean().oneOf([true], 'You must accept'),
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
                debugger;
                setTarget(gecuser.value);
            }
        }

    }, []);

    if (!target) {
        return <Login />;
    }

    const handleSubmitRegistration = async (e) => {
        e.preventDefault();
        const values = formRegRef.current.querySelectorAll("input, select");
        const validate = UseFormValidator(values);

        if (!validate) {
            return;
        }
        const formData = {};
        formData["eventPage"] = target;

        Array.from(values).forEach((item) => {
            if (item.name) {
                formData[item.name] = item.value;
            }
        });

        // console.log("Form data:", formData);

        const createRecordResponse = await UseCreateRecord(
            formData,
            null,
            null,
            "registration",
            "create"
        );

        if (createRecordResponse.status) {
            setShowModal((prev) => !prev);
            modalRef.current.textContent = createRecordResponse.message;

            Array.from(values).forEach((item) => (item.value = ""));
        }
    };

    return (
        <>
            <div className={`template-form ${target.lockRegistration  === 'true' ? "locked-template-form" : ""}`}>
                <div>
                    <p>
                        {target.description}
                    </p>
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
                            {({ values, setFieldValue }) => (
                                <Form>
                                    <h1>Please fill in the boxes below</h1>
                                    <h4>17 June 2025 - Tuesday</h4>
                                    <div className="clearance-flat"></div>

                                    <label className="full">
                                        <p>Email</p>
                                        <Field type="email" name="email" />
                                        <ErrorMessage name="email" component="div" className="text-danger small" />
                                    </label>

                                    <label className="full">
                                        <p>Phone Number</p>
                                        <Field type="tel" name="phone" />
                                        <ErrorMessage name="phone" component="div" className="text-danger small" />
                                    </label>

                                    <label className="full">
                                        <p>Whatsapp Number</p>
                                        <Field type="tel" name="whatsapp" />
                                        <ErrorMessage name="whatsapp" component="div" className="text-danger small" />
                                    </label>

                                    <div className="spacer"></div>

                                    <label className="full">
                                        <p>Gender</p>
                                        <Field as="select" name="gender">
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                        </Field>
                                    </label>

                                    <label className="full">
                                        <p>First Name</p>
                                        <Field type="text" name="firstName" />
                                        <ErrorMessage name="firstName" component="div" className="text-danger small" />
                                    </label>

                                    <label className="full">
                                        <p>Last Name</p>
                                        <Field type="text" name="lastName" />
                                        <ErrorMessage name="lastName" component="div" className="text-danger small" />
                                    </label>

                                    {target.companyRequired === 'true' && (
                                        <label className="full">
                                            <p>Company Name</p>
                                            <Field type="text" name="companyName" />
                                            <ErrorMessage name="companyName" component="div" className="text-danger small" />
                                        </label>
                                    )}

                                    {target.birthdayRequired === 'true' && (
                                        <label className="full">
                                            <p>Birthday</p>
                                            <Field
                                                name="birthday"
                                                type="date"
                                                value={selectedDate}
                                                onChange={(e) => {
                                                    setFieldValue('birthday', e.target.value);
                                                    setSelectedDate(e.target.value);
                                                }}
                                            />
                                            <ErrorMessage name="birthday" component="div" className="text-danger small" />
                                        </label>
                                    )}

                                    <label className="full d-flex gap-2 align-items-center mt-3">
                                        <Field
                                            name="consent"
                                            type="checkbox"
                                            onClick={() => setShowSubmit((prev) => !prev)}
                                        />
                                        <p>
                                            I confirm that I have a valid proof of identification and consent to present it at the venue.
                                        </p>
                                        <ErrorMessage name="consent" component="div" className="text-danger small" />
                                    </label>

                                    <div className="cta-zone">
                                        <button
                                            type="submit"
                                            className={`cta-button blue ${showSubmit ? "show" : ""}`}
                                        >
                                            <p>Submit</p>
                                        </button>
                                    </div>
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

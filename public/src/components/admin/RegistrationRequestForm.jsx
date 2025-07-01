// NewRegistrationPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import slugify from 'slugify';


const validationSchema = Yup.object({
    title: Yup.string().required('Title is required'),
    image: Yup.mixed()
        .required('Image is required')
        .test("fileSize", "File too large (max 5MB)", (value) => {
            if (!value) return true; // allow empty
            if (typeof value === "string") return true; // allow initial string (existing image)
            return value.size <= 5 * 1024 * 1024; // check file size if it's a File
        })
        .test("fileType", "Unsupported file format", (value) => {
            if (!value || typeof value === "string") return true;
            return ["image/jpeg", "image/png", "image/webp"].includes(value.type);
        }),
    tokensPerGuest: Yup.number()
        .typeError('Must be a number')
        .integer('Must be an integer')
        .positive('Must be greater than zero')
        .required('Number of tokens is required'),
    description: Yup.string().required('Description is required'),
    paymentRequired: Yup.boolean(),
    birthdayRequired: Yup.boolean(),
    companyRequired: Yup.boolean(),
    lockRegistration: Yup.boolean(),
});

export default function NewRegistrationPage({ initialData = null, modalSwitch }) {
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [slug, setSlug] = useState(null);
    const [submitError, setSubmitError] = useState('');
    const [preview, setPreview] = useState(null);

    const fileInputRef = useRef(null);
    const containerRef = useRef(null);

    const timeoutRef = useRef(null);


    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const initialValues = {
        id: initialData?.id || null,
        page: initialData?.page || '',
        paymentRequired: initialData?.paymentRequired === "true",
        birthdayRequired: initialData?.birthdayRequired === "true",
        companyRequired: initialData?.companyRequired === "true",
        lockRegistration: initialData?.lockRegistration === "true",
        title: initialData?.title || '',
        image: initialData?.Image || null,
        tokensPerGuest: initialData?.maxTokensPerGuest || '',
        description: initialData?.description || '',
    };

    useEffect(() => {
        if (initialValues.image && typeof initialValues.image === 'string') {
            setPreview(`${import.meta.env.VITE_SERVERURL}/uploads/${initialValues.image}`);
        }
    }, [initialValues.image]);


    useEffect(() => {
        if (initialValues.page && typeof initialValues.page === 'string') {
            setSlug(slugify(initialValues.page, {
                                                        lower: true,
                                                        strict: true,
                                                    }));
        }
    }, [initialValues.page]);

    const handleSubmit = async (values, { setSubmitting, resetForm }) => {
        setSubmitError('');
        setSubmitSuccess(false);

        try {
            const formData = new FormData();

            if(initialData){
                formData.append('id', initialData.id);
            }

            
            formData.append('page', slug);
            formData.append('paymentRequired', values.paymentRequired);
            formData.append('birthdayRequired', values.birthdayRequired);
            formData.append('companyRequired', values.companyRequired);
            formData.append('lockRegistration', values.lockRegistration);
            formData.append('title', values.title);
            formData.append('maxTokensPerGuest', values.tokensPerGuest);
            formData.append('description', values.description);

            if (values.image) {
                formData.append('image', values.image); // file object directly
            }

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/registration-config`, {
                method: 'POST',
                body: formData,
                // Important: Don't set 'Content-Type'; browser sets it including boundary
            });

            const data = await response.json();

            if (response.ok && data.status) {
                setSlug('');
                setSubmitSuccess(true);

                // Clear any previous timeout
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }

                // Set a new timeout
                timeoutRef.current = setTimeout(() => {
                    setSubmitSuccess(false);
                    modalSwitch();
                    setPreview(null);
                    setSlug(null);
                }, 3000);

                resetForm();

                if (fileInputRef.current) {
                    fileInputRef.current.value = null;
                }
            } else {
                setSubmitError(data.message || 'Something went wrong.');
            }
        } catch (error) {
            console.error(error);
            setSubmitError(error.message || 'Submission failed, please try again');
        } finally {
            containerRef.current?.scrollIntoView({ behavior: 'smooth' });
            setSubmitting(false);
            
        }
    };




    return (
        <div className="container py-4" ref={containerRef}>
            {submitSuccess && (
                <div className="alert alert-success">
                    Registration page saved successfully!
                </div>
            )}
            {submitError && (
                <div className="alert alert-danger">{submitError}</div>
            )}


            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                enableReinitialize={true}
                onSubmit={handleSubmit}
            >
                {({ setFieldValue, isSubmitting }) => (
                    <Form noValidate>
                        {slug && (<span className="text-muted">
                            <strong>Url will be: /{slug}</strong>
                        </span>)}

                        {/* Title */}
                        <div className="col-12">

                            <div className="d-flex justify-content-between">

                                <div className='w-50 me-2'>
                                    <label htmlFor="title" className="form-label">
                                        Title
                                    </label>

                                    <Field name="title">
                                        {({ field, form }) => (
                                            <input
                                                {...field} // includes value, name, onChange, and onBlur from Formik
                                                type="text"
                                                className="form-control"
                                                placeholder="Enter page title"
                                                onBlur={(e) => {
                                                    field.onBlur(e); // ✅ still call Formik's internal onBlur

                                                    setSlug(slugify(e.target.value, {
                                                        lower: true,
                                                        strict: true,
                                                    }))

                                                }}
                                            />
                                        )}
                                    </Field>
                                    <div style={{ minHeight: 30 }}>

                                        <ErrorMessage
                                            name="title"
                                            component="div"
                                            className="text-danger small mt-1"
                                        />
                                    </div>

                                </div>
                                <div className='w-50'>
                                    <label htmlFor="tokensPerGuest" className="form-label">
                                        Maximum Number of Token per Guest
                                    </label>
                                    <Field
                                        name="tokensPerGuest"
                                        type="number"
                                        className="form-control"
                                        placeholder="e.g. 3"
                                    />
                                    <div style={{ minHeight: 30 }}>

                                        <ErrorMessage
                                            name="tokensPerGuest"
                                            component="div"
                                            className="text-danger small mt-1"
                                        />
                                    </div>
                                </div>

                            </div>


                        </div>

                        {/* Description */}
                        <div className="col-12">
                            <div className="align-items-center">
                                <label htmlFor="description" className="form-label">
                                    Description
                                </label>
                                <Field
                                    name="description"
                                    as="textarea"
                                    className="form-control"
                                    rows="4"
                                    placeholder="Enter a brief description"
                                />
                                <div style={{ minHeight: 30 }}>

                                    <ErrorMessage
                                        name="description"
                                        component="div"
                                        className="text-danger small mt-1"
                                    />
                                </div>
                            </div>

                        </div>
                        {/* Image */}
                        <div className="col-12">
                            <div className="align-items-center">
                                <label htmlFor="image" className="form-label">
                                    Image
                                </label>
                                {preview && (
                                    <div className="mb-2">
                                        <label>Current Image:</label>
                                        <img
                                            src={preview}
                                            alt="Current"
                                            style={{ width: '150px', height: 'auto', display: 'block', marginBottom: '10px' }}
                                        />
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    id="image"
                                    name="image"
                                    type="file"
                                    accept="image/*"
                                    className="form-control"
                                    onChange={e => {
                                        const file = e.currentTarget.files[0];
                                        if (file) {
                                            setFieldValue('image', file);  // Store the File object, NOT base64
                                            setPreview(URL.createObjectURL(file)); // Set live preview
                                        }
                                    }}
                                />

                                <div style={{ minHeight: 30 }}>

                                    <ErrorMessage
                                        name="image"
                                        component="div"
                                        className="text-danger small mt-1"
                                    />
                                </div>
                            </div>

                            <div className="form-check form-switch mb-3">
                                <Field name="paymentRequired">
                                    {({ field }) => (
                                        <input
                                            name={field.name}
                                            checked={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            id="paymentRequired"
                                            className="form-check-input"
                                            type="checkbox"
                                        />
                                    )}
                                </Field>
                                <label className="form-check-label" htmlFor="paymentRequired">
                                    Payment Required
                                </label>

                            </div>

                            <div className="form-check form-switch mb-3">
                                <Field name="companyRequired">
                                    {({ field }) => (
                                        <input
                                            name={field.name}
                                            checked={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            id="companyRequired"
                                            className="form-check-input"
                                            type="checkbox"
                                        />
                                    )}
                                </Field>
                                <label className="form-check-label" htmlFor="companyRequired">
                                    Enable Company Field Required
                                </label>

                            </div>

                            <div className="form-check form-switch mb-3">
                                <Field name="birthdayRequired">
                                    {({ field }) => (
                                        <input
                                            name={field.name}
                                            checked={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            id="birthdayRequired"
                                            className="form-check-input"
                                            type="checkbox"
                                        />
                                    )}
                                </Field>
                                <label className="form-check-label" htmlFor="birthdayRequired">
                                    Enable Birthday Field Required
                                </label>

                            </div>

                                <div className="form-check form-switch mb-3">
                                <Field name="lockRegistration">
                                    {({ field }) => (
                                        <input
                                            name={field.name}
                                            checked={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            id="lockRegistration"
                                            className="form-check-input"
                                            type="checkbox"
                                        />
                                    )}
                                </Field>
                                <label className="form-check-label" htmlFor="lockRegistration">
                                    Lock Registration
                                </label>

                            </div>

                        </div>


                        <div className='col-12'>
                            <div className='d-flex justify-content-end'>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Registration Page'}
                                </button>
                            </div>
                        </div>

                    </Form>

                )}
            </Formik>
        </div>
    );
}

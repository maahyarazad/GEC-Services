// NewRegistrationPage.jsx
import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { UseCreateRecord } from '../hooks/UseCreateRecord';

const validationSchema = Yup.object({
    title: Yup.string().required('Title is required'),
    image: Yup.mixed()
        .required('Image is required')
        .test(
            'fileSize',
            'File too large (max 5MB)',
            value => !value || (value && value.size <= 5 * 1024 * 1024)
        )
        .test(
            'fileType',
            'Unsupported File Format',
            value => !value || (value && ['image/jpeg', 'image/png', 'image/gif'].includes(value.type))
        ),
    tokensPerGuest: Yup.number()
        .typeError('Must be a number')
        .integer('Must be an integer')
        .positive('Must be greater than zero')
        .required('Number of tokens is required'),
    description: Yup.string().required('Description is required'),
});

export default function NewRegistrationPage() {
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const initialValues = {
        payment: false,
        title: '',
        image: null,
        tokensPerGuest: '',
        description: '',
    };

    const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    setSubmitError('');
    setSubmitSuccess(false);

    try {
        const data = {
            payment: values.payment,
            title: values.title,
            tokensPerGuest: Number(values.tokensPerGuest),
            description: values.description,
            image: values.image, // base64 string
        };

        // Use the reusable function
        const resp = await UseCreateRecord(
            data,
            null,         // xKey
            null,         // xValue
            'access',     // xPath
            'create'      // xCommand
        );

        if (resp?.status) {
            setSubmitSuccess(true);
            resetForm();
        } else {
            setSubmitError(resp?.message || "Something went wrong.");
        }
    } catch (err) {
        console.error(err);
        setSubmitError(
            err?.message || 'Submission failed, please try again'
        );
    } finally {
        setSubmitting(false);
    }
};



    return (
        <div className="container py-4">
            {submitSuccess && (
                <div className="alert alert-success">
                    Registration page created successfully!
                </div>
            )}
            {submitError && (
                <div className="alert alert-danger">{submitError}</div>
            )}


            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ setFieldValue, isSubmitting }) => (
                    <Form noValidate>
                        {/* Title */}
                        <div className="col-12">

                            <div className="d-flex justify-content-between">
                                <div className='w-50 me-2'>
                                    <label htmlFor="title" className="form-label">
                                        Title
                                    </label>
                                    <Field
                                        name="title"
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter page title"
                                    />
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
                                <input
                                    id="image"
                                    name="image"
                                    type="file"
                                    accept="image/*"
                                    className="form-control"
                                    onChange={async e => {
                                        const file = e.currentTarget.files[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                // This sets the base64 string as the value
                                                setFieldValue('image', reader.result); // base64 string
                                            };
                                            reader.readAsDataURL(file);
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
                                <Field name="payment">
                                    {({ field }) => (
                                        <input
                                            name={field.name}
                                            checked={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            id="payment"
                                            className="form-check-input"
                                            type="checkbox"
                                        />
                                    )}
                                    </Field>
                                <label className="form-check-label" htmlFor="payment">
                                    Payment Required
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
                                    {isSubmitting ? 'Submitting…' : 'Create Page'}
                                </button>
                            </div>
                        </div>

                    </Form>

                )}
            </Formik>
        </div>
    );
}

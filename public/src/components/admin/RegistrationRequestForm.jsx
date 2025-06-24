// NewRegistrationPage.jsx
import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';

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
        title: '',
        image: null,
        tokensPerGuest: '',
        description: '',
    };

    const handleSubmit = async (values, { setSubmitting, resetForm }) => {
        setSubmitError('');
        try {
            // if you need to send files, use FormData
            const formData = new FormData();
            formData.append('title', values.title);
            formData.append('image', values.image);
            formData.append('tokensPerGuest', values.tokensPerGuest);
            formData.append('description', values.description);

            // replace with your real endpoint
            const resp = await axios.post('/api/new-registration', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (resp.status === 200) {
                setSubmitSuccess(true);
                resetForm();
            }
        } catch (err) {
            console.error(err);
            setSubmitError(
                err.response?.data?.message || 'Submission failed, please try again'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container py-5">
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
                                <div className='w-50'>
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
                                    Number of tokens per guest
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
                                    onChange={e => {
                                        setFieldValue('image', e.currentTarget.files[0]);
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

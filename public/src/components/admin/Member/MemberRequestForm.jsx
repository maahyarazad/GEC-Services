// MemberNewForm.jsx
import React, { useRef, useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import Button from '@mui/material/Button';
const validationSchema = Yup.object({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  phoneNumber: Yup.string().required('Phone number is required'),
  whatsapp: Yup.string().required('WhatsApp number is required'),
  email: Yup.string().email('Invalid email address').required('Email is required'),
  language: Yup.string().oneOf(['en', 'de', 'ar']).required('Language is required')
});

export default function MemberNewForm({ initialData = null, modalSwitch }) {
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const initialValues = {
    id: initialData?.id || null,
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    phoneNumber: initialData?.phoneNumber || '',
    whatsapp: initialData?.whatsapp || '',
    email: initialData?.email || '',
    avatar: initialData?.avatar || null,
    language: initialData?.language || 'en',
    active_member: true,
  };

  useEffect(() => {
    if (initialValues.avatar && typeof initialValues.avatar === 'string') {
      setPreview(`${import.meta.env.VITE_SERVERURL}/uploads/${initialValues.avatar}`);
    }
  }, [initialValues.avatar]);

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      const formData = new FormData();
      if (initialData) formData.append('id', initialData.id);
      formData.append('firstName', values.firstName);
      formData.append('lastName', values.lastName);
      formData.append('phoneNumber', values.phoneNumber);
      formData.append('whatsapp', values.whatsapp);
      formData.append('email', values.email);
      formData.append('language', values.language);
      if (values.avatar) formData.append('avatar', values.avatar);

      const response = await fetch(`${import.meta.env.VITE_SERVERURL}/member`, {
        method: 'POST',
        body: formData,
        credentials: "include"
      });

      const data = await response.json();
      if (response.ok && data.status) {
        setSubmitSuccess(true);
        timeoutRef.current = setTimeout(() => {
          setSubmitSuccess(false);
          modalSwitch();
          setPreview(null);
          resetForm();
        }, 3000);
        if (fileInputRef.current) fileInputRef.current.value = null;
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
      {submitSuccess && <div className="alert alert-success">Member saved successfully!</div>}
      {submitError && <div className="alert alert-danger">{submitError}</div>}

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize={true}
        onSubmit={handleSubmit}
      >
        {({ setFieldValue, errors, touched, isSubmitting }) => (
          <Form>
            <div className="row">
              <div className="col-6">
                <label htmlFor="firstName" className="form-label">First Name</label>
                <Field name="firstName" className={`form-control ${errors.firstName && touched.firstName ? 'is-invalid' : ''}`} />
                <ErrorMessage name="firstName" component="div" className="text-danger small mt-1" />
              </div>
              <div className="col-6">
                <label htmlFor="lastName" className="form-label">Last Name</label>
                <Field name="lastName" className={`form-control ${errors.lastName && touched.lastName ? 'is-invalid' : ''}`} />
                <ErrorMessage name="lastName" component="div" className="text-danger small mt-1" />
              </div>
              <div className="col-6">
                <label htmlFor="phoneNumber" className="form-label">Phone Number</label>
                <Field name="phoneNumber" className={`form-control ${errors.phoneNumber && touched.phoneNumber ? 'is-invalid' : ''}`} />
                <ErrorMessage name="phoneNumber" component="div" className="text-danger small mt-1" />
              </div>
              <div className="col-6">
                <label htmlFor="whatsapp" className="form-label">WhatsApp</label>
                <Field name="whatsapp" className={`form-control ${errors.whatsapp && touched.whatsapp ? 'is-invalid' : ''}`} />
                <ErrorMessage name="whatsapp" component="div" className="text-danger small mt-1" />
              </div>
              <div className="col-6">
                <label htmlFor="email" className="form-label">Email</label>
                <Field
                  name="email"
                  type="email"
                  className={`form-control ${errors.email && touched.email ? 'is-invalid' : ''}`}
                />
                <ErrorMessage name="email" component="div" className="text-danger small mt-1" />
              </div>
              <div className="col-6">
                <label htmlFor="language" className="form-label">Language</label>
                <Field as="select" name="language" className={`form-select ${errors.language && touched.language ? 'is-invalid' : ''}`}>
                  <option value="">Select Language</option>
                  <option value="en">English</option>
                  <option value="de">German</option>
                  <option value="ar">Arabic</option>
                </Field>
                <ErrorMessage name="language" component="div" className="text-danger small mt-1" />
              </div>
              <div className="col-6">
                <label htmlFor="avatar" className="form-label">Avatar</label>
                <input
                  type="file"
                  name="avatar"
                  ref={fileInputRef}
                  className={`form-control ${errors.avatar && touched.avatar ? 'is-invalid' : ''}`}
                  onChange={(event) => {
                    setFieldValue("avatar", event.currentTarget.files[0]);
                  }}
                />
                {preview && <img src={preview} alt="avatar preview" className="img-thumbnail mt-2" style={{ maxHeight: 100 }} />}
                <ErrorMessage name="avatar" component="div" className="text-danger small mt-1" />
              </div>
            </div>

            <div className="d-flex justify-content-end mt-3 w-100">

              <Button
                                variant='contained'
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isSubmitting}
                                    sx={{textTransform: 'none'}}
                                >
                                    {isSubmitting ? "Submitting..." : "Save Member"}
                                </Button>
              
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}

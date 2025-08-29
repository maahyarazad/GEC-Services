// NewRegistrationPage.jsx
import React, { useState, useRef, useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import slugify from "slugify";
import QuillField from "../utils/QuillField";
import eventTime from "../../assets/media/event_time.png";
import eventLocationName from "../../assets/media/event_location_name.png";
import eventNavigation from "../../assets/media/event_location_name.png";

import { Button, Tooltip, CircularProgress } from "@mui/material";
import EventLocationInput from "../utils/EventLocationInput";
import LockRegistrationSwitch from "../utils/LockRegistrationSwitch";

const validationSchema = Yup.object({
  title: Yup.string().required("Title is required"),
  send_button_text: Yup.string().required("Send Button Text is required"),

  image: Yup.mixed()
    .required('Image or video is required')
    .test("fileSize", "File too large (max 5MB)", (value) => {
      if (!value) return true;
      if (typeof value === "string") return true;
      return value.size <= 5 * 1024 * 1024;
    })
    .test("fileType", "Unsupported file format", (value) => {
      if (!value || typeof value === "string") return true;
      const supportedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/webm",
        "video/ogg"
      ];
      return supportedTypes.includes(value.type);
    }),

  tokensPerGuest: Yup.number()
    .typeError("Must be a number")
    .integer("Must be an integer")
    .positive("Must be greater than zero")
    .required("Number of tokens is required"),

  // description: Yup.string().required('Description is required'),

  event_date: Yup.date()
    .required("Event date is required")
    .min(new Date(), "Event date must be in the future"),

  // event_location_name: Yup.string()
  // .required('Event Location Name is required'),

  paymentRequired: Yup.boolean(),
  birthdayRequired: Yup.boolean(),
  companyRequired: Yup.boolean(),
  lockRegistration: Yup.boolean(),
  IdentityConsent: Yup.boolean(),
  fileUpload: Yup.boolean(),
  surveyForm: Yup.boolean(),
  gic: Yup.boolean(),
  textarea: Yup.boolean(),
  filedIcon: Yup.boolean(),
});

export default function NewRegistrationPage({
  initialData = null,
  modalSwitch,
  uniqeCodeAccess,
  disableLogin,
  enableUniqueMemberCode,
  isParentModalOpen,
}) {
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [slug, setSlug] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [initialLat, setInitialLat] = useState(null);
  const [initialLon, setInitialLon] = useState(null);

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
    page: initialData?.page || "",
    paymentRequired: initialData?.paymentRequired === "true",
    birthdayRequired: initialData?.birthdayRequired === "true",
    companyRequired: initialData?.companyRequired === "true",
    lockRegistration: initialData?.lockRegistration === "true",
    loginRequired: initialData?.loginRequired === "true",
    IdentityConsent: initialData?.IdentityConsent === "true",
    fileUpload: initialData?.fileUpload === "true",
    surveyForm: initialData?.surveyForm === "true",
    gic: initialData?.gic === "true",
    textarea: initialData?.textarea === "true",
    fieldIcon: initialData?.fieldIcon === "true",
    countDown: initialData?.countDown === "true",
    title: initialData?.title || "",
    send_button_text: initialData?.send_button_text || "Submit",
    image: initialData?.Image || null,
    tokensPerGuest: initialData?.maxTokensPerGuest || "",
    description: initialData?.description || "",
    event_date: initialData?.event_date || "",
    event_time: initialData?.event_time || "",
    event_location: initialData?.event_location || "",
    event_location_name: initialData?.event_location_name || "",
    uniqeCodeAccess: enableUniqueMemberCode ? uniqeCodeAccess : 1,
  };

  useEffect(() => {
    
    if (initialValues.image && typeof initialValues.image === "string") {
      const url = `${import.meta.env.VITE_SERVERURL}/uploads/${initialValues.image}`;
      setPreview(url);

      // Optionally fetch image and convert to File object
      fetch(url)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], initialValues.image, { type: blob.type });
          setFile(file);
        })
        .catch(() => {
          // fallback, just clear file or ignore error
          setFile(null);
        });
    }

    if (
      initialValues.event_location &&
      typeof initialValues.event_location === "string"
    ) {
      const parts = initialValues.event_location.split(", ");

      setInitialLat(parts[0]);
      setInitialLon(parts[1]);
    }
  }, [initialValues.image, initialValues.event_location]);

  useEffect(() => {
    if (initialValues.page && typeof initialValues.page === "string") {
      setSlug(
        slugify(initialValues.page, {
          lower: true,
          strict: true,
        })
      );
    }
  }, [initialValues.page]);

  // useEffect(() => {
  //   debugger;
    
  //   if(disableLogin === "true"){
  //     initialValues.loginRequired = Boolean(false);
  //   }
  // }, []);


  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const formData = new FormData();
      
      Object.entries(values).forEach(([key, value]) => {
        switch (key) {
          case "id":
            if (initialData) {
              formData.append("id", initialData.id);
            }
            break;

          case "page":
            formData.append("page", slug);
            break;

          case "tokensPerGuest": // map correctly to maxTokensPerGuest
            formData.append("maxTokensPerGuest", value);
            break;

          case "image": // handle file object directly
            if (value) {
              formData.append("image", value);
            }
            break;

          default:
            formData.append(key, value);
            break;
        }
      });
              
    
      
      const response = await fetch(
        `${import.meta.env.VITE_SERVERURL}/registration-config`,
        {
          method: "POST",
          body: formData,
          // Important: Don't set 'Content-Type'; browser sets it including boundary
        }
      );

      if (!response.ok) {
        throw new Error(response.status + " - " + response.statusText);
      }

      console.log(response);
      const data = await response.json();
      if (response.ok && data.status) {
        setSlug("");
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
          resetForm();
        }, 3000);

        if (fileInputRef.current) {
          fileInputRef.current.value = null;
        }
      } else {
        setSubmitError(data.message || "Something went wrong.");
      }
    } catch (error) {
      console.error(error);
      setSubmitError(error.message || "Submission failed, please try again");
    } finally {
      containerRef.current?.scrollIntoView({ behavior: "smooth" });
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
      {submitError && <div className="alert alert-danger">{submitError}</div>}

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize={true}
        onSubmit={handleSubmit}
      >
        {({ setFieldValue, errors, touched, values, isSubmitting }) => (
          <Form>
            {slug && (
              <span className="text-muted">
                <strong>Url will be: /{slug}</strong>
              </span>
            )}

            {/* Title */}
            <div className="col-12">
              <div className="row">
                <div className="col-6">
                  <label htmlFor="title" className="form-label">
                    Title
                  </label>

                  <Field name="title">
                    {({ field, form }) => (
                      <input
                        {...field} // includes value, name, onChange, and onBlur from Formik
                        type="text"
                        className={`form-control ${errors.title && touched.title ? "is-invalid" : ""
                          }`}
                        placeholder="Enter page title"
                        onBlur={(e) => {
                          field.onBlur(e); // ✅ still call Formik's internal onBlur

                          setSlug(
                            slugify(e.target.value, {
                              lower: true,
                              strict: true,
                            })
                          );
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

                <div className="col-6">
                  <label htmlFor="tokensPerGuest" className="form-label">
                    Maximum Number of Token per Guest
                  </label>
                  <Field
                    disabled={values.tokensPerGuest === 999999}
                    name="tokensPerGuest"
                    type="number"
                    className={`form-control ${errors.tokensPerGuest && touched.tokensPerGuest
                        ? "is-invalid"
                        : ""
                      }`}
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

            <div className="col-12">
              <div className="row">
                <div className="col-6">
                  <div className="align-items-center">
                    <label htmlFor="send_button_text" className="form-label">
                      Submit Button Text
                    </label>
                    <Field
                      name="send_button_text"
                      type="text"
                      className={`form-control ${errors.send_button_text && touched.send_button_text
                          ? "is-invalid"
                          : ""
                        }`}
                      placeholder=""
                    />
                    <div style={{ minHeight: 30 }}>
                      <ErrorMessage
                        name="send_button_text"
                        component="div"
                        className="text-danger small mt-1"
                      />
                    </div>
                  </div>
                </div>

                {(values.surveyForm === false && values.gic === false) && (

                  <div className="col-6">
                    <div className="align-items-center">
                      <label htmlFor="event_date" className="form-label">
                        Event Date
                      </label>
                      <Field
                        name="event_date"
                        type="date"
                        className={`form-control ${errors.event_date && touched.event_date
                            ? "is-invalid"
                            : ""
                          }`}
                        placeholder="Select event date"
                        style={{ minHeight: 38 }}
                      />
                      <div style={{ minHeight: 30 }}>
                        <ErrorMessage
                          name="event_date"
                          component="div"
                          className="text-danger small mt-1"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {(values.fileUpload === false && values.surveyForm === false && values.gic === false) && (
              <div className="col-12">
                <div className="row">
                  <div className="col-6">
                    <div className="align-items-center">
                      <label htmlFor="event_time" className="form-label">
                        Event Time
                      </label>
                      <Tooltip
                        title={
                          <div className="d-flex flex-column align-items-center text-center">
                            <img
                              src={eventTime}
                              alt="Lock icon"
                              style={{
                                width: 290,
                                height: 150,
                                borderRadius: 10,
                                objectFit: "contain", // or 'cover', depending on your need
                                imageRendering: "crisp-edges", // or 'crisp-edges' or 'pixelated' for specific use cases
                              }}
                              className=""
                            />
                            <span>
                              This field will also be used in the registration
                              email. If filled in, the event time (e.g., "9:00
                              PM — Gates open at 9:15 PM") will appear in the
                              email sent to the registrant.
                            </span>
                          </div>
                        }
                        componentsProps={{
                          tooltip: {
                            sx: { fontSize: 14 },
                          },
                        }}
                      >
                        <Field
                          name="event_time"
                          type="text"
                          className={`form-control ${errors.event_time && touched.event_time
                              ? "is-invalid"
                              : ""
                            }`}
                          placeholder="Event Time"
                        />
                      </Tooltip>
                      <div style={{ minHeight: 30 }}>
                        <ErrorMessage
                          name="event_time"
                          component="div"
                          className="text-danger small mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <EventLocationInput
                    initialLat={initialLat}
                    initialLon={initialLon}
                    errors={errors}
                    touched={touched}
                    setFieldValue={setFieldValue}
                    isParentModalOpen={isParentModalOpen}
                  />
                  {/* <div className='col-6'>

                                        <div className="align-items-center">
                                            <label htmlFor="event_location" className="form-label">
                                                Event Location
                                            </label>
                                            
                                                <Field
                                                    name="event_location"
                                                    type="text"
                                                    className={`form-control ${errors.event_location && touched.event_location ? 'is-invalid' : ''}`}
                                                    placeholder="Event Location"
                                                    style={{ minHeight: 38 }}
                                                />
                                        

                                            <div style={{ minHeight: 30 }}>
                                                <ErrorMessage
                                                    name="event_location"
                                                    component="div"
                                                    className="text-danger small mt-1"
                                                />
                                            </div>
                                        </div>
                                    </div> */}
                </div>

                <div className="row">
                  <div className="col-6">
                    <div className="align-items-center">
                      <label
                        htmlFor="event_location_name"
                        className="form-label"
                      >
                        Event Location Name
                      </label>
                      <Tooltip
                        title={
                          <div className="d-flex flex-column align-items-center text-center">
                            <img
                              src={eventLocationName}
                              alt="Lock icon"
                              style={{
                                width: 290,
                                height: 150,
                                borderRadius: 10,
                                objectFit: "contain", // or 'cover', depending on your need
                                imageRendering: "crisp-edges", // or 'crisp-edges' or 'pixelated' for specific use cases
                              }}
                              className=""
                            />
                            <span>
                              This field will also be used in the registration
                              email. If filled in, the location name shown above
                              will appear in the email sent to the registrant.
                            </span>
                          </div>
                        }
                        componentsProps={{
                          tooltip: {
                            sx: { fontSize: 14 },
                          },
                        }}
                      >
                        <Field
                          name="event_location_name"
                          type="text"
                          className={`form-control ${errors.event_location_name &&
                              touched.event_location_name
                              ? "is-invalid"
                              : ""
                            }`}
                          placeholder="Event Location Name"
                        />
                      </Tooltip>
                      <div style={{ minHeight: 30 }}>
                        <ErrorMessage
                          name="event_location_name"
                          component="div"
                          className="text-danger small mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="col-12">
              <div className="align-items-center">
                <label htmlFor="description" className="form-label">
                  Description
                </label>
                <QuillField name="description" />

                {/* <Field
                                    name="description"
                                    as="textarea"
                                    className={`form-control ${errors.description && touched.description ? 'is-invalid' : ''}`}
                                    rows="4"
                                    placeholder="Enter a brief description"
                                /> */}
                {/* <div style={{ minHeight: 30 }}>

                                    <ErrorMessage
                                        name="description"
                                        component="div"
                                        className="text-danger small mt-1"
                                    />
                                </div> */}
              </div>
            </div>
            {/* Image */}
            <div className="col-12">
              <div className="align-items-center">
                <label htmlFor="image" className="form-label">
                  Image | Video
                </label>
                {preview && file && (
                  <div className="mb-2">
                    <label>Current Media:</label>
                    {file.type.startsWith('video') ? (
                      <video
                        src={preview}
                        loop
                        autoPlay
                        muted
                        playsInline
                        style={{ width: '150px', height: 'auto', display: 'block', marginBottom: '10px' }}
                      />
                    ) : (
                      <img
                        src={preview}
                        alt="Current"
                        style={{ width: '150px', height: 'auto', display: 'block', marginBottom: '10px' }}
                      />
                    )}
                  </div>
                )}


                <input
                  ref={fileInputRef}
                  id="image"
                  name="image"
                  type="file"
                  accept="image/*,video/*"
                  className={`form-control ${errors.image && touched.image ? "is-invalid" : ""
                    }`}
                  onChange={(e) => {
                    const file = e.currentTarget.files[0];
                    if (file) {
                      setFile(file); // store file to check type later
                      setFieldValue("image", file);
                      setPreview(URL.createObjectURL(file));
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

              <div className="row">
                <div className="col-6">
                  <div className="pb-3">Registration Settings</div>

 <div className="form-check form-switch mb-3">
                    <Field name="loginRequired">
                      {({ field }) => (
                        <input
                          name={field.name}
                          checked={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          id="loginRequired"
                          className="form-check-input"
                          type="checkbox"
                        />
                      )}
                    </Field>
                    <label className="form-check-label" htmlFor="loginRequired">
                      Login Required
                    </label>
                  </div>

                  {values.fileUpload === false && (
                    <>
                      {(values.surveyForm === false) && (

                        <div className="form-check form-switch mb-3">
                          <Field name="gic">
                            {({ form, field }) => (
                              <input
                                name={field.name}
                                checked={field.value}
                                onChange={(e) => {
                                  // First call Formik's handler
                                  field.onChange(e);

                                  // Then add your custom logic
                                  if (e.target.checked) {

                                    const today = new Date();
                                    today.setDate(today.getDate() + 1);
                                    form.setFieldValue("event_date", today);
                                    form.setFieldValue("tokensPerGuest", 999999);
                                  } else {

                                    form.setFieldValue("event_date", null);
                                    form.setFieldValue("tokensPerGuest", 1);
                                  }
                                }}
                                onBlur={field.onBlur}
                                id="gic"
                                className="form-check-input"
                                type="checkbox"
                              />
                            )}
                          </Field>
                          <label className="form-check-label" htmlFor="gic">
                            German Industrial Club
                          </label>
                        </div>
                      )}

                      {(values.gic === false) && (

                        <div className="form-check form-switch mb-3">
                          <Field name="surveyForm">
                            {({ form, field }) => (
                              <input
                                name={field.name}
                                checked={field.value}
                                onChange={(e) => {
                                  // First call Formik's handler
                                  field.onChange(e);

                                  // Then add your custom logic
                                  if (e.target.checked) {

                                    const today = new Date();
                                    today.setDate(today.getDate() + 1);
                                    form.setFieldValue("event_date", today);
                                    form.setFieldValue("tokensPerGuest", 999999);
                                  } else {

                                    form.setFieldValue("event_date", null);
                                    form.setFieldValue("tokensPerGuest", 1);
                                  }
                                }}
                                onBlur={field.onBlur}
                                id="surveyForm"
                                className="form-check-input"
                                type="checkbox"
                              />
                            )}
                          </Field>
                          <label className="form-check-label" htmlFor="surveyForm">
                            Survey Form
                          </label>
                        </div>
                      )}
                    </>


                  )}
                  {(values.surveyForm === false && values.gic === false) && (

                    <div className="form-check form-switch mb-3">
                      <Field name="fileUpload">
                        {({ field }) => (
                          <input
                            name={field.name}
                            checked={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            id="fileUpload"
                            className="form-check-input"
                            type="checkbox"
                          />
                        )}
                      </Field>
                      <label className="form-check-label" htmlFor="fileUpload">
                        File Upload Required
                      </label>
                    </div>
                  )}

                  <div className="form-check form-switch mb-3">
                    <Field name="textarea">
                      {({ field }) => (
                        <input
                          name={field.name}
                          checked={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          id="textarea"
                          className="form-check-input"
                          type="checkbox"
                        />
                      )}
                    </Field>
                    <label className="form-check-label" htmlFor="textarea">
                      Textarea for Messaging Required
                    </label>
                  </div>

                  <div className="form-check form-switch mb-3">
                    <Field name="IdentityConsent">
                      {({ field }) => (
                        <input
                          name={field.name}
                          checked={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          id="IdentityConsent"
                          className="form-check-input"
                          type="checkbox"
                        />
                      )}
                    </Field>
                    <label
                      className="form-check-label"
                      htmlFor="IdentityConsent"
                    >
                      Identity Consent Check-box Required
                    </label>
                  </div>

                  <LockRegistrationSwitch />
                  {/* <div className="form-check form-switch mb-3">
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

                                    </div> */}

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
                    <label
                      className="form-check-label"
                      htmlFor="paymentRequired"
                    >
                      Payment Required
                    </label>
                  </div>
                </div>
                <div className="col-6">
                  <div className="pb-3">Optional Fields</div>

                  <div className="form-check form-switch mb-3">
                    <Field name="countDown">
                      {({ field }) => (
                        <input
                          name={field.name}
                          checked={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          id="countDown"
                          className="form-check-input"
                          type="checkbox"
                        />
                      )}
                    </Field>
                    <label className="form-check-label" htmlFor="countDown">
                      Enable Countdown Timer
                    </label>
                  </div>

                  <div className="form-check form-switch mb-3">
                    <Field name="fieldIcon">
                      {({ field }) => (
                        <input
                          name={field.name}
                          checked={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          id="fieldIcon"
                          className="form-check-input"
                          type="checkbox"
                        />
                      )}
                    </Field>
                    <label className="form-check-label" htmlFor="fieldIcon">
                      Enable Field Icons
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
                    <label
                      className="form-check-label"
                      htmlFor="birthdayRequired"
                    >
                      Enable Birthday Field Required
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
                    <label
                      className="form-check-label"
                      htmlFor="companyRequired"
                    >
                      Enable Company Field Required
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="d-flex justify-content-end">
                <Button
                variant="contained"
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                sx={{ textTransform: "none", position: "relative" }}
              >
                {isSubmitting ? (
                  <>
                    <CircularProgress
                      size={20}
                      sx={{
                        color: "white",
                        marginRight: 1,
                      }}
                    />
                    Saving...
                  </>
                ) : (
                  "Save Registration Page"
                )}
              </Button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}

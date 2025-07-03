import { useState, useRef } from "react";
import Modal from "./Modal";
import CustomButton from "./CustomButton";
import * as Yup from "yup";
import { Formik, Form, Field, ErrorMessage } from "formik";
import axios from "axios";
import { GiPaperClip } from "react-icons/gi";
import { GoTrash } from "react-icons/go";
import { toast } from "react-toastify";

const wordCount = (str) => {
  return str.trim().split(/\s+/).length;
};

const validationSchema = Yup.object({
  firstname: Yup.string().required("First Name is required"),
  lastname: Yup.string().required("Last name is required"),
  email: Yup.string()
    .required("E-mail is required")
    .email("Please enter a valid e-mail address"),
  phonenumber: Yup.string()
    .required("Phone Number is required")
    .matches(/^[0-9\s\-()+]+$/, "Phone Number must not contain letters"),
  message: Yup.string()
    .required("Message is required")
    .test(
      "word-count",
      "Message must be 300 words or less",
      (value) => !value || wordCount(value) <= 300
    ),
  attachment: Yup.mixed()
    .required("Attachment is required")
    .test(
      "fileSize", // Test name
      "File size must be less than 5MB", // Error message
      function (value) {
        // If no file is provided, skip the check (this allows optional files)
        if (!value) return true;

        // Return true if file size is <= 5MB
        return value.size <= 5 * 1024 * 1024;
      }
    ),
});

const AwardRegistration = () => {
  const fileInputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState("");
  const server_api = `${
    import.meta.env.VITE_SERVER_URL
  }/api/golder-adler-request`;

  const initialValues = {
    timestamp: new Date().toISOString(),
    firstname: "",
    lastname: "",
    company: "",
    email: "",
    phonenumber: "",
    message: "",
    attachment: null,
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event, setFieldValue) => {
    const file = event.currentTarget.files[0];

    if (file) {
      setFieldValue("attachment", file);
      setAttachedFileName(file.name);
    } else {
      setAttachedFileName("");
    }
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    const form = new FormData();
    form.append("timestamp", values.timestamp);
    form.append("message", values.message);
    form.append("fullname", values.fullname);
    form.append("email", values.email);
    form.append("phonenumber", values.phonenumber);

    if (values.attachment) {
      form.append("attachment", values.attachment);
    }

    try {
      const response = await axios.post(server_api, form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log(response.data);
      toast.success(response.data.message);
      resetForm();
      setAttachedFileName("");
      setIsOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <CustomButton
        type="button"
        onClick={() => setIsOpen(true)}
        style={{ backgroundColor: "var(--primary-color)" }}
      >
        Submit an Application
      </CustomButton>

      <Modal isOpen={isOpen} onRequestClose={() => setIsOpen(false)}>
        <div className="mt-4">
          <div className="row mt-4">
            <div className="col-12 p-4 pt-0">
              <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
              >
                {({ values, setFieldValue, errors, touched, isSubmitting }) => (
                  <Form>
                    <Field
                      name="timestamp"
                      type="hidden"
                      value={new Date().toISOString()}
                    />
                    {/* FullName */}
                    <h2 style={{ textAlign: "center" }}>
                      Application<br></br>The Golden Adler Award
                    </h2>
                    <div className="row">
                      <div className=" col-md-6 align-items-center">
                        <label
                          htmlFor="fullName"
                          className="col-form-label text-start custom-form-label"
                        >
                          First Name
                        </label>
                        <div className="">
                          <div className="input-group">
                            <Field
                              name="firstname"
                              type="text"
                              placeholder="First Name"
                              className={`form-control ${
                                errors.firstname && touched.firstname
                                  ? "is-invalid"
                                  : ""
                              }`}
                            />
                          </div>

                          <div
                            style={{ minHeight: "22px" }}
                            className="text-start"
                          >
                            <ErrorMessage
                              name="firstname"
                              component="div"
                              className="text-danger small"
                            />
                          </div>
                        </div>
                      </div>

                      <div className=" col-md-6 align-items-center">
                        <label
                          htmlFor="lastname"
                          className="col-form-label text-start custom-form-label"
                        >
                          Last Name
                        </label>
                        <div className="">
                          <div className="input-group">
                            <Field
                              name="lastname"
                              type="text"
                              placeholder="Last Name"
                              className={`form-control ${
                                errors.lastname && touched.lastname
                                  ? "is-invalid"
                                  : ""
                              }`}
                            />
                          </div>

                          <div
                            style={{ minHeight: "22px" }}
                            className="text-start"
                          >
                            <ErrorMessage
                              name="lastname"
                              component="div"
                              className="text-danger small"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className=" col-md-6 align-items-center">
                      <label
                        htmlFor="lastname"
                        className="col-form-label text-start custom-form-label"
                      >
                        Company
                      </label>
                      <div className="">
                        <div className="input-group">
                          <Field
                            name="company"
                            type="text"
                            placeholder="Company"
                            className={`form-control ${
                              errors.lastname && touched.lastname
                                ? "is-invalid"
                                : ""
                            }`}
                          />
                        </div>

                        <div
                          style={{ minHeight: "22px" }}
                          className="text-start"
                        >
                          <ErrorMessage
                            name="company"
                            component="div"
                            className="text-danger small"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      {/* Email */}
                      <div className="col-md-6 align-items-center">
                        <label
                          htmlFor="email"
                          className="col-form-label text-start custom-form-label"
                        >
                          E-mail
                        </label>
                        <div>
                          <div className="input-group">
                            <Field
                              name="email"
                              type="email"
                              placeholder="example@domain.com"
                              className={`form-control ${
                                errors.email && touched.email
                                  ? "is-invalid"
                                  : ""
                              }`}
                            />
                          </div>
                          <div
                            style={{ minHeight: "22px" }}
                            className="text-start"
                          >
                            <ErrorMessage
                              name="email"
                              component="div"
                              className="text-danger small"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Phone Number */}
                      <div className="col-md-6 align-items-center">
                        <label
                          htmlFor="phonenumber"
                          className="col-form-label text-start custom-form-label"
                        >
                          Mobile Number
                        </label>
                        <div>
                          <div className="input-group">
                            <Field
                              name="phonenumber"
                              type="text"
                              placeholder="50 123 4567"
                              className={`form-control ${
                                errors.phonenumber && touched.phonenumber
                                  ? "is-invalid"
                                  : ""
                              }`}
                            />
                          </div>
                          <div
                            style={{ minHeight: "22px" }}
                            className="text-start"
                          >
                            <ErrorMessage
                              name="phonenumber"
                              component="div"
                              className="text-danger small"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="align-items-center">
                      <label
                        htmlFor="message"
                        className="col-sm-3 col-form-label text-start custom-form-label"
                      >
                        Message
                      </label>
                      <div className="">
                        <div className="input-group">
                          <Field
                            name="message"
                            as="textarea"
                            rows="3"
                            placeholder="Explain why you believe you deserve a Golden Adler Award."
                            className={`form-control ${
                              errors.message && touched.message
                                ? "is-invalid"
                                : ""
                            }`}
                          />
                        </div>

                        <div
                          style={{ minHeight: "22px" }}
                          className="text-start"
                        >
                          <ErrorMessage
                            name="message"
                            component="div"
                            className="text-danger small"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between col-12 p-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="attachment"
                        name="attachment"
                        className="d-none "
                        accept=".doc, .pdf, .csv, .xlsx, .zip, .docx, .md, .pptx, .json"
                        onChange={(e) => handleFileChange(e, setFieldValue)}
                      />
                    </div>

                    <div className="row" style={{ minHeight: "0.5em" }}>
                      <div className="col-12 d-flex flex-column">
                        <div>
                          <small>
                            Please attach any documentation to support your
                            application.
                          </small>
                        </div>
                        <div>
                          <CustomButton
                            onClick={triggerFileInput}
                            title="Attach a file (.doc, .pdf, .csv, .xlsx, .zip, .docx, .md, .pptx)"
                            style={{
                              backgroundColor: "white",
                              color: "var(--primary-color)",
                            }}
                          >
                            <GiPaperClip size={18} />
                            Attach File
                          </CustomButton>
                          <ErrorMessage
                            name="attachment"
                            component="span"
                            className="text-danger d-block mt-1"
                          />
                        </div>
                        <div
                          className="d-flex justify-content-between"
                          style={{ minHeight: "40px" }}
                        >
                          {attachedFileName && (
                            <div
                              className="attached-file-name text-white d-flex align-items-center"
                              style={{ marginTop: "0.5em" }}
                            >
                              <span>
                                Selected file:{" "}
                                <strong>{attachedFileName}</strong>
                              </span>

                              <button
                                type="button"
                                className="btn btn-sm text-white"
                                style={{ minHeight: "28px" }}
                                onClick={() => {
                                  setAttachedFileName("");
                                  if (fileInputRef.current) {
                                    fileInputRef.current.value = "";
                                  }
                                  setFieldValue("attachment", null);
                                }}
                              >
                                <GoTrash size={20} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="col-12">
                        <div className="d-flex justify-content-start">
                          <CustomButton
                            type="submit"
                            disabled={isSubmitting}
                            style={{ backgroundColor: "var(--primary-color)" }}
                          >
                            {isSubmitting ? "Submiting..." : "Submit"}
                          </CustomButton>
                        </div>
                      </div>

                      {/* <div className="col-12">
                                                <p className="form-text mt-3">
                                                    By submitting, you agree to our{" "}
                                                    <a
                                                        href="https://google.com"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-decoration-underline">
                                                        Privacy Policy
                                                    </a>.
                                                </p>
                                            </div> */}
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AwardRegistration;

import * as React from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import dayjs from "dayjs";

import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TextField } from "@mui/material";

// Validation schema with Yup
const validationSchema = Yup.object().shape({
  birthday: Yup.date()
    .nullable()
    .required("Birthday is required")
    .max(new Date(), "Birthday must be in the past"),
});

export default function BirthdayForm() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Formik
        initialValues={{ birthday: null }}
        validationSchema={validationSchema}
        onSubmit={(values) => {
          console.log("Form submitted:", values);
        }}
      >
        {({ values, setFieldValue, touched, errors, handleSubmit }) => (
          <Form onSubmit={handleSubmit} style={{ padding: 20 }}>
            <DatePicker
              label="Birthday"
              value={values.birthday ? dayjs(values.birthday) : null}
              onChange={(newValue) => {
                setFieldValue(
                  "birthday",
                  newValue ? newValue.toISOString() : null
                );
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: "small",
                  error: touched.birthday && Boolean(errors.birthday),
                  helperText: touched.birthday && errors.birthday,
                },
              }}
            />

            <button type="submit" style={{ marginTop: 20 }}>
              Submit
            </button>
          </Form>
        )}
      </Formik>
    </LocalizationProvider>
  );
}

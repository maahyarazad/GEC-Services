import React from "react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TextField } from "@mui/material";

export default function BirthdayField({ values, setFieldValue, errors, touched }) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
     <DatePicker
          label="Birthday"
          value={values.birthday ? new Date(values.birthday) : null}
          onChange={(newValue) => {
            setFieldValue(
              'birthday',
             true
            );
          }}
          slotProps={{
            textField: {
              fullWidth: true,
              error: touched.birthday && Boolean(errors.birthday),
              helperText: touched.birthday && errors.birthday,
            },
          }}
        />
    </LocalizationProvider>
  );
}



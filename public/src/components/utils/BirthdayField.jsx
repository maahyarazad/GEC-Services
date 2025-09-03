
import * as React from "react";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import TextField from "@mui/material/TextField";
import dayjs from "dayjs";


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



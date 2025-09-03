
import * as React from "react";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import TextField from "@mui/material/TextField";
import dayjs from "dayjs";

export function CustomDateTimePicker() {
  const [value, setValue] = React.useState(null);

  // Define min and max times (today's date with hours)
  const minTime = dayjs().hour(14).minute(0); // 14:00 → 2 PM
  const maxTime = dayjs().hour(18).minute(0); // 18:00 → 6 PM

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateTimePicker
        label="Choose your Time"
        value={value}
        onChange={setValue}
        minTime={minTime}
        maxTime={maxTime}
        slotProps={{
          textField: {
            size: "small",
            fullWidth: true,
          },
        }}
        minutesStep={15} // slots at 00, 15, 30, 45
        ampm={false}     // 24h format
      />
    </LocalizationProvider>
  );
}

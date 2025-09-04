import * as React from "react";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import TextField from "@mui/material/TextField";
import dayjs from "dayjs";

export function CustomDateTimePicker() {
  const [value, setValue] = React.useState(null);

  // Reserved slots (unavailable) on 2025-09-03
  const reservedSlots = [
    dayjs("2025-09-03T14:00"),
    dayjs("2025-09-03T14:15"),
    dayjs("2025-09-03T15:45"),
    
  ];

  const shouldDisableTime = (timeValue, clockType) => {
    if (!value) return false;

    const current = dayjs(value); // wrap value in dayjs

    if (clockType === "hours") {
      return reservedSlots
        .filter(slot => slot.isSame(current, "day"))
        .every(slot => slot.hour() === timeValue);
    }

  if (clockType === "minutes") {
    const hourBeingSelected = current.hour();
    const reservedMinutes = reservedSlots
      .filter(
        slot =>
          slot.isSame(current, "day") &&
          slot.hour() === hourBeingSelected
      )
      .map(slot => slot.minute());

    const minute = timeValue.minute ? timeValue.minute() : timeValue; // extract minute if dayjs
    const res = reservedMinutes.includes(minute);
    console.log("TimeValue:", minute, "Reserved:", res);
    return res;
  }

    return false;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateTimePicker
        label="Choose your Time"
        value={value}
        onChange={setValue}
        minTime={dayjs("2025-09-03T10:00")}
        maxTime={dayjs("2025-09-03T16:45")}
        minutesStep={15}
        ampm={false}
        slotProps={{
          openPickerIcon: { fontSize: "small" },
          textField: { size: "small", fullWidth: true },
        }}
        shouldDisableTime={shouldDisableTime}
      />
    </LocalizationProvider>
  );
}

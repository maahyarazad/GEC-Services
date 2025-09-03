import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import dayjs from "dayjs";

export default function BirthdayField({ values, setFieldValue, setFieldTouched, errors, touched }) {
  const birthdayValue = values.birthday ? dayjs(values.birthday) : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label="Birthday"
        value={values.birthday ? dayjs(values.birthday) : null}
        onChange={(newValue) => {
    setFieldValue("birthday", newValue ? newValue.format("YYYY-MM-DD") : "");
    console.log(newValue);
    console.log(values.birthday);
  }}
       
        
        slotProps={{
          textField: {
            name: "birthday",
            size: "small",
            fullWidth: true,
            error: touched.birthday && Boolean(errors.birthday),
            helperText: errors.birthday,
            onBlur: () => setFieldTouched("birthday", true),InputLabelProps: {
        shrink: true, // ✅ forces the label to float
      },
            
          },
        }}
      />
    </LocalizationProvider>
  );
}

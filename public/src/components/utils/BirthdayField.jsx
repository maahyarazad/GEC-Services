import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import dayjs from "dayjs";
import { useEffect } from "react";

export default function BirthdayField({ values, setFieldValue, setFieldTouched, errors, touched, size='small' , setWizardState}) {
  const birthdayValue = values.birthday ? dayjs(values.birthday) : null;

  useEffect(()=>{
    console.log(values)
  },[])

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className="pb-2">
      <DatePicker

        label="Birthday"
        value={values.birthday ? dayjs(values.birthday) : null}
        onChange={(newValue) => {
          const value = newValue;

    setFieldValue("birthday", value ? value.format("YYYY-MM-DD") : "");
                 if(setWizardState !== null){

                   setWizardState((prev) => ({
                       ...prev,
                       member: { ...prev.member, birthday: value.format("YYYY-MM-DD") },
                   }));
                 }                 
   
  }}
       
        
        slotProps={{
          textField: {
            name: "birthday",
            size: size,
            fullWidth: true,
            error: touched.birthday && Boolean(errors.birthday),
            helperText: errors.birthday,
            onBlur: () => setFieldTouched("birthday", true),InputLabelProps: {
        shrink: true, // ✅ forces the label to float
      },
            
          },
        }}
      />
      </div>
    </LocalizationProvider>
  );
}

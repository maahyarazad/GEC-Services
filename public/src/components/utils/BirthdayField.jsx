import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

export default function BirthdayField({
    values,
    setFieldValue,
    setFieldTouched,
    errors,
    touched,
    size = "small",
    setWizardState,
}) {
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div className="pb-2" style={{ width: "100%" }}>
                <DatePicker
                    label="Birthday"
                    value={values.birthday ? dayjs(values.birthday) : null}
                    onChange={(newValue) => {
                        const formattedValue = newValue ? newValue.format("YYYY-MM-DD") : "";

                        setFieldValue("birthday", formattedValue);

                        if (setWizardState) {
                            setWizardState((prev) => ({
                                ...prev,
                                member: {
                                    ...prev.member,
                                    birthday: formattedValue,
                                },
                            }));
                        }
                    }}
                    slotProps={{
                        textField: {
                            name: "birthday",
                            size,
                            fullWidth: true,
                            sx: {
                                width: "100%",
                              "& .MuiPickersInputBase-root.MuiPickersInputBase-root": {
    minHeight: 53,
  },
                               
                            },
                            error: touched.birthday && Boolean(errors.birthday),
                            helperText: touched.birthday ? errors.birthday : "",
                            onBlur: () => setFieldTouched("birthday", true),
                            InputLabelProps: {
                                shrink: true,
                            },
                        },
                    }}
                />
            </div>
        </LocalizationProvider>
    );
}
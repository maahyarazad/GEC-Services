import * as React from "react";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs from "dayjs";
import { PickersActionBar } from "@mui/x-date-pickers/PickersActionBar";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

export default function CustomDateTimePicker({
    target,
    setFieldValue,
    setFieldTouched,
    errors,
    touched,
    values,
    name
}) {

    const [metadata, setMetaData] = React.useState(null);
    const [reservedSlots, setReservedSlots] = React.useState([]);
    const [minTime, setMinTime] = React.useState(null);
    const [maxTime, setMaxTime] = React.useState(null);
    const errorText = touched[name] && errors[name];

    
    const availableSlots = [];
    


    React.useEffect(() => {
        
        
        if (target.metadata_json) {
        try {
        // If it's already an object, skip parsing
        const parsed = typeof target.metadata_json === "string"
            ? JSON.parse(target.metadata_json)
            : target.metadata_json;

            
            setMetaData(parsed);
        } catch (e) {
         console.error("Invalid metadata_json:", target.metadata_json, e);
        }
    }
    }, [target]);

    React.useEffect(() => {
    if (metadata !== null) {

        const dateObj = new Date(target.event_date);
        
        

        for (const [hour, value] of Object.entries(metadata.slots)) {
            
        // clone the base date (important: avoid mutating dateObj directly)
            const slotDate = new Date(dateObj);
            slotDate.setHours(Number(hour), 0, 0, 0); // set hour, reset minutes/seconds
            availableSlots.push({ date: slotDate, status: value });
            // we check if the value is not NULL it means the slot has been taken

            if(value !== null){
                  
                setReservedSlots((prev) => [
                    ...prev,
                    value
                ]);
            }
        }

        


        if (availableSlots.length > 0) {
            const minSlot = new Date(availableSlots[0].date);
            const maxSlot = new Date(availableSlots[availableSlots.length - 1].date);


            setMinTime(dayjs(minSlot));
            setMaxTime(dayjs(maxSlot));
        }

    }
    }, [metadata]);


    React.useEffect(() => {
        if (minTime && maxTime) {
            
        }
        }, [minTime, maxTime, reservedSlots]);
    

    const shouldDisableHours = (value, view) => {

        if (view === 'hours') {
            // Maahyar CM: Iterates over the array until a condition is true.
            return reservedSlots.some(slot => slot.hour === value.hour());
        }
        // Return false for other views (minutes, seconds)
        return false;
    };


    // const shouldDisableTime = (timeValue, clockType) => {
    //     if (!values[name]) return false;

    //     const current = dayjs(values[name]); // wrap value in dayjs

    //     if (clockType === "hours") {
    //         return reservedSlots
    //             .filter(slot => slot.isSame(current, "day"))
    //             .every(slot => slot.hour() === timeValue);
    //     }

    //     if (clockType === "minutes") {
    //         const hourBeingSelected = current.hour();
    //         const reservedMinutes = reservedSlots
    //             .filter(
    //                 slot =>
    //                     slot.isSame(current, "day") &&
    //                     slot.hour() === hourBeingSelected
    //             )
    //             .map(slot => slot.minute());

    //         const minute = timeValue.minute ? timeValue.minute() : timeValue; // extract minute if dayjs
    //         const res = reservedMinutes.includes(minute);
    //         console.log("TimeValue:", minute, "Reserved:", res);
    //         return res;
    //     }

    //     return false;
    // };

    return (

            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <TimePicker
                    label="Select Time"
                        value={values[name] ? dayjs(values[name]).local() : null}
                        defaultValue={dayjs(target.event_date).local()}
                        views={['hours']}
                    minTime={minTime}
                    maxTime={maxTime}
                    minutesStep={15}
                    ampm={false}
                    shouldDisableTime={shouldDisableHours}
                    slots={{
                        actionBar: PickersActionBar,
                    }}
                   onChange={(newValue) => {
                        if (newValue) {
                            // Convert to UTC ISO string before saving to Formik
                            const utcValue = dayjs(newValue).utc().format(); // e.g., "2025-09-23T09:00:00Z"
                            setFieldValue(name, utcValue);
                        } else {
                            setFieldValue(name, null);
                        }
                    }}
                    // onAccept={() => setFieldTouched(name, true)} // mark as touched on confirm
                    // onClose={() => setFieldTouched(name, true)}  // mark as touched on close
                    //   onError={(newError) => {
                    //     console.log(newError)
                    //     setError(newError)}}
                    slotProps={{
                        textField: {
                            size: "small",
                            fullWidth: true,
                            error: Boolean(errorText),
                            helperText: errorText,
                        },
                        actionBar: {

                            sx: {
                                "& .MuiButton-root": {
                                    textTransform: "none", // lowercase
                                    fontSize: "0.8rem",
                                    padding: "2px 10px",
                                },
                                "& .MuiButton-textPrimary": {
                                    color: "black", // accept button
                                },
                                "& .MuiButton-textSecondary": {
                                    color: "black", // cancel button
                                },
                            },
                        },
                    }}
                />



            </LocalizationProvider>
        // <LocalizationProvider dateAdapter={AdapterDayjs}>


        //     <DateTimePicker
        //         label="Select Time"
        //         value={values[name] || null}
        //         views={['hours']}
        //         onChange={(newValue) => { setFieldValue(name, newValue);}}
        //         minTime={dayjs("2025-09-19T10:00")}
        //         maxTime={dayjs("2025-09-19T18:00")}
        //         minutesStep={15}
        //         ampm={false}
        //         shouldDisableTime={shouldDisableHours}
        //         slots={{
        //             actionBar: PickersActionBar,
        //         }}
        //         slotProps={{
        //             actionBar: {
        //                 actions: ["accept"], // 👈 use "accept", not "ok"
        //                 sx: {
        //                     "& .MuiButton-root": {
        //                         textTransform: "none", // lowercase
        //                         fontSize: "0.8rem",
        //                         padding: "2px 10px",
        //                     },
        //                     "& .MuiButton-textPrimary": {
        //                         color: "black", // accept button
        //                     },
        //                     "& .MuiButton-textSecondary": {
        //                         color: "black", // cancel button
        //                     },
        //                 },
        //             },
        //             textField: {
        //                 size: "small",
        //                 fullWidth: false,
        //                 error: Boolean(errorText),
        //                 helperText: errorText,
        //                 InputProps: {
        //                     endAdornment: values[name] && (
        //                         <IconButton size="small" onClick={() => setFieldValue(name, null)} edge="end">
        //                             <ClearIcon fontSize="small" />
        //                         </IconButton>
        //                     ),
        //                 },
        //             },
        //         }} />

        // </LocalizationProvider>
    );
}

import "./templateform.css";
import { Field, ErrorMessage } from "formik";
import { TextField, MenuItem } from "@mui/material";

import InputAdornment from "@mui/material/InputAdornment";
import Misc from "../../assets/misc.json";
import surveyTemplate from "../../assets/surveyTemplate.json";
import { IconMap } from "./IconMap";

export const SurveyTemplateForm = ({ target, errors, touched }) => {
    return (
        <div className="full">
            {surveyTemplate.map((val, idx) => {
                switch (idx) {
                    case 0:
                        return (
                            <div key={idx}>
                                <h3 className="py-3 text-black">Company Information</h3>


                                {val.fields.map((sVal) => (
                                    <div className="full" key={sVal.name}>

                                        <div className="input-group">


                                            {(() => {
                                                switch (sVal.name) {
                                                    case "company_employeeCount":
                                                        return (
                                                            <Field
                                                                select
                                                                className="pb-2"
                                                                size="small"
                                                                as={TextField}
                                                                fullWidth
                                                                error={sVal.name && Boolean(errors[sVal.name])}
                                                                label={sVal.label}
                                                                name={sVal.name}
                                                                helperText={<ErrorMessage name={sVal.name} />}
                                                                InputProps={{
                                                                    startAdornment: (
                                                                        <InputAdornment position="start">
                                                                            {target.fieldIcon === "true" && (

                                                                                IconMap && IconMap[sVal.icon]
                                                                            )}
                                                                        </InputAdornment>
                                                                    ),
                                                                }}
                                                                SelectProps={{
                                                                    displayEmpty: true,
                                                                    renderValue: (selected) =>
                                                                        selected && selected.length > 0 ? (
                                                                            selected
                                                                        ) : (
                                                                            <span style={{ color: "#9e9e9e", fontSize: "0.8rem" }}>
                                                                                Select {sVal.label}
                                                                            </span>
                                                                        ),
                                                                }}
                                                            >

                                                                <MenuItem value="small">1-10</MenuItem>
                                                                <MenuItem value="medium">10-50</MenuItem>
                                                                <MenuItem value="large">50+</MenuItem>
                                                            </Field>
                                                        );

                                                    case "company_industry":
                                                        return (
                                                            <Field
                                                                select
                                                                className="pb-2"
                                                                size="small"
                                                                as={TextField}
                                                                fullWidth
                                                                error={sVal.name && Boolean(errors[sVal.name])}
                                                                label={sVal.label}
                                                                name={sVal.name}
                                                                helperText={<ErrorMessage name={sVal.name} />}
                                                                InputProps={{
                                                                    startAdornment: (
                                                                        <InputAdornment position="start">
                                                                            {target.fieldIcon === "true" && (

                                                                                IconMap && IconMap[sVal.icon]
                                                                            )}
                                                                        </InputAdornment>
                                                                    ),
                                                                }}
                                                                SelectProps={{
                                                                    displayEmpty: true,
                                                                    renderValue: (selected) =>
                                                                        selected && selected.length > 0 ? (
                                                                            selected
                                                                        ) : (
                                                                            <span style={{ color: "#9e9e9e", fontSize: "0.8rem" }}>
                                                                                Select {sVal.label}
                                                                            </span>
                                                                        ),
                                                                }}
                                                            >

                                                                {Misc[0].industries.map((item) => (
                                                                    <MenuItem key={item} value={item}>{item}</MenuItem>
                                                                ))}
                                                            </Field>
                                                        );

                                                    default:
                                                        return (
                                                            <Field

                                                                className="pb-2"
                                                                size="small"
                                                                as={TextField}
                                                                fullWidth
                                                                error={sVal.name && Boolean(errors[sVal.name])}
                                                                label={sVal.label}
                                                                name={sVal.name}
                                                                helperText={<ErrorMessage name={sVal.name} />}
                                                                InputProps={{
                                                                    startAdornment: (
                                                                        <InputAdornment position="start">
                                                                            {target.fieldIcon === "true" && (

                                                                                IconMap && IconMap[sVal.icon]
                                                                            )}
                                                                        </InputAdornment>
                                                                    ),
                                                                }}
                                                            />
                                                        );
                                                }
                                            })()}


                                        </div>

                                    </div>
                                ))}

                                <h3 className="pb-2 text-black">Contact Information</h3>
                            </div>
                        );
                    default:
                        return (
                            <div key={idx} className="full border-1 border p-3 my-2">
                                <div className="pb-2">{val.section}</div>

                                {val.fields.map((sVal) => (
                                    <div className="full" key={sVal.name}>

                                        <div className="input-group">


                                            <Field
                                                placeholder={`Enter ${sVal.label}`}
                                                className="pb-2"
                                                size="small"
                                                as={TextField}
                                                fullWidth
                                                error={sVal.name && Boolean(errors[sVal.name])}
                                                label={sVal.label}
                                                name={sVal.name}
                                                helperText={<ErrorMessage name={sVal.name} />}
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            {target.fieldIcon === "true" && (

                                                                IconMap && IconMap[sVal.icon]
                                                            )}
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />


                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                }
            })}
        </div>
    );
};



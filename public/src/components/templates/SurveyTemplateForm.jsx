import "./templateform.css";
import { Field, ErrorMessage } from "formik";
import { TextField, MenuItem } from "@mui/material";
import InputAdornment from "@mui/material/InputAdornment";
import Misc from "../../assets/misc.json";
import surveyTemplate from "../../assets/surveyTemplate.json";
import { IconMap } from "./IconMap";

export const SurveyTemplateForm = ({ target, errors, touched, values, gridView = false }) => {
    return (
        <div className={`full ${gridView ? "row" : ""}`}>
            {surveyTemplate.map((val, idx) => {
                if (idx === 0) {
                    return (
                        <div key={idx} className={`${gridView ? "col-6" : ""}`}>
                            <h3 className="pb-3 text-black">{val.section}</h3>
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
                                                            error={touched[sVal.name] && Boolean(errors[sVal.name])}
                                                            label={sVal.label}
                                                            name={sVal.name}
                                                            value={values[sVal.name] || ""}
                                                            helperText={<ErrorMessage name={sVal.name} />}
                                                            InputProps={{
                                                                startAdornment: (
                                                                    <InputAdornment position="start">
                                                                        {target.fieldIcon === "true" && IconMap[sVal.icon]}
                                                                    </InputAdornment>
                                                                ),
                                                            }}
                                                            SelectProps={{
                                                                displayEmpty: true,
                                                                renderValue: (selected) =>
                                                                    selected
                                                                        ? selected
                                                                        : <span style={{ color: "#9e9e9e", fontSize: "0.8rem" }}>
                                                                            Select {sVal.label}
                                                                        </span>
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
                                                            error={touched[sVal.name] && Boolean(errors[sVal.name])}
                                                            label={sVal.label}
                                                            name={sVal.name}
                                                            value={values[sVal.name] || ""}
                                                            helperText={<ErrorMessage name={sVal.name} />}
                                                            InputProps={{
                                                                startAdornment: (
                                                                    <InputAdornment position="start">
                                                                        {target.fieldIcon === "true" && IconMap[sVal.icon]}
                                                                    </InputAdornment>
                                                                ),
                                                            }}
                                                            SelectProps={{
                                                                displayEmpty: true,
                                                                renderValue: (selected) =>
                                                                    selected
                                                                        ? selected
                                                                        : <span style={{ color: "#9e9e9e", fontSize: "0.8rem" }}>
                                                                            Select {sVal.label}
                                                                        </span>
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
                                                            error={touched[sVal.name] && Boolean(errors[sVal.name])}
                                                            label={sVal.label}
                                                            name={sVal.name}
                                                            value={values[sVal.name] || ""}
                                                            helperText={<ErrorMessage name={sVal.name} />}
                                                            InputProps={{
                                                                startAdornment: (
                                                                    <InputAdornment position="start">
                                                                        {target.fieldIcon === "true" && IconMap[sVal.icon]}
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
                        </div>
                    );
                } else {
                    // Nested sections
                    return (
                        <div key={idx} className={`${gridView ? "col-6" : ""}`}>
                            <h3 className="pb-2 text-black">{val.section}</h3>
                            {val.fields.map((sVal) => (
                                <div key={sVal.section} className="full border-1 border p-3 my-1 pb-0">
                                    <h4 className="pb-3">{sVal.section}</h4>
                                    {sVal.fields.map((cVal) => (
                                        <div className="full" key={cVal.name}>
                                            <div className="input-group">
                                                <Field
                                                    placeholder={`Enter ${cVal.label}`}
                                                    className="pb-2"
                                                    size="small"
                                                    as={TextField}
                                                    fullWidth
                                                    error={touched[cVal.name] && Boolean(errors[cVal.name])}
                                                    label={cVal.label}
                                                    name={cVal.name}
                                                    value={values[cVal.name] || ""}
                                                    helperText={<ErrorMessage name={cVal.name} />}
                                                    InputProps={{
                                                        startAdornment: (
                                                            <InputAdornment position="start">
                                                                {target.fieldIcon === "true" && IconMap[cVal.icon]}
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    );
                }
            })}
        </div>
    );
};

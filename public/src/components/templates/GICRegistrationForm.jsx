// RegistrationForm.jsx
import { Field, ErrorMessage } from "formik";
import misc from "../../assets/misc.json";
import GICTemplate from "../../assets/GICTemplate.json";
import { getCodeList } from "country-list";
import InputAdornment from "@mui/material/InputAdornment";
import { TextField, MenuItem } from "@mui/material";
import { IconMap } from "./IconMap";


const GICRegistrationForm = ({ target, errors, touched, initialValues }) => {
    return (
        <>
            {Object.keys(GICTemplate).map((key) => {

                return (
                    <div className="full" key={GICTemplate[key].name}>

                        <div className="input-group">

                            {(() => {
                                switch (GICTemplate[key].name) {
                                    case "gic_gender":
                                        return (
                                            <Field
                                                className="pb-2"
                                                select
                                                size="small"
                                                as={TextField}
                                                fullWidth
                                                error={touched[GICTemplate[key].name] && Boolean(errors[GICTemplate[key].name])}
                                                label={GICTemplate[key].label}
                                                name={GICTemplate[key].name}
                                                helperText={<ErrorMessage name={GICTemplate[key].name} />}
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            {target.fieldIcon === "true" && (

                                                                IconMap && IconMap[GICTemplate[key].icon]
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
                                                        Select {GICTemplate[key].label}
                                                        </span>
                                                    ),
                                                }}
                                            >
                                                <MenuItem value="Male">Male</MenuItem>
                                                <MenuItem value="Female">Female</MenuItem>
                                            </Field>
                                        );

                                    case "gic_industry":
                                        return (
                                            <Field
                                                className="pb-2"
                                                select
                                                size="small"
                                                as={TextField}
                                                fullWidth
                                                type="search"
                                                error={touched[GICTemplate[key].name] && Boolean(errors[GICTemplate[key].name])}
                                                label={GICTemplate[key].label}
                                                name={GICTemplate[key].name}
                                                helperText={<ErrorMessage name={GICTemplate[key].name} />}
                                                InputProps={{
                                                    
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            {target.fieldIcon === "true" && (

                                                                IconMap && IconMap[GICTemplate[key].icon]
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
                                                        Select {GICTemplate[key].label}
                                                        </span>
                                                    ),
                                                }}
                                            >

                                                {misc[0].industries.map((item) => (
                                                    <MenuItem key={item} value={item}>
                                                        {item}
                                                    </MenuItem>
                                                ))}
                                            </Field>
                                        );

                                    case "gic_address_emirate":
                                        return (
                                            <Field
                                                className="pb-2"
                                                select
                                                size="small"
                                                as={TextField}
                                                fullWidth
                                                error={touched[GICTemplate[key].name] && Boolean(errors[GICTemplate[key].name])}
                                                label={GICTemplate[key].label}
                                                name={GICTemplate[key].name}
                                                helperText={<ErrorMessage name={GICTemplate[key].name} />}
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            {target.fieldIcon === "true" && (

                                                                IconMap && IconMap[GICTemplate[key].icon]
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
                                                        Select {GICTemplate[key].label}
                                                        </span>
                                                    ),
                                                }}
                                            >

                                                {misc[0].emirate.map((item) => (
                                                    <MenuItem key={item} value={item}>
                                                        {item}
                                                    </MenuItem>
                                                ))}
                                            </Field>
                                        );

                                    case "gic_address_country":
                                        return (
                                            <Field
                                                type="search"
                                                select
                                                className="pb-2"
                                                size="small"
                                                as={TextField}
                                                fullWidth
                                                error={touched[GICTemplate[key].name] && Boolean(errors[GICTemplate[key].name])}
                                                label={GICTemplate[key].label}
                                                name={GICTemplate[key].name}
                                                helperText={<ErrorMessage name={GICTemplate[key].name} />}
                                                InputProps={{
                                                    
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            {target.fieldIcon === "true" && (

                                                                IconMap && IconMap[GICTemplate[key].icon]
                                                            )}
                                                        </InputAdornment>
                                                    ),
                                                }}
                                                SelectProps={{
                                                    displayEmpty: true,
                                                    renderValue: (selected) =>
                                                    selected ? (
                                                        getCodeList()[selected]
                                                    ) : (
                                                        <span style={{ color: '#9e9e9e', fontSize: '0.8rem' }}>
                                                        Select {GICTemplate[key].label}
                                                        </span>
                                                    ),
                                                }}
                                               >


                                                {Object.entries(getCodeList()).map(([name, code]) => (
                                                    <MenuItem key={name} value={name}>
                                                        {code}
                                                    </MenuItem>
                                                ))}
                                            </Field>
                                        );

                                    default:
                                        return (
                                            <Field
                                                placeholder={`Enter ${GICTemplate[key].label}`}
                                                className="pb-2"
                                                size="small"
                                                as={TextField}
                                                fullWidth
                                                error={touched[GICTemplate[key].name] && Boolean(errors[GICTemplate[key].name])}
                                                label={GICTemplate[key].label}
                                                name={GICTemplate[key].name}
                                                helperText={<ErrorMessage name={GICTemplate[key].name} />}
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            {target.fieldIcon === "true" && (

                                                                IconMap && IconMap[GICTemplate[key].icon]
                                                            )}
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            >

                                            </Field>
                                        );
                                }
                            })()}
                        </div>

                    </div>
                );
            })}
        </>
    );
};

export default GICRegistrationForm;

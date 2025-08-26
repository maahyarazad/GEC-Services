import "./templateform.css";
import { Field, ErrorMessage } from "formik";



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
                                <h2 className="py-3">Company Information</h2>
                                

                                {val.fields.map((sVal) => (
                                    <div className="full" key={sVal.name}>
                                        <label>
                                            <p>{sVal.label}</p>
                                        </label>
                                        <div className="input-group">
                                            {target.fieldIcon === "true" && (
                                                <span className="input-group-text">
                                                    {IconMap[sVal.icon]}
                                                </span>
                                            )}

                                            {(() => {
                                                switch (sVal.name) {
                                                    case "company_employeeCount":
                                                        return (
                                                            <Field
                                                                as="select"
                                                                className={`form-control ${errors[sVal.name] && touched[sVal.name] ? "is-invalid" : ""
                                                                    }`}
                                                                name={sVal.name}
                                                            >
                                                                <option value="">Select...</option>
                                                                <option value="small">1-10</option>
                                                                <option value="medium">10-50</option>
                                                                <option value="large">50+</option>
                                                            </Field>
                                                        );

                                                    case "company_industry":
                                                        return (
                                                            <Field
                                                                as="select"
                                                                className={`form-control ${errors[sVal.name] && touched[sVal.name] ? "is-invalid" : ""
                                                                    }`}
                                                                name={sVal.name}
                                                            >
                                                                <option value="">Select...</option>
                                                                {Misc[0].industries.map((item) => (
                                                                    <option key={item} value={item}>{item}</option>
                                                                ))}
                                                            </Field>
                                                        );

                                                    default:
                                                        return (
                                                            <Field
                                                                className={`form-control ${errors[sVal.name] && touched[sVal.name] ? "is-invalid" : ""
                                                                    }`}
                                                                type={sVal.type}
                                                                name={sVal.name}
                                                            />
                                                        );
                                                }
                                            })()}


                                        </div>
                                        <ErrorMessage
                                            name={sVal.name}
                                            component="div"
                                            className="text-danger small"
                                        />
                                    </div>
                                ))}

                                <h2 className="py-3">Contact Information</h2>
                            </div>
                        );
                    default:
                        return (
                            <div key={idx} className="full border-1 border p-3 my-2">
                                {val.section}
                                {val.fields.map((sVal) => (
                                    <div className="full" key={sVal.name}>
                                        <label>
                                            <p>{sVal.label}</p>
                                        </label>
                                        <div className="input-group">
                                            {target.fieldIcon === "true" && (
                                                <span className="input-group-text">
                                                    {IconMap[sVal.icon]}
                                                </span>
                                            )}

                                            <Field
                                                className={`form-control ${errors[sVal.name] && touched[sVal.name] ? "is-invalid" : ""
                                                    }`}
                                                type={sVal.type}
                                                name={sVal.name}
                                            />


                                        </div>
                                        <ErrorMessage
                                            name={sVal.name}
                                            component="div"
                                            className="text-danger small"
                                        />
                                    </div>
                                ))}
                            </div>
                        );
                }
            })}
        </div>
    );
};



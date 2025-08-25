// RegistrationForm.jsx
import { Field, ErrorMessage } from "formik";
import misc from "../../assets/misc.json";
import GICTemplate from "../../assets/GICTemplate.json";
import { getCodeList } from "country-list";
import { IconMap } from "./IconMap";

const GICRegistrationForm = ({ target, errors, touched, initialValues }) => {
  return (
    <>
      {Object.keys(GICTemplate).map((key) => {
        
        return (
          <div className="full" key={key}>
            <label>
              <p>
                {GICTemplate[key].label}
              </p>
            </label>

            <div className="input-group">
              {target.fieldIcon === "true" && (
                <span className="input-group-text">
                  {IconMap && IconMap[GICTemplate[key].icon]}
                </span>
              )}

              {(() => {
                switch (GICTemplate[key].name) {
                  case "gic_gender":
                    return (
                      <Field
                        as="select"
                        className={`form-control ${
                          errors[GICTemplate[key].name] && touched[GICTemplate[key].name] ? "is-invalid" : ""
                        }`}
                        name={GICTemplate[key].name}
                      >
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </Field>
                    );

                  case "gic_industry":
                    return (
                      <Field
                        as="select"
                        className={`form-control ${
                          errors[GICTemplate[key].name] && touched[GICTemplate[key].name] ? "is-invalid" : ""
                        }`}
                        name={GICTemplate[key].name}
                      >
                        <option value="">Select...</option>
                        {misc[0].industries.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </Field>
                    );

                  case "gic_address_emirate":
                    return (
                      <Field
                        as="select"
                        className={`form-control ${
                          errors[GICTemplate[key].name] && touched[GICTemplate[key].name] ? "is-invalid" : ""
                        }`}
                        name={GICTemplate[key].name}
                      >
                        <option value="">Select...</option>
                        {misc[0].emirate.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </Field>
                    );

                  case "gic_address_country":
                    return (
                      <Field
                        as="select"
                        className={`form-control ${
                          errors[GICTemplate[key].name] && touched[GICTemplate[key].name] ? "is-invalid" : ""
                        }`}
                        name={GICTemplate[key].name}
                      >
                        <option value="">Select...</option>
                        {Object.entries(getCodeList()).map(([name, code]) => (
                          <option key={code} value={code}>
                            {name} ({code})
                          </option>
                        ))}
                      </Field>
                    );

                  default:
                    return (
                      <Field
                        className={`form-control ${
                          errors[GICTemplate[key].name] && touched[GICTemplate[key].name] ? "is-invalid" : ""
                        }`}
                        type="text"
                        name={GICTemplate[key].name}
                      />
                    );
                }
              })()}
            </div>

            <ErrorMessage
              name={GICTemplate[key].name}
              component="div"
              className="text-danger small"
            />
          </div>
        );
      })}
    </>
  );
};

export default GICRegistrationForm;

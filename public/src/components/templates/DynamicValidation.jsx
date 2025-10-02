import * as Yup from 'yup';
import dayjs from "dayjs";
const phoneSchema = Yup.string()
  .matches(/^\+?[0-9]{10,15}$/, "Phone number must be 10–15 digits, and may start with +.");

const companyInfoSchema = Yup.object().shape({
  company_partnerBrand: Yup.string()
    .min(2, "Partber brand must be at least 2 characters.")
    .required("Partber brand is required."),
  company_partnerName: Yup.string()
    .min(2, "Partner name must be at least 2 characters.")
    .required("Partner name is required."),
  company_cityCountry: Yup.string().required("City/Country is required."),
  company_phone: phoneSchema.notRequired(),
  company_mobile: phoneSchema.required("Company mobile number is required."),
  company_email: Yup.string()
    .email("Please enter a valid email address.")
    .required("Company email is required."),
  company_website: Yup.string()
    .url("Please enter a valid website URL.")
    .required("Company website is required."),
  company_employeeCount: Yup.string()
    .oneOf(["small", "medium", "large"], "Invalid employee count selection.")
    .required("Employee count is required."),
  company_industry: Yup.string().required("Industry is required."),

  // company role fields
  company_ceoOwnerGm: Yup.string()
    .min(2, "CEO/Owner/GM name must be at least 2 characters.")
    .required("CEO/Owner/GM is required."),

  company_ceoOwnerGm_contactNumber: phoneSchema.required("CEO/Owner/GM mobile number is required."),
  company_ceoOwnerGm_landline: phoneSchema.required("CEO/Owner/GM landline number is required."),

  company_ceoOwnerGm_email: Yup.string()
    .email("Please enter a valid email address.")
    .required("CEO/Owner/GM email is required."),

  // company_hrHead: Yup.string()
  //   .min(2, "HR Head name must be at least 2 characters.")
  //   .required("HR Head is required."),
  // company_accountingHead: Yup.string()
  //   .min(2, "Accounting Head name must be at least 2 characters.")
  //   .required("Accounting Head is required."),
  // company_marketingHead: Yup.string()
  //   .min(2, "Marketing Head name must be at least 2 characters.")
  //   .required("Marketing Head is required."),
  // company_pa: Yup.string()
  //   .min(2, "PA name must be at least 2 characters.")
  //   .required("PA is required."),
});


  const gicSchema = Yup.object().shape({
        gic_firstName: Yup.string().required("First Name is required"),
        gic_lastName: Yup.string().required("Last Name is required"),
            gic_email: Yup.string()
      .email("Please enter a valid email address.")
      .required("Email is required."),
        gic_phone: Yup.string()
      .matches(/^\+?[0-9]{10,15}$/, "Phone number must be 10–15 digits, and may start with +.")
      .required("Phone number is required."),
        gic_mobile: Yup.string()
      .matches(/^\+?[0-9]{10,15}$/, "Phone number must be 10–15 digits, and may start with +.")
      .required("Mobile number is required."),
        gic_gender: Yup.string().oneOf(["Male", "Female"]).required("Gender is required"),
        gic_industry: Yup.string().required("Industry is required"),
        gic_company: Yup.string().required("Company is required"),
        gic_website: Yup.string().url("Invalid URL").required("Website is required"),
        gic_address_street: Yup.string().required("Street is required"),
        // address_area: Yup.string().required("Area is required"),
        gic_address_city: Yup.string().required("City is required"),
        // address_emirate: Yup.string().required("Emirate is required"),
        gic_address_country: Yup.string().required("Country is required"),
    });

export const getValidationSchema = (target) => {
  let baseSchema = Yup.object().shape({
    email: Yup.string()
      .email("Please enter a valid email address.")
      .required("Email is required."),

      // gender: Yup.string().oneOf(["Male", "Female"]).required("Gender is required"),

    phone: Yup.string()
      .matches(/^\+?[0-9]{10,15}$/, "Phone number must be 10–15 digits, and may start with +.")
      .required("Phone number is required."),

    whatsapp: Yup.string()
     .matches(/^\+?[0-9]{10,15}$/, "WhatsApp number must be 10–15 digits, and may start with +.")
      .matches(/^\+[0-9]\d{10,15}$/, "WhatsApp number must start with a country code (e.g., +971) and be 10–15 digits in total.")
      .required("WhatsApp number is required."),

    firstName: Yup.string()
      .min(2, "First name must be at least 2 characters.")
      .required("First name is required."),

    lastName: Yup.string()
      .min(2, "Last name must be at least 2 characters.")
      .required("Last name is required."),

    companyName: target?.companyRequired === 'true'
      ? Yup.string()
          .min(2, "Company name must be at least 2 characters.")
          .required("Company name is required.")
      : Yup.string().notRequired(),

    birthday: target?.birthdayRequired === 'true'
      ? Yup.date()
          .max(new Date(), "Birthday cannot be in the future.")
          .required("Birthday is required.")
      : Yup.date().nullable().notRequired(),

metadata_selected_time: target?.consultationEnabled === 'true'
  ? Yup.string()
      .required("Time is required.")
      .test("is-valid-time", "Invalid time", (value) => {
          return value ? dayjs(value).isValid() : false;
      })
  : Yup.string().nullable().notRequired(),

    consent: target?.IdentityConsent === 'true'
      ? Yup.boolean().oneOf([true], "You must agree to the terms and conditions.")
      : Yup.boolean().notRequired(),

    fileUpload: target?.fileUpload === 'true'
      ? Yup.mixed()
          .required("Attachment is required.")
          .test("fileSize", "Attachment file should be less than 5MB", (value) => {
            if (!value || typeof value === "string") return true; 
            return value instanceof File && value.size <= 5 * 1024 * 1024;
          })
      : Yup.mixed().notRequired(),

    textarea: target?.textarea === 'true'
      ? Yup.string().required("Message is required.")
      : Yup.string().notRequired(),
  });

  // Merge company schema
  if (target?.surveyForm === 'true') {
    return companyInfoSchema;
  }

  if (target?.gic === 'true') {
    return gicSchema;
  }

  return baseSchema;
};

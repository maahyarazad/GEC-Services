import * as Yup from 'yup';

export const getValidationSchema = (target) => {
  return Yup.object().shape({
    email: Yup.string()
      .email("Please enter a valid email address.")
      .required("Email is required."),

    phone: Yup.string()
      .matches(/^\+?[0-9]{10,15}$/, "Phone number must be 10–15 digits, and may start with +.")
      .required("Phone number is required."),

    whatsapp: Yup.string()
      .matches(/^\+[1-9]\d{9,14}$/, "WhatsApp number must start with a country code (e.g., +971) and be 10–15 digits in total.")
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

    consent: target?.IdentityConsent === 'true'?
      Yup.boolean()
      .oneOf([true], "You must agree to the terms and conditions.")
      :Yup.boolean().notRequired(),

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
};

import { useFormikContext } from 'formik';
import { Field } from 'formik';
import AlertDialog from '../utils/AlertDialog';
import { useRef } from 'react';
import lockRegistrationImage from '../../assets/media/lock_registration.png'
const LockRegistrationSwitch = 
() => {
  const { setFieldValue, values } = useFormikContext();
 const dialogRef = useRef();


  const handleSwitchChange = (field, e) => {
    dialogRef.current.openDialog(
      <div>
        <p>Enabling this option will lock the registration page and prevent further submissions. Are you sure you want to proceed?</p>
        <img src={lockRegistrationImage} alt="Lock" style={{ maxWidth: '100%', marginTop: 8 }} />
      </div>,
      'Confirm Action',
      () => {
        
        setFieldValue(field.name, !field.value);

      },
      () => {
        // Cancelled: do nothing
      }
    );
  };

  return (
    <div className="form-check form-switch mb-3">
      <AlertDialog ref={dialogRef} />
      <Field name="lockRegistration">
        {({ field }) => (
          <input
            name={field.name}
            checked={field.value}
            onChange={(e) => {
              handleSwitchChange(field, e);
            }}
            onBlur={field.onBlur}
            id="lockRegistration"
            className="form-check-input"
            type="checkbox"
          />
        )}
      </Field>
      <label className="form-check-label" htmlFor="lockRegistration">
        Lock Registration
      </label>
    </div>
  );
};

export default LockRegistrationSwitch;

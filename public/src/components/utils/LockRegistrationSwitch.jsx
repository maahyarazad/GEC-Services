import { useFormikContext } from 'formik';
import { Field } from 'formik';
import { useAlertDialog } from '../Providers/AlertProvider';

import lockRegistrationImage from '../../assets/media/lock_registration.webp';


const LockRegistrationSwitch = 
() => {
  const { setFieldValue, values } = useFormikContext();
  const {openDialog} = useAlertDialog();


  const handleSwitchChange = (field, e) => {
    
    if(field.value === "false"){
      openDialog(
        <div>
          <p>Enabling this option will <strong>lock the registration page and prevent further submissions.</strong> Are you sure you want to proceed?</p>
          <img src={lockRegistrationImage} alt="lock registration" className='mt-1 rounded-1' width={150} />
        </div>,
        'Confirm Action',
        () => {
          
          setFieldValue(field.name, !field.value);
  
        },
        () => {
          // Cancelled: do nothing
        }
      );

    }else{
      setFieldValue(field.name, !field.value);    
    }
  };

  return (
    <div className="form-check form-switch mb-3">
      
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

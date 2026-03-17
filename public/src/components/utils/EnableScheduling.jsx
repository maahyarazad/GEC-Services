import { useFormikContext } from 'formik';
import { Field } from 'formik';
import { useAlertDialog } from '../Providers/AlertProvider';

import enableScheduling from '../../assets/media/enableScheduling.webp';
const EnableScheduling = 
() => {
  const { setFieldValue, values } = useFormikContext();
  const {openDialog} = useAlertDialog();


  const handleSwitchChange = (field, e) => {
    
    if(field.value === false){
      openDialog(
        <>
          <>Enabling this option will initialize the slots from 10 AM to 8 PM in hourly intervals <strong>(you can customize them in the next step)</strong>. Once you enable this and <strong>save it</strong>, you won’t be able to change it, as the scheduling system uses this data to prevent duplicate reservations.</>
          <img src={enableScheduling} alt="enableScheduling" width={200} className='mt-1 rounded-1'/>
        </>,
        'Confirm Action',
        
            {
                text: 'Enable',
                color: 'success'
            },
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
      
      <Field name="consultationEnabled">
        {({ field }) => (
          <input
            name={field.name}
            checked={field.value}
            onChange={(e) => {
              handleSwitchChange(field, e);
            }}
            onBlur={field.onBlur}
            id="consultationEnabled"
            className="form-check-input"
            type="checkbox"
          />
        )}
      </Field>
      <label className="form-check-label" htmlFor="consultationEnabled">
        Enable Scheduling
      </label>
    </div>
  );
};

export default EnableScheduling;

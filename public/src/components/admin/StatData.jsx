import { LinearProgress, Box, Typography } from '@mui/material';

export const StatData = ({ value }) => {
  const percentage = Number(value.modified_count)/ Number(value.total_count) * 100;
  
 return (
  <div className='d-flex flex-column align-items-center'>
   
    <Box minWidth={35}>
      
      
      <Typography fontSize={10} variant="body2" color="textSecondary">
        Total :{value.total_count}
      </Typography>
      
      <Typography fontSize={10} variant="body2" color="textSecondary">
        Complete: {value.modified_count}
      </Typography>
      
      <Typography fontSize={10} variant="body2" color="textSecondary">
        Not Attended: {value.null_count}
      </Typography>
    </Box>
  </div>
);

};




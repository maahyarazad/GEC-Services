import { LinearProgress, Box, Typography } from '@mui/material';

export const PercentageBar = ({ value }) => {
  const percentage = (Number(value.modified_count) / Number(value.total_count)) * 100;

  return (
    <Box position="relative" width="100%">
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{ height: 20, borderRadius: 5 }}
      />
      <Typography
        variant="body2"
        color="white"
        fontSize={12}
        fontWeight="bold"
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {`${Math.round(percentage)}%`}
      </Typography>
    </Box>
  );
};

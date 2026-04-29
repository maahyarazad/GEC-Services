import LinearProgress from "@mui/material/LinearProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";


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

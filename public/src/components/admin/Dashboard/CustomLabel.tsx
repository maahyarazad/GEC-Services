import { LabelListProps } from 'recharts';

const renderPercentLabel = (props: LabelListProps) => {
  const { x, y, width, value, index, payload } = props;

  // value = raw value for this bar
  // payload = entire data item for this bar's category

  if (!payload.total || payload.total === 0) return null;

  const percent = ((value / payload.total) * 100).toFixed(1) + '%';

  // Position label centered on the bar top
  return (
    <text
      x={x! + (width! / 2)}
      y={y! - 6}
      fill="#636261"
      fontWeight="bold"
      fontSize={14}
      textAnchor="middle"
    >
      {percent}
    </text>
  );
};


export default renderPercentLabel;
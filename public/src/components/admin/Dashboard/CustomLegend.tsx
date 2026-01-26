import { LegendPayload, Legend } from 'recharts';

const customLegend = (props: any) => {
    
  const { payload } = props as { payload: LegendPayload[] };
  // Define desired order explicitly
  const order = [
    "Delivered",
    "Read",
    "Attend",
    "Not Attend",
    "Viewed, No Reply",
    "Sylvia Responses (Delivered)",
    "Sylvia Responses (Undelivered)"
  ];

  // Sort payload based on order array
  const sortedPayload = payload
    ? [...payload].sort(
        (a, b) => order.indexOf(a.value) - order.indexOf(b.value)
      )
    : [];

  return (
    <ul style={{ listStyle: 'none', margin: 0, marginRight: 0, paddingRight: 5 }}>
      {sortedPayload.map((entry) => (
        <li key={entry.value} style={{ color: entry.color, marginBottom: 4 }}>
          <svg width="14" height="14" style={{ marginRight: 4 }}>
            <rect width="14" height="14" fill={entry.color} />
          </svg>
          {entry.value}
        </li>
      ))}
    </ul>
  );
};

export default customLegend;

import { Pie, PieChart, TooltipIndex } from 'recharts';
import { RechartsDevtools } from '@recharts/devtools';
import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from "recharts";
import customLegend from './CustomLegend';
import renderPercentLabel from './CustomLabel';

// #endregion
export default function WhastAppReport({
    isAnimationActive = true,
    defaultIndex,
}: {
    isAnimationActive?: boolean;
    defaultIndex?: TooltipIndex;
}) {


    const [loading, setLoading] = useState(true);
    const [panelData, setPanelData] = useState(null);


    const fetchReport = useCallback(async () => {
        try {


            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/whatsapp/insight`, { credentials: "include" });

            if (response.status === 200) {
                const response_data = await response.json();

                setPanelData(response_data.data);

            }
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setLoading(false);
        }
    },

        []
    );

    useEffect(() => {

        fetchReport();
    }, [fetchReport]);

      const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    handleResize(); // initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);




    if (loading) return <div>Loading report…</div>;
    if (!panelData) return <div>No data available</div>;


    const chartData = [
        {
            name: "Deliveries",
            deliveryCount: panelData.delivered ?? 0,
            readCount: panelData.read ?? 0,

        },
        {
            name: "User Responses",
            responseAttend: panelData.attend ?? 0,
            responseNotAttend: panelData.notAttend ?? 0,
            stall: panelData.read - (panelData.attend + panelData.notAttend) ,
        },
        {
            name: "Sylvia Responses",
            simpleResponseCount: panelData.simpleMessageDelivered ?? 0,
            simpleUndeliveredCount: panelData.simpleMessageUndelivered ?? 0,

        },
    ];


const bars = [
  { dataKey: "deliveryCount", fill: "#2563eb", name: "Delivered", stackId: undefined },         // Indigo 600
  { dataKey: "readCount", fill: "#0ce8d9", name: "Read", stackId: undefined },                  // Blue 600
  { dataKey: "responseAttend", fill: "#44e00b", name: "Attend", stackId: "a" },                // Green 600
  { dataKey: "responseNotAttend", fill: "#dc2626", name: "Not Attend", stackId: "a" },         // Red 600
  { dataKey: "stall", fill: "#8f8d8d", name: "Viewed, No Reply", stackId: "a" },         // Red 600
  { dataKey: "simpleResponseCount", fill: "#2563eb", name: "Sylvia Responses (Delivered)", stackId: "b" }, // Sky 500
  { dataKey: "simpleUndeliveredCount", fill: "#000", name: "Sylvia Responses (Undelivered)", stackId: "b" }, // Purple 700
];

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <BarChart width={700} height={400} data={chartData} responsive margin={{ bottom: isMobile ? 0 : 80, right: 30, left: 20, top: 20 }}
                style={{ width: '100%', maxWidth: '700px', maxHeight: '70vh', aspectRatio: 1.618, }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="name"
                    interval={0}
                    tick={isMobile ? null : { angle: 45, textAnchor: 'end', dy: 80 }}
                />
                <YAxis width="auto" />
                <Legend
          layout={isMobile ? "horizontal" : "vertical"}
          align={isMobile ? "center" : "left"}
          verticalAlign={isMobile ? "bottom" : "top"}
          content={customLegend}
        />
                <>
                    {bars.map(({ dataKey, fill, name, stackId }) => (
                        <Bar
                            key={dataKey}
                            dataKey={dataKey}
                            fill={fill}
                            name={name}
                            stackId={stackId}
                            barSize={stackId ? 80 : undefined} // only set barSize for stacked bars if you want
                            isAnimationActive={isAnimationActive}
                        >
                            {/* <LabelList content={renderPercentLabel} /> */}
                            <LabelList
                                dataKey={dataKey}
                                style={{ fill: "#000", fontWeight: "bold", fontSize: 12 }}
                                position="middle"
                            />
                        </Bar>
                    ))}
                </>
                <RechartsDevtools />
            </BarChart>

        </div>
    );






}
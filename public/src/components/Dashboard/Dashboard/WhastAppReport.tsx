import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Bar } from "react-chartjs-2";
import { useState, useEffect, useCallback } from "react";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
    ChartDataLabels
);

export default function WhastAppReport() {
    const [loading, setLoading] = useState(true);
    const [panelData, setPanelData] = useState<any>(null);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 3);

    const formatDateForInput = (date: Date) =>
        date.toISOString().slice(0, 10);

    const [startDate, setStartDate] = useState(formatDateForInput(yesterday));
    const [endDate, setEndDate] = useState(formatDateForInput(new Date()));

    const fetchReport = useCallback(async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/whatsapp/insight?startDate=${startDate}&endDate=${endDate}`,
                { credentials: "include" }
            );

            if (response.ok) {
                const json = await response.json();
                
                setPanelData(json.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    if (loading) return <div>Loading report…</div>;
    if (!panelData) return <div>No data</div>;

/**
 * -------------------------
 * DELIVERY DATA
 * -------------------------
 */
const deliveryByTemplate = panelData.delivery_result.reduce(
  (acc: any, item: any) => {
    const template = item.templateName;

    if (!acc[template]) {
      acc[template] = {
        delivered: 0,
        read: 0,
        undelivered: 0,
      };
    }

    acc[template][item.type] += item.to_number;
    return acc;
  },
  {}
);

const deliveryLabels = [...Object.keys(deliveryByTemplate), "Total"]; // Add "Total" label

// Compute totals for each dataset
const deliveredData = deliveryLabels.map((t) =>
  t === "Total"
    ? Object.values(deliveryByTemplate ?? {}).reduce(
        (sum: number, d: any) => sum + (d.delivered ?? 0),
        0
      )
    : (deliveryByTemplate?.[t]?.delivered ?? 0)
);

const readData = deliveryLabels.map((t) =>
  t === "Total"
    ? Object.values(deliveryByTemplate ?? {}).reduce(
        (sum: number, d: any) => sum + (d.read ?? 0),
        0
      )
    : (deliveryByTemplate?.[t]?.read ?? 0)
);

const undeliveredData = deliveryLabels.map((t) =>
  t === "Total"
    ? Object.values(deliveryByTemplate ?? {}).reduce(
        (sum: number, d: any) => sum + (d.undelivered ?? 0),
        0
      )
    : (deliveryByTemplate?.[t]?.undelivered ?? 0)
);


const deliveryData = {
  labels: deliveryLabels,
   datasets: [
      {
        label: "Delivered",
        backgroundColor: "#0fb500",
        data: deliveredData,
      },
      {
        label: "Read",
        backgroundColor: "#ff9d00",
        data: readData,
      },
      {
        label: "Undelivered",
        backgroundColor: "#c7c7c7",
        data: undeliveredData,
      },
    ],
};


    /**
     * -------------------------
     * USER RESPONSE DATA
     * -------------------------
     */
    const attend = panelData.response_result?.attend ?? 0;
    const notAttend = panelData.response_result?.notAttend ?? 0;

    const totalRead = Object.values(deliveryByTemplate).reduce(
        (sum: number, t: any) => sum + t.read,
        0
    );

    const viewedNoReply = Math.max(
        totalRead - (attend + notAttend),
        0
    );

    const responseData = {
        labels: ["Responses"],
        datasets: [
            {
                label: "Attend",
                backgroundColor: "#16a34a",
                stack: "responses",
                data: [attend],
            },
            {
                label: "Not Attend",
                backgroundColor: "#dc2626",
                stack: "responses",
                data: [notAttend],
            },
            {
                label: "Viewed, No Reply",
                backgroundColor: "#8f8d8d",
                stack: "responses",
                data: [viewedNoReply],
            },
        ],
    };

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: "top" as const },
            tooltip: { enabled: true },
            datalabels: {
                color: "#000",
                font: { weight: "bold" as const, size: 14 },
                formatter: (v: number) => (v > 0 ? v : ""),
                anchor: "center" as const,
                align: "center" as const,
            },
        },
        datasets: {
            bar: {
                barThickness: "flex" as const,
                barPercentage: 1,
                categoryPercentage: 1,
            },
        },
    };

    return (
        <div className="row p-0 m-0">
            {/* Date Filters */}
            <div style={{ marginBottom: 12 }}>
                <label>
                    Start Date{" "}
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </label>{" "}
                <label>
                    End Date{" "}
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </label>
            </div>

            {/* Charts */}
            <div
                style={{
                    gap: 24,
                    width: "100%",
                }}
            >
                {/* Deliveries – 2x width */}
                <div style={{ flex: 4, height: 500 }}>
                    <h4 style={{ textAlign: "center" }}>Delivery Status</h4>
                    <div style={{ width: "100%", height: "100%" }}>
                        <Bar
                            data={deliveryData}
                            options={{
                                ...commonOptions,
                                indexAxis: "y",
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    x: { stacked: false },
                                    y: { stacked: false },
                                },
                            }}
                        />
                    </div>
                </div>

                {/* Responses – 1x width */}
                <div style={{ flex: 1, height: 125 }} className="pt-4">
                    <h4 style={{ textAlign: "center" }}>User Responses</h4>
                    <div style={{ width: "100%", height: "100%" }}>
                        <Bar
                            data={responseData}
                            options={{
                                ...commonOptions,
                                 indexAxis: "y",
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    x: { stacked: true },
                                    y: { stacked: true },
                                },
                            }}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}

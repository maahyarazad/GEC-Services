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

type ReportItem = {
  type: string;
  delivered_count: number;
  undelivered_count: number;
  read_count: number;
  
};

export default function WhastAppTypeReport() {
  const [loading, setLoading] = useState(true);
  const [panelData, setPanelData] = useState<ReportItem[]>([]);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 3);

  const formatDateForInput = (date: Date) => date.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(formatDateForInput(yesterday));
  const [endDate, setEndDate] = useState(formatDateForInput(new Date()));

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_SERVERURL}/api/whatsapp/insight-by-type?startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const json = await response.json();
        setPanelData(Array.isArray(json.data.delivery_result) ? json.data.delivery_result : []);

        
      } else {
        setPanelData([]);
      }
    } catch (err) {
      console.error(err);
      setPanelData([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) return <div>Loading report…</div>;
//   if (!panelData.length) return <div>No data</div>;

  const labels = [...panelData.map((item) => item.type), "Total"];

  const deliveredData = [
    ...panelData.map((item) => item.delivered_count ?? 0),
    panelData.reduce((sum, item) => sum + (item.delivered_count ?? 0), 0),
  ];

  const readData = [
    ...panelData.map((item) => item.read_count ?? 0),
    panelData.reduce((sum, item) => sum + (item.read_count ?? 0), 0),
  ];

  const undeliveredData = [
    ...panelData.map((item) => item.undelivered_count ?? 0),
    panelData.reduce((sum, item) => sum + (item.undelivered_count ?? 0), 0),
  ];

//   const totalData = [
//     ...panelData.map((item) => item.total_count ?? 0),
//     panelData.reduce((sum, item) => sum + (item.total_count ?? 0), 0),
//   ];

  const deliveryData = {
    labels,
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
        barPercentage: 0.9,
        categoryPercentage: 0.9,
      },
    },
  };

  return (
    <div className="row p-0 m-0">
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

      <div
        style={{
          gap: 24,
          width: "100%",
        }}
      >
        <div style={{ flex: 1, height: 500 }}>
          <h4 style={{ textAlign: "center" }}>WhatsApp Type Report</h4>
          <div style={{ width: "100%", height: "100%" }}>
            <Bar
              data={deliveryData}
              options={{
                ...commonOptions,
                indexAxis: "y",
                scales: {
                  x: {
                    stacked: false,
                    beginAtZero: true,
                  },
                  y: {
                    stacked: false,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
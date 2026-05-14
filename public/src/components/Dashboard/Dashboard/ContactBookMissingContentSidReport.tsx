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
  count: number;
};

export default function ContactBookMissingContentSidReport() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportItem[]>([]);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_SERVERURL}/api/contacts/report/missing-content-sid`,
        { credentials: "include" }
      );
      if (response.ok) {
        const json = await response.json();
        setData(Array.isArray(json.data) ? json.data : []);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) return <div>Loading report…</div>;

  const total = data.reduce((sum, item) => sum + (item.count ?? 0), 0);
  const labels = [...data.map((item) => item.type), "Total"];
  const counts = [...data.map((item) => item.count ?? 0), total];

  const chartData = {
    labels,
    datasets: [
      {
        label: "Remaining Contact Count by Type from the Contact Book That Has Not Received the Invitation",
        backgroundColor: "#f59e0b",
        data: counts,
      },
    ],
  };

  return (
    <div className="row p-0 m-0" style={{  minHeight: "500px" }}>
      
        <h4 style={{ textAlign: "center" }}>
          {/* Remaning Contact by Type from Contact Book */}
        </h4>
        <Bar
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: {
              legend: { position: "top" as const },
              tooltip: { enabled: true },
              datalabels: {
                color: "#000",
                font: { weight: "default" as const, size: 11 },
                formatter: (v: number) => (v > 0 ? v : ""),
                anchor: "center" as const,
                align: "center" as const,
              },
            },
            scales: {
              x: { beginAtZero: true },
            },
            datasets: {
              bar: {
                barThickness: "flex" as const,
                barPercentage: 0.9,
                categoryPercentage: 0.9,
              },
            },
          }}
        />
      
    </div>
  );
}

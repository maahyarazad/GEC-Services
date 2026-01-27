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

/**
 * 🔴 IMPORTANT
 * ChartDataLabels MUST be registered
 */
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

  const fetchReport = useCallback(async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVERURL}/api/whatsapp/insight`,
        { credentials: "include" }
      );

      if (response.ok) {
        const json = await response.json();
        setPanelData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) return <div>Loading report…</div>;
  if (!panelData) return <div>No data</div>;

  // ─────────────────────────────
  // DATA
  // ─────────────────────────────
  const data = {
    labels: ["Deliveries", "User Responses", "Sylvia Responses"],
    datasets: [
      // Deliveries
      {
        label: "Delivered",
        data: [
          (panelData.delivered ?? 0) + (panelData.deliveredEnglish ?? 0),
          0,
          0,
        ],
        backgroundColor: "#2563eb",
        stack: "deliveries",
      },
      {
        label: "Read",
        data: [
          (panelData.read ?? 0) + (panelData.readEnglish ?? 0),
          0,
          0,
        ],
        backgroundColor: "#0ce8d9",
        stack: "read",
      },

      // User Responses
      {
        label: "Attend",
        data: [0, panelData.attend ?? 0, 0],
        backgroundColor: "#44e00b",
        stack: "responses",
      },
      {
        label: "Not Attend",
        data: [0, panelData.notAttend ?? 0, 0],
        backgroundColor: "#dc2626",
        stack: "responses",
      },
      {
        label: "Viewed, No Reply",
        data: [
          0,
          (panelData.read ?? 0) -
            ((panelData.attend ?? 0) + (panelData.notAttend ?? 0)),
          0,
        ],
        backgroundColor: "#8f8d8d",
        stack: "responses",
      },

      // Sylvia Responses
      {
        label: "Sylvia Delivered",
        data: [0, 0, panelData.simpleMessageDelivered ?? 0],
        backgroundColor: "#2563eb",
        stack: "sylvia",
      },
      {
        label: "Sylvia Undelivered",
        data: [0, 0, panelData.simpleMessageUndelivered ?? 0],
        backgroundColor: "#000",
        stack: "sylvia",
      },
    ],
  };

  // ─────────────────────────────
  // OPTIONS
  // ─────────────────────────────
  const options = {
    interaction: {
    mode: null,
  },
  hover: {
    mode: null,
  },

    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
         enabled: false,
        mode: "index" as const,
        intersect: false,
      },

      // ✅ DATA LABELS (NUMBERS ON BARS)
      datalabels: {
        color: "#fff",
        font: {
          weight: "bold" as const,
          size: 12,
        },
        formatter: (value: number) => (value > 0 ? value : ""),
        anchor: "center" as const,
        align: "center" as const,
        clamp: true,
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
      },
    },
    datasets: {
      bar: {
        barPercentage: 1,
        categoryPercentage: 1,
      },
    },
  };

  return (
    <div style={{ height: 400, width: '100%', margin: "0 auto" }}>
      <Bar data={data} options={options} />
    </div>
  );
}

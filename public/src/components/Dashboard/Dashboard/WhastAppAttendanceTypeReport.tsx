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

type AttendanceItem = {
  type: string;
  status: "attend" | "notAttend";
  responses: number;
};

export default function WhastAppAttendanceTypeReport() {
  const [loading, setLoading] = useState(true);
  const [panelData, setPanelData] = useState<AttendanceItem[]>([]);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 3);

  const formatDateForInput = (date: Date) => date.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(formatDateForInput(yesterday));
  const [endDate, setEndDate] = useState(formatDateForInput(new Date()));

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_SERVERURL}/api/whatsapp/attendance-insight-by-type?startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const json = await response.json();
        setPanelData(
          Array.isArray(json?.data?.attendance_result)
            ? json.data.attendance_result
            : []
        );
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
  

  const groupedByType = panelData.reduce<Record<string, { attend: number; notAttend: number }>>(
    (acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = {
          attend: 0,
          notAttend: 0,
        };
      }

      if (item.status === "attend") {
        acc[item.type].attend += item.responses ?? 0;
      } else if (item.status === "notAttend") {
        acc[item.type].notAttend += item.responses ?? 0;
      }

      return acc;
    },
    {}
  );

  const labels = [...Object.keys(groupedByType), "Total"];

  const attendData = [
    ...Object.values(groupedByType).map((item) => item.attend),
    Object.values(groupedByType).reduce((sum, item) => sum + item.attend, 0),
  ];

  const notAttendData = [
    ...Object.values(groupedByType).map((item) => item.notAttend),
    Object.values(groupedByType).reduce((sum, item) => sum + item.notAttend, 0),
  ];

  const chartData = {
    labels,
    datasets: [
      {
        label: "Attend",
        backgroundColor: "#22c55e",
        data: attendData,
        stack: "attendance",
      },
      {
        label: "Not Attend",
        backgroundColor: "#ef4444",
        data: notAttendData,
        stack: "attendance",
      },
    ],
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        enabled: true,
      },
      datalabels: {
        color: "#000",
        font: {
          weight: "bold" as const,
          size: 10,
        },
        formatter: (value: number) => (value > 0 ? value : ""),
        anchor: "center" as const,
        align: "center" as const,
        clamp: true,
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
          <h4 style={{ textAlign: "center" }}>WhatsApp Attendance by Type</h4>
          <div style={{ width: "100%", height: "100%" }}>
            <Bar
              data={chartData}
              options={{
                ...commonOptions,
                indexAxis: "y" as const,
                scales: {
                  x: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                      precision: 0,
                    },
                  },
                  y: {
                    stacked: true,
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
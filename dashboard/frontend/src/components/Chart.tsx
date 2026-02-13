import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import type { MetricHistory } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface MetricsChartProps {
  data: MetricHistory[];
}

export function MetricsChart({ data }: MetricsChartProps) {
  const chartData = {
    labels: data.map(d => d.date.slice(5)),
    datasets: [
      {
        label: 'コード品質',
        data: data.map(d => d.codeQuality),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.4
      },
      {
        label: 'セキュリティ',
        data: data.map(d => d.securityScore),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        tension: 0.4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100
      }
    }
  };

  return (
    <div className="chart-container" style={{ height: '300px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

interface IssueDonutChartProps {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export function IssueDonutChart({ critical, high, medium, low }: IssueDonutChartProps) {
  const chartData = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [
      {
        data: [critical, high, medium, low],
        backgroundColor: [
          'rgba(220, 38, 38, 0.8)',
          'rgba(234, 88, 12, 0.8)',
          'rgba(202, 138, 4, 0.8)',
          'rgba(22, 163, 74, 0.8)'
        ],
        borderColor: [
          'rgb(220, 38, 38)',
          'rgb(234, 88, 12)',
          'rgb(202, 138, 4)',
          'rgb(22, 163, 74)'
        ],
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const
      }
    }
  };

  return (
    <div className="chart-container" style={{ height: '200px' }}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'green' | 'yellow' | 'red' | 'blue';
}

export function MetricCard({
  title,
  value,
  unit,
  icon,
  trend,
  trendValue,
  color = 'blue'
}: MetricCardProps) {
  const colorClass = `metric-card--${color}`;

  return (
    <div className={`metric-card ${colorClass}`}>
      <div className="metric-card__icon">{icon}</div>
      <div className="metric-card__content">
        <div className="metric-card__title">{title}</div>
        <div className="metric-card__value">
          {value}
          {unit && <span className="metric-card__unit">{unit}</span>}
        </div>
        {trend && trendValue && (
          <div className={`metric-card__trend metric-card__trend--${trend}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </div>
        )}
      </div>
    </div>
  );
}

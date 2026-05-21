import Typography from '@mui/material/Typography';
import { BsCalendar2EventFill } from 'react-icons/bs';
import '../../Dashboard/HealthCheck/HealthCheck.css';

export default function ActiveEventCard({ event, loading }) {
    if (loading) return null;

    const hasEvent = !!event;

    return (
        <div
            className={`hc-card ${hasEvent ? 'hc-card--up' : 'hc-card--down'}`}
            style={{ padding: '10px 12px', gap: 4, marginBottom: 2 }}
        >
            <div className="hc-card__header">
                <div className={`hc-card__dot ${hasEvent ? 'hc-card__dot--up' : 'hc-card__dot--down'}`} />
                <span className={`hc-card__badge ${hasEvent ? 'hc-card__badge--up' : 'hc-card__badge--down'}`}>
                    Active Event
                </span>
            </div>

            <div className="hc-card__icon" style={{ padding: '4px 0 2px' }}>
                <BsCalendar2EventFill size={26} style={{ color: hasEvent ? '#16a34a' : '#dc2626' }} />
            </div>

            <Typography className="hc-card__name" title={event?.title} style={{ fontSize: '0.82rem' }}>
                {hasEvent ? event.title : 'No active event'}
            </Typography>

            {hasEvent && event.event_date && (
                <Typography className="hc-card__time">
                    {new Date(event.event_date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                </Typography>
            )}
        </div>
    );
}

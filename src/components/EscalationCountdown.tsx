import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Timer } from 'lucide-react';

interface EscalationCountdownProps {
  submittedAt: string;
  escalationTimeoutHours: number;
  extendedUntil: string | null;
  onExtendClick: () => void;
  canExtend: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  total: number; // total milliseconds
}

function calculateTimeRemaining(
submittedAt: string,
escalationTimeoutHours: number,
extendedUntil: string | null)
: TimeRemaining {
  const now = new Date().getTime();

  let deadline: number;

  if (extendedUntil) {
    // Wenn verlängert, nutze das Verlängerungsdatum
    deadline = new Date(extendedUntil).getTime();
  } else {
    // Sonst: submitted_at + timeout
    const submitted = new Date(submittedAt).getTime();
    deadline = submitted + escalationTimeoutHours * 60 * 60 * 1000;
  }

  const total = deadline - now;

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, total: 0 };
  }

  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor(total % (1000 * 60 * 60 * 24) / (1000 * 60 * 60));
  const minutes = Math.floor(total % (1000 * 60 * 60) / (1000 * 60));

  return { days, hours, minutes, total };
}

function getColorClasses(hoursRemaining: number): {
  bg: string;
  border: string;
  text: string;
  icon: string;
  button: string;
  pulse: boolean;
} {
  if (hoursRemaining > 24) {
    return {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: 'text-green-600',
      button: 'bg-green-600 hover:bg-green-700',
      pulse: false
    };
  } else if (hoursRemaining > 12) {
    return {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700',
      pulse: false
    };
  } else if (hoursRemaining > 6) {
    return {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      icon: 'text-orange-600',
      button: 'bg-orange-600 hover:bg-orange-700',
      pulse: false
    };
  } else {
    return {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700',
      pulse: true
    };
  }
}

function formatDeadline(submittedAt: string, escalationTimeoutHours: number, extendedUntil: string | null): string {
  let deadline: Date;

  if (extendedUntil) {
    deadline = new Date(extendedUntil);
  } else {
    const submitted = new Date(submittedAt);
    deadline = new Date(submitted.getTime() + escalationTimeoutHours * 60 * 60 * 1000);
  }

  return deadline.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function EscalationCountdown({
  submittedAt,
  escalationTimeoutHours,
  extendedUntil,
  onExtendClick,
  canExtend
}: EscalationCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
  calculateTimeRemaining(submittedAt, escalationTimeoutHours, extendedUntil)
  );

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(submittedAt, escalationTimeoutHours, extendedUntil));
    }, 60000); // Update every minute

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining(submittedAt, escalationTimeoutHours, extendedUntil));

    return () => clearInterval(interval);
  }, [submittedAt, escalationTimeoutHours, extendedUntil]);

  const hoursRemaining = timeRemaining.days * 24 + timeRemaining.hours + timeRemaining.minutes / 60;
  const colors = getColorClasses(hoursRemaining);
  const deadlineFormatted = formatDeadline(submittedAt, escalationTimeoutHours, extendedUntil);

  // Build time string
  const timeString = (() => {
    if (timeRemaining.total <= 0) {
      return 'Frist abgelaufen';
    }

    const parts: string[] = [];
    if (timeRemaining.days > 0) {
      parts.push(`${timeRemaining.days} ${timeRemaining.days === 1 ? 'Tag' : 'Tage'}`);
    }
    if (timeRemaining.hours > 0) {
      parts.push(`${timeRemaining.hours} ${timeRemaining.hours === 1 ? 'Stunde' : 'Stunden'}`);
    }
    if (timeRemaining.minutes > 0 && timeRemaining.days === 0) {
      parts.push(`${timeRemaining.minutes} ${timeRemaining.minutes === 1 ? 'Minute' : 'Minuten'}`);
    }

    return parts.length > 0 ? parts.join(', ') : 'Weniger als 1 Minute';
  })();

  return (
    <div data-ev-id="ev_5eb856073d"
    className={`rounded-xl border p-4 ${colors.bg} ${colors.border} ${colors.pulse ? 'animate-pulse' : ''}`}>

      <div data-ev-id="ev_e12bb49eb4" className="flex items-center justify-between gap-4 flex-wrap">
        <div data-ev-id="ev_34371d3f67" className="flex items-center gap-3 flex-1 min-w-0">
          <div data-ev-id="ev_0df76a225b" className={`w-10 h-10 rounded-full ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
            {timeRemaining.total <= 0 ?
            <AlertTriangle className={`w-5 h-5 ${colors.icon}`} /> :
            hoursRemaining <= 6 ?
            <Timer className={`w-5 h-5 ${colors.icon}`} /> :

            <Clock className={`w-5 h-5 ${colors.icon}`} />
            }
          </div>
          <div data-ev-id="ev_f297b82545" className="min-w-0">
            <p data-ev-id="ev_741bac538b" className={`font-semibold ${colors.text}`}>
              {timeRemaining.total <= 0 ?
              'Eskalation überfällig' :

              <>Eskalation in {timeString}</>
              }
            </p>
            <p data-ev-id="ev_31df5eb37b" className={`text-sm ${colors.text} opacity-75`}>
              Frist: {deadlineFormatted} Uhr
              {extendedUntil && <span data-ev-id="ev_72c3ba3383" className="ml-1 font-medium">(verlängert)</span>}
            </p>
          </div>
        </div>
        
        {canExtend &&
        <button data-ev-id="ev_d50b1b4378"
        onClick={onExtendClick}
        className={`px-4 py-2 ${colors.button} text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm whitespace-nowrap`}>

            <Clock className="w-4 h-4" />
            Zusätzliche Verlängerung
          </button>
        }
      </div>
    </div>);

}
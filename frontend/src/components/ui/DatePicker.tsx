import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useUIStore } from "@/store";
import { Label } from "./Input";

export interface DateRangePickerProps {
  startDate: string; // "YYYY-MM-DD" ou ""
  endDate: string;
  onChange: (start: string, end: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

const MONTHS = {
  "pt-BR": [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ],
  "en-US": [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
};

const WEEKDAYS = {
  "pt-BR": ["D", "S", "T", "Q", "Q", "S", "S"],
  "en-US": ["S", "M", "T", "W", "T", "F", "S"],
};

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseISODate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/**
 * Seletor de intervalo de datas com calendário em popover.
 * Primeiro clique define o início; o segundo define o fim
 * (se for anterior ao início, os valores são trocados).
 */
export function DatePicker({
  startDate,
  endDate,
  onChange,
  label,
  placeholder,
  className,
}: DateRangePickerProps) {
  const { appLanguage } = useUIStore();
  const locale = appLanguage === "en-US" ? "en-US" : "pt-BR";

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const start = parseISODate(startDate);
  const end = parseISODate(endDate);

  const [viewYear, setViewYear] = useState<number>(
    () => (start ?? new Date()).getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    () => (start ?? new Date()).getMonth()
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from(
      { length: firstDay },
      () => null
    );
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewYear, viewMonth, d));
    }
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: Date) => {
    const iso = toISODate(day);
    if (!start || (start && end)) {
      onChange(iso, "");
      return;
    }
    if (day < start) {
      onChange(iso, startDate);
    } else {
      onChange(startDate, iso);
    }
    setIsOpen(false);
  };

  const clear = () => {
    onChange("", "");
    setIsOpen(false);
  };

  const formatDisplay = (value: string) => {
    const parsed = parseISODate(value);
    if (!parsed) return "";
    return parsed.toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const triggerLabel = start
    ? end
      ? `${formatDisplay(startDate)} – ${formatDisplay(endDate)}`
      : formatDisplay(startDate)
    : placeholder ?? (locale === "pt-BR" ? "Filtrar por data" : "Filter by date");

  const today = new Date();

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label && <Label className="mb-1 text-xs">{label}</Label>}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-left text-xs transition-colors min-h-8",
          "border-surface-200 dark:border-surface-800 dark:bg-surface-900",
          "hover:border-surface-300 dark:hover:border-surface-600",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
        )}
      >
        <Calendar className="h-3.5 w-3.5 shrink-0 text-surface-400" />
        <span
          className={cn(
            "flex-1 truncate",
            start
              ? "text-surface-800 dark:text-surface-200"
              : "text-surface-400"
          )}
        >
          {triggerLabel}
        </span>
        {start && (
          <X
            className="h-3.5 w-3.5 shrink-0 text-surface-400 hover:text-surface-600"
            onClick={(e) => {
              e.stopPropagation();
              clear();
            }}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-lg border border-surface-200 bg-white p-3 shadow-lg dark:border-surface-700 dark:bg-surface-900">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-6 w-6 items-center justify-center rounded-md text-surface-500 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <span className="text-xs font-medium text-surface-900 dark:text-surface-50">
              {MONTHS[locale][viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={nextMonth}
              className="flex h-6 w-6 items-center justify-center rounded-md text-surface-500 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS[locale].map((day, i) => (
              <span
                key={i}
                className="py-0.5 text-center text-[10px] font-medium text-surface-400"
              >
                {day}
              </span>
            ))}

            {days.map((day, i) => {
              if (!day) return <span key={`empty-${i}`} />;

              const iso = toISODate(day);
              const isStart = startDate === iso;
              const isEnd = endDate === iso;
              const inRange =
                start && end && day > start && day < end;
              const isToday =
                day.toDateString() === today.toDateString();

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={cn(
                    "flex h-7 items-center justify-center rounded-md text-[11px] transition-colors",
                    isStart || isEnd
                      ? "bg-primary-600 font-medium text-white"
                      : inRange
                        ? "bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
                        : "text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800",
                    isToday && !isStart && !isEnd && !inRange &&
                      "ring-1 ring-primary-500/50"
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={clear}
              className="mt-2 w-full rounded-md py-1 text-[11px] font-medium text-surface-500 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800"
            >
              {locale === "pt-BR" ? "Limpar filtro" : "Clear filter"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default DatePicker;

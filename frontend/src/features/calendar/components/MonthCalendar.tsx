import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { cn } from "@/utils/cn";
import { useTranslation } from "@/i18n";
import type { CalendarItem } from "@/types";

interface MonthCalendarProps {
  items: CalendarItem[];
}

const ITEM_COLOR: Record<string, string> = {
  draft: "bg-surface-300 dark:bg-surface-600",
  approved: "bg-blue-400",
  scheduled: "bg-amber-400",
  published: "bg-emerald-400",
};

export function MonthCalendar({ items }: MonthCalendarProps) {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const locale = language === "en-US" ? enUS : ptBR;

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { locale }),
    end: endOfWeek(endOfMonth(currentMonth), { locale }),
  });

  const scheduledItems = items.filter((i) => i.scheduled_at);

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentMonth, { locale }),
    end: endOfWeek(currentMonth, { locale }),
  }).map((d) => format(d, "EEE", { locale }));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold capitalize text-surface-800 dark:text-surface-200">
          {format(currentMonth, "MMMM yyyy", { locale })}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, -1))}
            className="rounded-md border border-surface-200 p-1 text-surface-500 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:hover:bg-surface-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="rounded-md border border-surface-200 p-1 text-surface-500 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:hover:bg-surface-800"
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-surface-200 bg-surface-200 dark:border-surface-800 dark:bg-surface-800">
        {weekDays.map((d) => (
          <div
            key={d}
            className="bg-surface-50 py-1 text-center text-[10px] font-medium uppercase text-surface-500 dark:bg-surface-900 dark:text-surface-400"
          >
            {d}
          </div>
        ))}

        {days.map((day) => {
          const dayItems = scheduledItems.filter((i) =>
            isSameDay(new Date(i.scheduled_at!), day)
          );
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-20 bg-white p-1 dark:bg-surface-900",
                !isSameMonth(day, currentMonth) && "opacity-40"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-surface-600 dark:text-surface-400",
                  isToday(day) && "bg-primary-500 font-semibold text-white"
                )}
              >
                {format(day, "d")}
              </span>

              <div className="mt-0.5 space-y-0.5">
                {dayItems.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/history/posts/${item.id}`)}
                    className="flex w-full items-center gap-1 truncate rounded bg-surface-100 px-1 py-0.5 text-left text-[10px] text-surface-700 transition-colors hover:bg-primary-100 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-primary-950/40"
                    title={item.topic}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        ITEM_COLOR[item.editorial_status] ?? ITEM_COLOR.draft
                      )}
                    />
                    <span className="truncate">
                      {format(new Date(item.scheduled_at!), "HH:mm")} · {item.topic}
                    </span>
                  </button>
                ))}
                {dayItems.length > 3 && (
                  <span className="block px-1 text-[10px] text-surface-400">
                    +{dayItems.length - 3}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {scheduledItems.length === 0 && (
        <p className="mt-3 text-center text-[11px] text-surface-400">
          {t("cal.status.scheduled")} · 0
        </p>
      )}
    </div>
  );
}

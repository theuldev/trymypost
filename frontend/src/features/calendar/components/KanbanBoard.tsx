import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Clock } from "lucide-react";
import { cn } from "@/utils/cn";
import { Badge } from "@/components/ui/Badge";
import { useTranslation } from "@/i18n";
import type { CalendarItem, EditorialStatus } from "@/types";

const COLUMNS: EditorialStatus[] = ["draft", "approved", "scheduled", "published"];

const COLUMN_ACCENT: Record<EditorialStatus, string> = {
  draft: "border-surface-300 dark:border-surface-600",
  approved: "border-blue-400 dark:border-blue-500",
  scheduled: "border-amber-400 dark:border-amber-500",
  published: "border-emerald-400 dark:border-emerald-500",
};

interface KanbanBoardProps {
  items: CalendarItem[];
  onMove: (item: CalendarItem, target: EditorialStatus) => void;
}

function formatDate(iso: string, language: string) {
  return new Date(iso).toLocaleString(language, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function KanbanBoard({ items, onMove }: KanbanBoardProps) {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<EditorialStatus | null>(null);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((column) => {
        const columnItems = items.filter((i) => i.editorial_status === column);
        const isOver = overColumn === column;

        return (
          <section
            key={column}
            onDragOver={(e) => {
              e.preventDefault();
              setOverColumn(column);
            }}
            onDragLeave={() => setOverColumn((prev) => (prev === column ? null : prev))}
            onDrop={(e) => {
              e.preventDefault();
              setOverColumn(null);
              const item = items.find((i) => i.id === draggedId);
              setDraggedId(null);
              if (item && item.editorial_status !== column) {
                onMove(item, column);
              }
            }}
            className={cn(
              "flex min-h-40 flex-col rounded-lg border border-surface-200 bg-white p-2 transition-colors dark:border-surface-800 dark:bg-surface-900",
              isOver && "border-primary-400 bg-primary-50/50 dark:border-primary-500 dark:bg-primary-950/20"
            )}
            aria-label={t(`cal.status.${column}`)}
          >
            <header className="flex items-center justify-between px-1 pb-2">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full border-2", COLUMN_ACCENT[column])} />
                <h2 className="text-xs font-semibold text-surface-800 dark:text-surface-200">
                  {t(`cal.status.${column}`)}
                </h2>
              </div>
              <Badge variant="neutral" size="sm" className="text-[10px]">
                {columnItems.length}
              </Badge>
            </header>

            <div className="flex flex-1 flex-col gap-2">
              {columnItems.map((item) => (
                <article
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggedId(item.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setOverColumn(null);
                  }}
                  onClick={() => navigate(`/history/posts/${item.id}`)}
                  className={cn(
                    "cursor-grab rounded-md border border-surface-200 bg-surface-50 p-2.5 transition-all hover:border-primary-300 dark:border-surface-700 dark:bg-surface-800/60 dark:hover:border-primary-600",
                    draggedId === item.id && "opacity-40"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Badge variant="primary" size="sm" className="truncate text-[10px]">
                      {item.style}
                    </Badge>
                    {item.is_favorite && <Heart className="h-3 w-3 shrink-0 fill-current text-red-500" />}
                  </div>

                  <h3 className="line-clamp-2 text-xs font-medium leading-snug text-surface-900 dark:text-surface-100">
                    {item.topic}
                  </h3>

                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-surface-400">
                    {item.scheduled_at ? (
                      <>
                        <Clock className="h-3 w-3" />
                        <span>
                          {t("cal.scheduledFor", { date: formatDate(item.scheduled_at, language) })}
                        </span>
                      </>
                    ) : (
                      <span>
                        {new Date(item.created_at).toLocaleDateString(language)}
                      </span>
                    )}
                  </div>
                </article>
              ))}

              {columnItems.length === 0 && (
                <p className="rounded-md border border-dashed border-surface-200 px-2 py-3 text-center text-[10px] text-surface-400 dark:border-surface-700">
                  {isOver ? t("cal.dropHere") : t(`cal.status.${column}`)}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, KanbanSquare } from "lucide-react";
import { Button, SegmentedControl } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { postsApi } from "@/services/posts";
import { useUIStore } from "@/store";
import { useTranslation } from "@/i18n";
import type { CalendarItem, EditorialStatus } from "@/types";
import { KanbanBoard } from "../components/KanbanBoard";
import { MonthCalendar } from "../components/MonthCalendar";

type ViewMode = "kanban" | "calendar";

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CalendarPage() {
  const { t } = useTranslation();
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewMode>("kanban");
  const [schedulingItem, setSchedulingItem] = useState<CalendarItem | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["calendar"],
    queryFn: () => postsApi.calendar(),
  });

  const editorialMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof postsApi.updateEditorialStatus>[1]) =>
      postsApi.updateEditorialStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      addToast({ type: "success", message: t("cal.toast.updated") });
    },
    onError: () => addToast({ type: "error", message: t("cal.toast.error") }),
  });

  const handleMove = (item: CalendarItem, target: EditorialStatus) => {
    if (target === "scheduled" && !item.scheduled_at) {
      const nextHour = new Date();
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      setScheduleDate(toDatetimeLocal(nextHour));
      setSchedulingItem(item);
      return;
    }
    editorialMutation.mutate({ id: item.id, editorial_status: target });
  };

  const confirmSchedule = () => {
    if (!schedulingItem || !scheduleDate) return;
    editorialMutation.mutate({
      id: schedulingItem.id,
      editorial_status: "scheduled",
      scheduled_at: new Date(scheduleDate).toISOString(),
    });
    setSchedulingItem(null);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-2xl text-center mb-8">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>

          <h1 className="text-base font-semibold text-surface-900 dark:text-surface-50">
            {t("cal.title")}
          </h1>

          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            {t("cal.subtitle")}
          </p>

          <SegmentedControl
            className="mx-auto mt-4"
            options={[
              { value: "kanban", icon: KanbanSquare, label: t("cal.view.kanban") },
              { value: "calendar", icon: CalendarDays, label: t("cal.view.calendar") },
            ]}
            value={view}
            onChange={(v) => setView(v as ViewMode)}
          />
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-lg bg-surface-200 dark:bg-surface-800" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-xs text-surface-500 dark:text-surface-400">
            {t("cal.empty")}
          </p>
        ) : view === "kanban" ? (
          <KanbanBoard items={items} onMove={handleMove} />
        ) : (
          <MonthCalendar items={items} />
        )}

        <Modal
          isOpen={!!schedulingItem}
          onClose={() => setSchedulingItem(null)}
          title={t("cal.scheduleModal.title")}
          description={t("cal.scheduleModal.description")}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="schedule-datetime"
                className="mb-1 block text-xs font-medium text-surface-700 dark:text-surface-300"
              >
                {t("cal.scheduleModal.dateLabel")}
              </label>
              <input
                id="schedule-datetime"
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full rounded-md border border-surface-200 bg-white px-3 py-1.5 text-xs text-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSchedulingItem(null)}>
                {t("cal.scheduleModal.cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={confirmSchedule}
                disabled={!scheduleDate}
              >
                {t("cal.scheduleModal.confirm")}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default CalendarPage;

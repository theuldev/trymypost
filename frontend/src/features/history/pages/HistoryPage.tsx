import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Tag,
  Trash2,
  Clock,
  RefreshCw,
  Plus,
  Heart,
  X,
  DollarSign,
  History as HistoryIcon,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Button, IconButton } from "@/components/ui";
import { Input, Select, DatePicker } from "@/components/ui";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/Pagination";
import { postsApi } from "@/services/posts";
import { useUIStore } from "@/store";
import type { PostHistoryBase } from "@/types";
import { getStatusLabels } from "@/constants/playground";
import { useTranslation } from "@/i18n";

export function HistoryPage() {
  const { t, language } = useTranslation();
  const statusLabels = getStatusLabels(t);
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [favoriteFilter, setFavoriteFilter] = useState<boolean | undefined>(undefined);
  const [hasCodeFilter, setHasCodeFilter] = useState<boolean | undefined>(undefined);
  const [sortBy, setSortBy] = useState<"created_at" | "updated_at">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState<{ id: string; tags: string[] } | null>(null);

  const { data: usageSummary } = useQuery({
    queryKey: ["usage-summary"],
    queryFn: postsApi.usageSummary,
  });

  const { data: historyData, isLoading } = useQuery({
    queryKey: ["history", page, pageSize, search, statusFilter, favoriteFilter, hasCodeFilter, sortBy, sortOrder, startDate, endDate],
    queryFn: () =>
      postsApi.list({
        page,
        page_size: pageSize,
        search,
        status: statusFilter,
        favorito: favoriteFilter,
        has_code: hasCodeFilter,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: postsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      addToast({ type: "success", message: t("hist.toast.deleteSuccess") });
    },
    onError: () => addToast({ type: "error", message: t("hist.toast.deleteError") }),
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, is_favorite }: { id: string; is_favorite: boolean }) =>
      postsApi.toggleFavorite(id, { is_favorite }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["history"] }),
  });

  const updateTagsMutation = useMutation({
    mutationFn: ({ id, tags }: { id: string; tags: string[] }) => postsApi.updateTags(id, { tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      setEditingTags(null);
      addToast({ type: "success", message: t("hist.toast.tagsUpdated") });
    },
    onError: () => addToast({ type: "error", message: t("hist.toast.tagsError") }),
  });

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleViewDetail = (post: PostHistoryBase) => {
    navigate(`/history/posts/${post.id}`);
  };

  const handleDelete = (id: string) => {
    setShowDeleteConfirm(id);
  };

  const confirmDelete = (id: string) => {
    deleteMutation.mutate(id);
    setShowDeleteConfirm(null);
  };

  const handleTagEdit = (post: PostHistoryBase) => {
    setEditingTags({ id: post.id, tags: [...post.tags] });
  };

  const handleTagSave = () => {
    if (editingTags) {
      updateTagsMutation.mutate({ id: editingTags.id, tags: editingTags.tags });
    }
  };

  const handleTagAdd = (tag: string) => {
    if (editingTags && tag.trim() && !editingTags.tags.includes(tag.trim())) {
      setEditingTags({ ...editingTags, tags: [...editingTags.tags, tag.trim()] });
    }
  };

  const handleTagRemove = (tag: string) => {
    if (editingTags) {
      setEditingTags({ ...editingTags, tags: editingTags.tags.filter((t) => t !== tag) });
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-2xl text-center mb-8">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20">
            <HistoryIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>

          <h1 className="text-base font-semibold text-surface-900 dark:text-surface-50">
            {t("hist.title")}
          </h1>

          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            {t("hist.subtitle")}
          </p>

          {usageSummary && usageSummary.posts_with_usage > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
              <DollarSign className="h-3 w-3" />
              <span>
                {t("hist.summary.label")}:
                <strong className="ml-1">${usageSummary.total_cost_usd.toFixed(4)}</strong>
              </span>
              <span className="text-emerald-600/70 dark:text-emerald-500/70">
                {t("hist.summary.perPost", { cost: `$${usageSummary.avg_cost_per_post.toFixed(4)}` })}
              </span>
            </div>
          )}
        </header>

        <section className="space-y-3 mb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                <input
                  type="text"
                  placeholder={t("hist.searchPlaceholder")}
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/30 text-surface-800 dark:text-surface-200 placeholder:text-surface-400"
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSortBy("created_at");
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                }}
                title={t("hist.filters.sortByDate")}
              >
                <Clock className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "", label: t("hist.filters.allStatuses") },
                  { value: "completed", label: t("hist.filters.completed") },
                  { value: "processing", label: t("hist.filters.processing") },
                  { value: "pending", label: t("hist.filters.pending") },
                  { value: "failed", label: t("hist.filters.failed") },
                ]}
                className="w-full"
              />

              <Select
                value={favoriteFilter?.toString() || ""}
                onChange={(v) => setFavoriteFilter(v === "" ? undefined : v === "true")}
                options={[
                  { value: "", label: t("hist.filters.favorites") },
                  { value: "true", label: t("hist.filters.onlyFavorites") },
                  { value: "false", label: t("hist.filters.nonFavorites") },
                ]}
                className="w-full"
              />

              <Select
                value={hasCodeFilter?.toString() || ""}
                onChange={(v) => {
                  setHasCodeFilter(v === "" ? undefined : v === "true");
                  setPage(1);
                }}
                options={[
                  { value: "", label: t("hist.filters.code") },
                  { value: "true", label: t("hist.filters.withCode") },
                  { value: "false", label: t("hist.filters.withoutCode") },
                ]}
                className="w-full"
              />

              <DatePicker
                startDate={startDate}
                endDate={endDate}
                onChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                  setPage(1);
                }}
                placeholder={t("hist.filters.datePlaceholder")}
                className="w-full"
              />
            </div>
          </div>
        </section>

        <div className="mt-6 border-t border-surface-200 pt-4 dark:border-surface-800">
          {isLoading ? (
            <div className="divide-y divide-surface-200 dark:divide-surface-800">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="py-4 animate-pulse space-y-2">
                  <div className="h-4 bg-surface-200 dark:bg-surface-800 rounded w-3/4" />
                  <div className="h-3 bg-surface-200 dark:bg-surface-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : historyData?.items.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800">
                <HistoryIcon className="h-4 w-4 text-surface-400" />
              </div>
              <p className="text-xs font-medium text-surface-700 dark:text-surface-300">
                {t("hist.empty.title")}
              </p>
              <p className="mt-1 text-[11px] text-surface-400">
                {search || statusFilter || favoriteFilter !== undefined || hasCodeFilter !== undefined
                  ? t("hist.empty.adjustFilters")
                  : t("hist.empty.createFirst")}
              </p>
              {!search && !statusFilter && favoriteFilter === undefined && hasCodeFilter === undefined && (
                <Button
                  onClick={() => navigate("/playground")}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  className="mt-4"
                  size="sm"
                >
                  {t("hist.empty.createButton")}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between text-[11px] text-surface-400">
                <span>
                  {t("hist.showing", { count: historyData!.items.length, total: historyData!.total })}
                </span>
                <Select
                  value={pageSize.toString()}
                  onChange={(v) => {
                    setPageSize(parseInt(v));
                    setPage(1);
                  }}
                  options={[
                    { value: "5", label: t("hist.perPage", { count: 5 }) },
                    { value: "10", label: t("hist.perPage", { count: 10 }) },
                    { value: "20", label: t("hist.perPage", { count: 20 }) },
                  ]}
                  className="w-28"
                />
              </div>

              <div className="divide-y divide-surface-200 dark:divide-surface-800">
                {historyData!.items.map((post) => (
                  <article
                    key={post.id}
                    onClick={() => handleViewDetail(post)}
                    className="group py-4 transition-colors cursor-pointer hover:bg-surface-100/50 dark:hover:bg-surface-900/50 -mx-3 px-3 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <Badge
                            variant={statusLabels[post.status]?.variant || "neutral"}
                            size="sm"
                            className="text-[10px]"
                          >
                            {statusLabels[post.status]?.label || post.status}
                          </Badge>

                          {post.is_edited && (
                            <Badge variant="warning" size="sm" className="text-[10px]">
                              {t("hist.editedBadge")}
                            </Badge>
                          )}

                          <span className="text-[11px] text-surface-400">
                            {post.format}
                          </span>

                          <span className="text-surface-300 dark:text-surface-700">•</span>

                          <span className="text-[11px] text-surface-400">
                            {new Date(post.created_at).toLocaleDateString(language)}
                          </span>

                          {post.is_favorite && (
                            <Heart className="h-3 w-3 text-red-500 fill-current" />
                          )}

                          {post.total_cost_usd != null && post.total_cost_usd > 0 && (
                            <Badge
                              variant="success"
                              size="sm"
                              className="text-[10px]"
                              title={t("hist.usage.totalCost")}
                            >
                              <DollarSign className="h-2.5 w-2.5" />
                              {post.total_cost_usd < 0.01
                                ? post.total_cost_usd.toFixed(5)
                                : post.total_cost_usd.toFixed(4)}
                            </Badge>
                          )}
                        </div>

                        <h3 className="text-xs font-semibold leading-snug text-surface-900 dark:text-surface-50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {post.topic}
                        </h3>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge variant="primary" size="sm" className="text-[10px]">
                            {post.style}
                          </Badge>
                          <Badge variant="outline" size="sm" className="text-[10px]">
                            {post.audience}
                          </Badge>
                          {post.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="neutral" size="sm" className="text-[10px]">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavoriteMutation.mutate({
                              id: post.id,
                              is_favorite: !post.is_favorite,
                            });
                          }}
                          className={post.is_favorite ? "text-red-500" : ""}
                          title={post.is_favorite ? t("hist.actions.removeFavorite") : t("hist.actions.favorite")}
                        >
                          <Heart
                            className={cn("h-3.5 w-3.5", post.is_favorite ? "fill-current" : "")}
                          />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTagEdit(post);
                          }}
                          title={t("hist.actions.editTags")}
                        >
                          <Tag className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(post.id);
                          }}
                          title={t("hist.actions.delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-6 flex justify-center border-t border-surface-200 pt-4 dark:border-surface-800">
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(historyData!.total / pageSize)}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}

          <Modal
            isOpen={!!showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(null)}
            title={t("hist.deleteModal.title")}
            description={t("hist.deleteModal.description")}
          >
            <p className="text-xs text-surface-600 dark:text-surface-400 mb-6">
              {t("hist.deleteModal.confirm")}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)}>
                {t("hist.deleteModal.cancel")}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (showDeleteConfirm) confirmDelete(showDeleteConfirm);
                }}
              >
                {t("hist.deleteModal.delete")}
              </Button>
            </div>
          </Modal>

          <Modal
            isOpen={!!editingTags}
            onClose={() => setEditingTags(null)}
            title={t("hist.tagsModal.title")}
            size="md"
          >
            {editingTags && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {editingTags.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="gap-1 text-xs">
                      #{tag}
                      <IconButton
                        variant="ghost"
                        size="sm"
                        ariaLabel={t("hist.tagsModal.removeAria", { tag })}
                        onClick={() => handleTagRemove(tag)}
                      >
                        <X className="h-3 w-3" />
                      </IconButton>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder={t("hist.tagsModal.placeholder")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleTagAdd(e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      handleTagAdd(editingTags.tags[editingTags.tags.length - 1] || "");
                    }}
                  >
                    {t("hist.tagsModal.add")}
                  </Button>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-surface-200 dark:border-surface-700">
                  <Button variant="secondary" onClick={() => setEditingTags(null)}>
                    {t("hist.tagsModal.cancel")}
                  </Button>
                  <Button variant="primary" onClick={handleTagSave}>
                    {t("hist.tagsModal.save")}
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      </div>
    </div>
  );
}

export default HistoryPage;

import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";

export interface BreadcrumbItem {
  label: string;
  to?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumb de navegação padronizado (Home > Seção > Página atual).
 * Itens intermediários com `to`/`onClick` viram links; o último item
 * representa a página atual.
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-xs", className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex min-w-0 items-center gap-x-2">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="shrink-0 select-none font-medium text-surface-300 dark:text-surface-600"
                >
                  &gt;
                </span>
              )}
              {isLast || (!item.to && !item.onClick) ? (
                <span
                  className="truncate font-medium text-surface-900 dark:text-surface-100"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : item.to ? (
                <Link
                  to={item.to}
                  className="truncate text-surface-400 transition-colors hover:text-surface-700 dark:hover:text-surface-200"
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="truncate text-surface-400 transition-colors hover:text-surface-700 dark:hover:text-surface-200"
                >
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;

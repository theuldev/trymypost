import { useState, useRef, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  meta?: string;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({
  options,
  value,
  onChange,
  placeholder,
  label,
  error,
  hint,
  className,
  disabled,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target)
      ) {
        const portalEl = document.getElementById("select-portal-root");
        if (portalEl && portalEl.contains(target)) return;
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [isOpen]);

useEffect(() => {
  if (!isOpen || !triggerRef.current) return;

  const updatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();

    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  };

  updatePosition();

  window.addEventListener("scroll", updatePosition, true);
  window.addEventListener("resize", updatePosition);

  return () => {
    window.removeEventListener("scroll", updatePosition, true);
    window.removeEventListener("resize", updatePosition);
  };
}, [isOpen]);
  const dropdown = isOpen ? (
    <div
      id="select-portal-root"
      style={dropdownStyle}
      className={cn(
        "overflow-hidden",
        "rounded-md",
        "border border-surface-200",
        "bg-white",
        "shadow-md",
        "dark:border-surface-700",
        "dark:bg-surface-900",
        "animate-in fade-in-0 zoom-in-95 duration-100"
      )}
      role="listbox"
      aria-activedescendant={value}
    >
      <div
        className={cn(
          "max-h-44 overflow-y-auto py-1",
          "[scrollbar-width:thin]",
          "[scrollbar-color:theme(colors.surface.300)_transparent]",
          "dark:[scrollbar-color:theme(colors.surface.600)_transparent]",
          "[&::-webkit-scrollbar]:w-1.5",
          "[&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:rounded-full",
          "[&::-webkit-scrollbar-thumb]:bg-surface-300",
          "[&::-webkit-scrollbar-thumb:hover]:bg-surface-400",
          "dark:[&::-webkit-scrollbar-thumb]:bg-surface-600",
          "dark:[&::-webkit-scrollbar-thumb:hover]:bg-surface-500"
        )}
      >
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2",
                "min-h-8 px-3 py-1.5",
                "text-left text-xs",
                "transition-colors duration-100",
                isSelected
                  ? cn(
                      "bg-primary-50",
                      "text-primary-700",
                      "dark:bg-primary-900/20",
                      "dark:text-primary-300"
                    )
                  : cn(
                      "text-surface-700",
                      "hover:bg-surface-50",
                      "dark:text-surface-300",
                      "dark:hover:bg-surface-800"
                    )
              )}
            >
              {option.icon && (
                <span className="flex shrink-0 items-center">{option.icon}</span>
              )}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.meta && (
                <span className="shrink-0 text-[10px] text-surface-400">
                  {option.meta}
                </span>
              )}
              {isSelected && (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary-600 dark:text-primary-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      {label && (
        <label className="mb-1 block text-xs font-medium text-surface-700 dark:text-surface-300">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          disabled={disabled}
          className={cn(
            "flex w-full items-center gap-2",
            "min-h-8 px-3 py-1.5",
            "rounded-md",
            "border bg-white",
            "text-left text-xs",
            "transition-colors duration-150",
            "focus:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-primary-500/30",
            "dark:bg-surface-900",
            error
              ? "border-red-500"
              : "border-surface-200 dark:border-surface-700",
            "hover:border-surface-300",
            "dark:hover:border-surface-600",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {selected?.icon && (
            <span className="flex shrink-0 items-center">{selected.icon}</span>
          )}
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              selected
                ? "text-surface-800 dark:text-surface-200"
                : "text-surface-400 dark:text-surface-500"
            )}
          >
            {selected?.label || placeholder || "Selecione..."}
          </span>
          {selected?.meta && (
            <span className="shrink-0 text-[11px] text-surface-400">
              {selected.meta}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-surface-400",
              "transition-transform duration-150",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </div>

      {hint && !error && (
        <p className="mt-1 text-[11px] leading-relaxed text-surface-400 dark:text-surface-500">
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-1 text-[11px] leading-relaxed text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
}

export default Select;

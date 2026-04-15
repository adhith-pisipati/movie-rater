"use client";

import { useEffect, useRef, useState } from "react";

interface RemovePopoverProps {
  /** Optional CSS class override for the trigger button. */
  triggerClassName?: string;
  /** Accessible label for the trigger button (e.g. `Remove ${movie.title}`). */
  triggerLabel?: string;
  /** Called when user picks "Remove for me" */
  onRemove: () => void;
  /** Called when user picks "Remove globally". If undefined, option is hidden. */
  onRemoveGlobally?: () => void;
}

export function RemovePopover({ triggerClassName, triggerLabel, onRemove, onRemoveGlobally }: RemovePopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        aria-label={triggerLabel ?? "Remove"}
        className={triggerClassName ?? "rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"}
        onClick={() => setOpen((o) => !o)}
      >
        X
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-10 mt-1 w-44 rounded border border-line bg-zinc-900 shadow-lg">
          <button
            role="menuitem"
            className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-800"
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
          >
            Remove for me
          </button>
          {onRemoveGlobally && (
            <button
              role="menuitem"
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800"
              onClick={() => {
                setOpen(false);
                onRemoveGlobally();
              }}
            >
              Remove globally
            </button>
          )}
        </div>
      )}
    </div>
  );
}

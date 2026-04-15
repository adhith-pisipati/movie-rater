"use client";

import { useEffect, useRef, useState } from "react";

interface RemovePopoverProps {
  /** Label for the trigger button (e.g. "X") */
  triggerClassName?: string;
  /** Called when user picks "Remove for me" */
  onRemove: () => void;
  /** Called when user picks "Remove globally". If undefined, option is hidden. */
  onRemoveGlobally?: () => void;
}

export function RemovePopover({ triggerClassName, onRemove, onRemoveGlobally }: RemovePopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        className={triggerClassName ?? "rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"}
        onClick={() => setOpen((o) => !o)}
      >
        X
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded border border-line bg-zinc-900 shadow-lg">
          <button
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

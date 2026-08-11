import * as React from "react"
import { UploadCloud } from "lucide-react"

import { cn } from "@/lib/utils"

export interface DropzoneButtonProps {
  label: string
  onFileSelect: (file: File) => void
  accept?: string
  className?: string
}

function DropzoneButton({
  label,
  onFileSelect,
  accept,
  className,
}: DropzoneButtonProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-transparent px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-ring hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        )}
      >
        <UploadCloud className="size-4" />
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFileSelect(file)
          event.target.value = ""
        }}
      />
    </div>
  )
}
DropzoneButton.displayName = "DropzoneButton"

export { DropzoneButton }

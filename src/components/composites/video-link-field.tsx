import * as React from "react"
import { Trash2, Upload, Video } from "lucide-react"

import { Input } from "@/components/atoms/input"
import { Button } from "@/components/atoms/button"
import { cn } from "@/lib/utils"

interface VideoLinkFieldProps {
  url?: string
  onUpload: (file: File) => void
  onRemove: () => void
  previewEmbedUrl?: string
  className?: string
}

export function VideoLinkField({ url, onUpload, onRemove, previewEmbedUrl, className }: VideoLinkFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Input value={url ?? ""} placeholder="https://..." readOnly className="flex-1" />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          <Upload />
          Enviar vídeo
        </Button>
        {url && (
          <Button type="button" variant="destructive" size="icon" onClick={onRemove} aria-label="Remover vídeo">
            <Trash2 />
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onUpload(file)
            event.target.value = ""
          }}
        />
      </div>
      {previewEmbedUrl ? (
        <div className="aspect-video overflow-hidden rounded-lg border border-border bg-muted">
          <iframe src={previewEmbedUrl} className="h-full w-full" allowFullScreen title="Preview do vídeo" />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 text-muted-foreground">
          <Video className="size-6" />
        </div>
      )}
    </div>
  )
}

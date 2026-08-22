import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import { cn } from "@/lib/utils"

export interface EntityEditModalShellProps {
  title: string
  description?: string
  onClose: () => void
  footer: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function EntityEditModalShell({
  title,
  description,
  onClose,
  footer,
  children,
  className,
}: EntityEditModalShellProps) {
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open, eventDetails) => {
        if (open) return
        if (eventDetails.reason === "outside-press") {
          const target = eventDetails.event.target
          // Selects/popovers do Radix (ex: atoms/select.tsx) portalizam seu
          // conteúdo em document.body, fora da subárvore do Popup do Base UI.
          // O Base UI lê cliques nesse conteúdo como "fora" do modal e o
          // fecharia — cancelamos nesse caso específico.
          if (target instanceof Element && target.closest("[data-radix-popper-content-wrapper]")) {
            eventDetails.cancel()
            return
          }
        }
        onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4 transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <Card
            className={cn(
              "relative max-h-full w-full max-w-lg gap-0 overflow-y-auto shadow-lg ring-1 ring-foreground/10",
              className
            )}
          >
            <CardHeader className="pr-10">
              <DialogPrimitive.Title render={<CardTitle />}>{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description render={<CardDescription />}>
                  {description}
                </DialogPrimitive.Description>
              )}
            </CardHeader>
            <CardContent className="space-y-4 py-4">{children}</CardContent>
            <CardFooter className="justify-end gap-2">{footer}</CardFooter>
            <DialogPrimitive.Close
              render={<Button variant="ghost" size="icon-sm" className="absolute top-3 right-3" />}
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </Card>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

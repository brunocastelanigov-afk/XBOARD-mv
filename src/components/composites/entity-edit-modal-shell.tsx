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
        // Selects/popovers do Radix (ex: atoms/select.tsx) portalizam seu
        // conteúdo em document.body, fora da subárvore do Popup do Base UI,
        // e escondem os demais elementos do body via aria-hidden enquanto
        // abertos (aria-hidden package / hideOthers). Isso faz o Base UI
        // enxergar QUALQUER clique nessa hora — mesmo dentro do card do
        // modal, não só no dropdown — como "fora" do Popup (reason
        // "outside-press" ou "focus-out"), fechando o modal por engano.
        // Checamos se ainda existe um popper Radix aberto no documento no
        // instante do evento: a remoção do nó do DOM só acontece num
        // re-render do React, que nunca ocorre de forma síncrona durante o
        // mesmo despacho do evento nativo — então essa checagem é confiável
        // independente da ordem dos listeners entre as duas libs.
        const nestedRadixPopoverOpen = document.querySelector("[data-radix-popper-content-wrapper]") !== null
        if (nestedRadixPopoverOpen && (eventDetails.reason === "outside-press" || eventDetails.reason === "focus-out")) {
          eventDetails.cancel()
          return
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

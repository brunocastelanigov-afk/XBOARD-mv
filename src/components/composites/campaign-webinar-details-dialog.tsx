import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/atoms/sheet"
import { Skeleton } from "@/components/atoms/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/atoms/table"
import { useDashboardFilters } from "@/contexts/dashboard-filters-context"
import { useDashboardQuery } from "@/hooks/use-dashboard-query"
import { fetchWebinarProductsForCampaign } from "@/lib/dashboard-queries"
import { formatCurrency, formatNumber } from "@/lib/format"

interface CampaignWebinarDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  utmSource: string
  utmCampaign: string
  utmMedium: string | null
}

export function CampaignWebinarDetailsDialog({
  open,
  onOpenChange,
  utmSource,
  utmCampaign,
  utmMedium,
}: CampaignWebinarDetailsDialogProps) {
  const { filters } = useDashboardFilters()
  const { data, error, loading } = useDashboardQuery(
    (signal) =>
      fetchWebinarProductsForCampaign(
        { utmSource, utmCampaign, utmMedium },
        filters,
        signal
      ),
    [filters, utmSource, utmCampaign, utmMedium]
  )
  const rows = data ?? []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Produtos de webinário</SheetTitle>
          <SheetDescription>{utmCampaign || "Sem campanha"}</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-4">
          {error && (
            <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Não foi possível carregar os produtos do webinário.
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton
                  key={index}
                  className="h-10 w-full"
                  style={{ opacity: 1 - index * 0.15 }}
                />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Vendas</TableHead>
                  <TableHead>Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      Nenhum produto encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.product_code}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{row.product_name}</span>
                          <span className="text-xs text-muted-foreground">{row.product_code}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatNumber(row.purchase_count)}</TableCell>
                      <TableCell>{formatCurrency(row.gross_revenue_cents)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

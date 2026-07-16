import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/atoms/table"
import { cn } from "@/lib/utils"

interface DataGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns: React.ReactNode[]
  data: any[][]
}

export function DataGrid({ columns, data, className, ...props }: DataGridProps) {
  return (
    <div className={cn("rounded-md border border-border overflow-x-auto", className)} {...props}>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            {columns.map((col, idx) => (
              <TableHead key={idx} className="whitespace-nowrap font-medium">{col}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                Nenhum dado encontrado.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex} className="whitespace-nowrap">
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

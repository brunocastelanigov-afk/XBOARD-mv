import { Search } from "lucide-react"

import { Input } from "@/components/atoms/input"
import { cn } from "@/lib/utils"

export interface SearchInputProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  className?: string
}

function SearchInput({
  placeholder,
  value,
  onChange,
  onSearch,
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSearch?.(value)
        }}
        className="pl-8"
      />
    </div>
  )
}
SearchInput.displayName = "SearchInput"

export { SearchInput }

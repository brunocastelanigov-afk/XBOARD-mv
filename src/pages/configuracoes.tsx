import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, Loader2 } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { Input } from "@/components/atoms/input"
import { Skeleton } from "@/components/atoms/skeleton"
import { StepperInput } from "@/components/atoms/stepper-input"
import { ApplyValueCard, type ApplyValueCardApplyState } from "@/components/composites/apply-value-card"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { cn } from "@/lib/utils"

type SaveState = "idle" | "saving" | "saved"

interface ConfiguracoesFormState {
  appName: string
  productIdsTrinca: string
  productIdsElite: string
  upgradeLink: string
  validadeTrincaDias: number
  validadeEliteDias: number
  renewLinkTrinca: string
  renewLinkElite: string
  supportLink: string
  supportWhatsapp: string
  supportEmail: string
}

const MOCK_CONFIG: ConfiguracoesFormState = {
  appName: "Treino Trinca",
  productIdsTrinca: "ae6ef3ee-3cff-4064-a0d7-0dcf31707b10,0ca58092-d29c-491b-a581-95a4e9d3c2f0",
  productIdsElite: "3afc8063-0bb9-4f1d-a2d3-7d69a976bda4,c2450419-c9c7-4ce1-39aa-c9d8f21a7b60",
  upgradeLink: "https://lastlink.com/p/C0AEA4904/checkout-payment?cp=CASHBACKD10OFF",
  validadeTrincaDias: 365,
  validadeEliteDias: 90,
  renewLinkTrinca: "https://checkout-trinca.lastlink.com/renew",
  renewLinkElite: "https://lastlink.com/p/C0AEA4904/checkout-payment?cp=CASHBACKD10OFF",
  supportLink: "https://pedrolotz.site/suporte-trinca",
  supportWhatsapp: "5511999999999",
  supportEmail: "suporte@app.com",
}

const MOCK_REAVALIACAO_DIAS = 45
const MOCK_LAST_APPLIED_TEXT = "Último prazo global aplicado em 14/05/2026, 02:11 (45 dias)"

interface ConfiguracoesPageProps {
  canEdit?: boolean
}

export function ConfiguracoesPage({ canEdit: canEditProp }: ConfiguracoesPageProps) {
  const [searchParams] = useSearchParams()
  const canEdit = canEditProp ?? searchParams.get("canEdit") !== "false"
  const forceLoading = searchParams.get("loading") === "1"

  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<ConfiguracoesFormState>(MOCK_CONFIG)
  const [reavaliacaoDias, setReavaliacaoDias] = useState(String(MOCK_REAVALIACAO_DIAS))
  const [lastAppliedText, setLastAppliedText] = useState(MOCK_LAST_APPLIED_TEXT)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [applyState, setApplyState] = useState<ApplyValueCardApplyState>("idle")

  useEffect(() => {
    if (forceLoading) return
    const timeout = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(timeout)
  }, [forceLoading])

  const pendingTimeouts = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    return () => {
      pendingTimeouts.current.forEach(clearTimeout)
    }
  }, [])

  function runAfter(delay: number, callback: () => void) {
    const id = setTimeout(callback, delay)
    pendingTimeouts.current.push(id)
  }

  const isLoading = forceLoading || loading

  function updateField<K extends keyof ConfiguracoesFormState>(key: K, value: ConfiguracoesFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (saveState !== "idle") return
    setSaveState("saving")
    runAfter(900, () => {
      setSaveState("saved")
      runAfter(1600, () => setSaveState("idle"))
    })
  }

  function handleApplyReavaliacao() {
    if (applyState !== "idle") return
    const days = Number(reavaliacaoDias)
    if (!Number.isFinite(days)) return
    setApplyState("loading")
    runAfter(900, () => {
      const now = new Date()
      const formattedDate = now.toLocaleDateString("pt-BR")
      const formattedTime = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      setLastAppliedText(`Último prazo global aplicado em ${formattedDate}, ${formattedTime} (${days} dias)`)
      setApplyState("success")
      runAfter(1600, () => setApplyState("idle"))
    })
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <form className="flex flex-1 flex-col gap-6 p-4 md:p-6" onSubmit={handleSave}>
        <EntityListHeader title="Configurações" className="items-start" />
        <p className="-mt-4 text-sm text-muted-foreground">Configurações gerais do sistema</p>

        {/* B — Informações do App */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Informações do App</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <label className="block space-y-2">
                <span className="text-sm font-medium">Nome do app</span>
                <Input
                  value={form.appName}
                  disabled={!canEdit}
                  onChange={(event) => updateField("appName", event.target.value)}
                />
              </label>
            )}
          </CardContent>
        </Card>

        {/* C — Funil, produtos e Elite */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Funil, produtos e Elite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">ID(s) do produto Treino Trinca</span>
                  <Input
                    value={form.productIdsTrinca}
                    disabled={!canEdit}
                    onChange={(event) => updateField("productIdsTrinca", event.target.value)}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">ID(s) do produto Trinca Elite</span>
                  <Input
                    value={form.productIdsElite}
                    disabled={!canEdit}
                    onChange={(event) => updateField("productIdsElite", event.target.value)}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Link de upgrade para o Elite</span>
                  <Input
                    value={form.upgradeLink}
                    disabled={!canEdit}
                    onChange={(event) => updateField("upgradeLink", event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Usado no botão "Conhecer o Elite" dentro do app.
                  </p>
                </label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Validade Trinca (dias)</span>
                    <StepperInput
                      value={form.validadeTrincaDias}
                      min={0}
                      disabled={!canEdit}
                      onChange={(value) => updateField("validadeTrincaDias", value)}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Validade Elite (dias)</span>
                    <StepperInput
                      value={form.validadeEliteDias}
                      min={0}
                      disabled={!canEdit}
                      onChange={(value) => updateField("validadeEliteDias", value)}
                    />
                  </label>
                </div>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Link de renovação Trinca</span>
                  <Input
                    value={form.renewLinkTrinca}
                    disabled={!canEdit}
                    onChange={(event) => updateField("renewLinkTrinca", event.target.value)}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Link de renovação Elite</span>
                  <Input
                    value={form.renewLinkElite}
                    disabled={!canEdit}
                    onChange={(event) => updateField("renewLinkElite", event.target.value)}
                  />
                </label>
              </>
            )}
          </CardContent>
        </Card>

        {/* D — Suporte */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Suporte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Link de suporte</span>
                  <Input
                    value={form.supportLink}
                    disabled={!canEdit}
                    onChange={(event) => updateField("supportLink", event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Esse link será usado no botão de suporte do aplicativo.
                  </p>
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">WhatsApp de suporte (opcional)</span>
                  <Input
                    value={form.supportWhatsapp}
                    disabled={!canEdit}
                    onChange={(event) => updateField("supportWhatsapp", event.target.value)}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">E-mail de suporte (opcional)</span>
                  <Input
                    value={form.supportEmail}
                    disabled={!canEdit}
                    onChange={(event) => updateField("supportEmail", event.target.value)}
                  />
                </label>
              </>
            )}
          </CardContent>
        </Card>

        {canEdit && (
          <Button
            type="submit"
            disabled={isLoading || saveState !== "idle"}
            className={cn("w-full", saveState === "saved" && "bg-green-600 hover:bg-green-600 text-white")}
          >
            {saveState === "saving" ? (
              <>
                <Loader2 className="animate-spin" />
                Salvando...
              </>
            ) : saveState === "saved" ? (
              <>
                <Check />
                Configurações salvas!
              </>
            ) : (
              "💾 Salvar configurações"
            )}
          </Button>
        )}

        {/* E — Prazo de Reavaliação */}
        {isLoading ? (
          <Card className="border border-border shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Prazo de Reavaliação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ) : (
          <ApplyValueCard
            title="Prazo de Reavaliação"
            description="Define o intervalo padrão; cada aluno mantém sua própria contagem individual."
            label="Prazo global de reavaliação (em dias)"
            value={reavaliacaoDias}
            onChange={setReavaliacaoDias}
            onApply={handleApplyReavaliacao}
            canApply={canEdit}
            applyState={applyState}
            helpText={`Cada aluno verá a reavaliação após ${reavaliacaoDias || 0} dia(s) contados da própria última avaliação ou liberação.`}
            lastAppliedText={lastAppliedText}
          />
        )}
      </form>
    </div>
  )
}

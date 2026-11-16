import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, Loader2 } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { Input } from "@/components/atoms/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select"
import { Skeleton } from "@/components/atoms/skeleton"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { adminMutation, adminRead, adminRpc } from "@/lib/admin-crm-api"
import { cn } from "@/lib/utils"

type SaveState = "idle" | "saving" | "saved"

interface AdminAppSettingsRow {
  app_name: string
  trinca_product_ids: string[]
  elite_product_ids: string[]
  trinca_validity_days: number
  elite_validity_days: number
  upgrade_url: string | null
  renewal_trinca_url: string | null
  renewal_elite_url: string | null
  support_url: string | null
  reassessment_days: number
  depends_on_future_table: boolean
  blocked_by: string | null
}

interface AdminSettingsMutationResponse {
  protocolLibraryMax: number
  upgradeUrl: string | null
  renewalTrincaUrl: string | null
  renewalEliteUrl: string | null
  supportUrl: string | null
  trincaValidityDays: number
  eliteValidityDays: number
  updatedAt: string
}

interface ConfiguracoesFormState {
  protocolLibraryMax: number
  appName: string
  validadeTrincaDias: number
  validadeEliteDias: number
  renewLinkTrinca: string
  renewLinkElite: string
  supportLink: string
}

const emptyForm: ConfiguracoesFormState = {
  protocolLibraryMax: 4,
  appName: "",
  validadeTrincaDias: 1,
  validadeEliteDias: 1,
  renewLinkTrinca: "",
  renewLinkElite: "",
  supportLink: "",
}

function settingsToForm(settings: AdminAppSettingsRow, protocolLibraryMax: number): ConfiguracoesFormState {
  return {
    protocolLibraryMax,
    appName: settings.app_name,
    validadeTrincaDias: settings.trinca_validity_days,
    validadeEliteDias: settings.elite_validity_days,
    renewLinkTrinca: settings.renewal_trinca_url ?? "",
    renewLinkElite: settings.renewal_elite_url ?? "",
    supportLink: settings.support_url ?? "",
  }
}

function nullableUrl(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

type CheckoutGateway = "lastlink" | "payt"

interface CheckoutSettings {
  checkoutSwitchEnabled: boolean
  checkoutGateway: CheckoutGateway
}

interface ConfiguracoesPageProps {
  canEdit?: boolean
}

export function ConfiguracoesPage({ canEdit: canEditProp }: ConfiguracoesPageProps) {
  const [searchParams] = useSearchParams()
  const canEdit = canEditProp ?? searchParams.get("canEdit") !== "false"
  const forceLoading = searchParams.get("loading") === "1"

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ConfiguracoesFormState>(emptyForm)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [checkoutSettings, setCheckoutSettings] = useState<CheckoutSettings | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [savingCheckout, setSavingCheckout] = useState(false)

  useEffect(() => {
    if (forceLoading) return
    let active = true
    void adminRead<CheckoutSettings>("/admin/settings/checkout-gateway").then(
      (settings) => { if (active) setCheckoutSettings(settings) },
      (error: unknown) => {
        if (active) setCheckoutError(errorMessage(error, "Erro ao carregar o checkout."))
      },
    )
    return () => { active = false }
  }, [forceLoading])

  async function saveCheckout(change: Partial<CheckoutSettings>) {
    if (!canEdit || savingCheckout) return
    setSavingCheckout(true)
    setCheckoutError(null)
    try {
      const saved = await adminMutation<CheckoutSettings>("/admin/settings", {
        method: "PATCH",
        body: change,
      })
      setCheckoutSettings(saved)
    } catch (error) {
      setCheckoutError(errorMessage(error, "Erro ao salvar o checkout."))
    } finally {
      setSavingCheckout(false)
    }
  }

  async function loadSettings() {
    setLoading(true)
    setError(null)

    try {
      const [settingsRows, library] = await Promise.all([
        adminRpc<AdminAppSettingsRow[]>("admin_app_settings_current"),
        adminRead<{ protocolLibraryMax: number }>("/admin/settings/protocol-library"),
      ])

      const settings = settingsRows[0]
      if (!settings) throw new Error("Contrato admin_app_settings_current retornou vazio.")

      setForm(settingsToForm(settings, library.protocolLibraryMax))
    } catch (loadError) {
      setError(errorMessage(loadError, "Erro ao carregar configurações."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (forceLoading) return
    void loadSettings()
  }, [forceLoading])

  const isLoading = forceLoading || loading

  function updateField<K extends keyof ConfiguracoesFormState>(key: K, value: ConfiguracoesFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (saveState !== "idle") return

    setSaveState("saving")
    setError(null)

    try {
      const saved = await adminMutation<AdminSettingsMutationResponse>("/admin/settings", {
        method: "PATCH",
        body: {
          protocolLibraryMax: form.protocolLibraryMax,
          renewalTrincaUrl: nullableUrl(form.renewLinkTrinca),
          renewalEliteUrl: nullableUrl(form.renewLinkElite),
          supportUrl: nullableUrl(form.supportLink),
          trincaValidityDays: form.validadeTrincaDias,
          eliteValidityDays: form.validadeEliteDias,
        },
      })

      setForm((current) => ({
        ...current,
        protocolLibraryMax: saved.protocolLibraryMax,
        renewLinkTrinca: saved.renewalTrincaUrl ?? "",
        renewLinkElite: saved.renewalEliteUrl ?? "",
        supportLink: saved.supportUrl ?? "",
        validadeTrincaDias: saved.trincaValidityDays,
        validadeEliteDias: saved.eliteValidityDays,
      }))
      setSaveState("saved")
    } catch (saveError) {
      setError(errorMessage(saveError, "Erro ao salvar configurações."))
      setSaveState("idle")
    }
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <form className="flex flex-1 flex-col gap-6 p-4 md:p-6" onSubmit={handleSave}>
        <EntityListHeader title="Configurações" className="items-start" />
        <p className="-mt-4 text-sm text-muted-foreground">Configurações gerais do sistema</p>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

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
                <Input value={form.appName} disabled />
              </label>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Suporte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <label className="block space-y-2">
                <span className="text-sm font-medium">Link de suporte</span>
                <Input
                  value={form.supportLink}
                  disabled={!canEdit}
                  onChange={(event) => updateField("supportLink", event.target.value)}
                />
                <p className="text-xs text-muted-foreground">Esse link será usado no botão de suporte do aplicativo.</p>
              </label>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Biblioteca de treinos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            {isLoading ? <Skeleton className="h-8 w-full" /> : (
              <label className="block space-y-2">
                <span className="text-sm font-medium">Máximo de protocolos por perfil</span>
                <Input type="number" min={3} max={5} step={1} required
                  value={form.protocolLibraryMax} disabled={!canEdit || saveState === "saving"}
                  onChange={(event) => updateField("protocolLibraryMax", event.target.valueAsNumber)} />
                <p className="text-xs text-muted-foreground">
                  Limite global de 3 a 5 alternativas completas por conjunto de respostas. Cada alternativa contém os três dias de treino.
                  Ao diminuir, os protocolos excedentes são preservados e ficam fora do sorteio. Ao aumentar, a biblioteca pode completar os conjuntos nas próximas gerações.
                </p>
              </label>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Checkout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            {checkoutError && <p role="alert" className="text-sm text-destructive">{checkoutError}</p>}
            {checkoutSettings ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span id="checkout-switch-label" className="text-sm font-medium">Troca de checkout</span>
                  <Button
                    type="button"
                    variant="outline"
                    role="switch"
                    aria-labelledby="checkout-switch-label"
                    aria-checked={checkoutSettings.checkoutSwitchEnabled}
                    disabled={!canEdit || savingCheckout}
                    onClick={() => void saveCheckout({ checkoutSwitchEnabled: !checkoutSettings.checkoutSwitchEnabled })}
                  >
                    {checkoutSettings.checkoutSwitchEnabled ? "Ligada" : "Desligada"}
                  </Button>
                </div>
                <div className="space-y-2">
                  <label htmlFor="checkout-gateway" className="text-sm font-medium">Gateway</label>
                  <Select
                    value={checkoutSettings.checkoutGateway}
                    disabled={!canEdit || savingCheckout}
                    onValueChange={(gateway: CheckoutGateway) => void saveCheckout({ checkoutGateway: gateway })}
                  >
                    <SelectTrigger id="checkout-gateway">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lastlink">Lastlink</SelectItem>
                      <SelectItem value="payt">Payt</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Com a troca desligada, o app usa a Lastlink.</p>
                </div>
              </>
            ) : checkoutError ? null : <Skeleton className="h-8 w-full" />}
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
              "Salvar configurações"
            )}
          </Button>
        )}
      </form>
    </div>
  )
}

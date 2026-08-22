import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, Loader2 } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { Input } from "@/components/atoms/input"
import { Skeleton } from "@/components/atoms/skeleton"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { adminMutation, adminRpc } from "@/lib/admin-crm-api"
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
  upgradeUrl: string | null
  renewalTrincaUrl: string | null
  renewalEliteUrl: string | null
  supportUrl: string | null
  trincaValidityDays: number
  eliteValidityDays: number
  updatedAt: string
}

interface ConfiguracoesFormState {
  appName: string
  validadeTrincaDias: number
  validadeEliteDias: number
  renewLinkTrinca: string
  renewLinkElite: string
  supportLink: string
}

const emptyForm: ConfiguracoesFormState = {
  appName: "",
  validadeTrincaDias: 1,
  validadeEliteDias: 1,
  renewLinkTrinca: "",
  renewLinkElite: "",
  supportLink: "",
}

function settingsToForm(settings: AdminAppSettingsRow): ConfiguracoesFormState {
  return {
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

  async function loadSettings() {
    setLoading(true)
    setError(null)

    try {
      const settingsRows = await adminRpc<AdminAppSettingsRow[]>("admin_app_settings_current")

      const settings = settingsRows[0]
      if (!settings) throw new Error("Contrato admin_app_settings_current retornou vazio.")

      setForm(settingsToForm(settings))
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
          renewalTrincaUrl: nullableUrl(form.renewLinkTrinca),
          renewalEliteUrl: nullableUrl(form.renewLinkElite),
          supportUrl: nullableUrl(form.supportLink),
          trincaValidityDays: form.validadeTrincaDias,
          eliteValidityDays: form.validadeEliteDias,
        },
      })

      setForm((current) => ({
        ...current,
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

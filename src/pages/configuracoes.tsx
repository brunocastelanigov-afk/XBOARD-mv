import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { AlertTriangle, Check, Loader2, Package } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { EmptyState } from "@/components/atoms/empty-state"
import { Input } from "@/components/atoms/input"
import { Skeleton } from "@/components/atoms/skeleton"
import { StepperInput } from "@/components/atoms/stepper-input"
import { ApplyValueCard, type ApplyValueCardApplyState } from "@/components/composites/apply-value-card"
import { EntityCard } from "@/components/composites/entity-card"
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

interface AdminLastlinkProductMapRow {
  product_id: string
  draft_product_id?: string
  tier: "mvp" | "elite"
  is_upsell: boolean
  label: string | null
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

interface AdminReassessmentResponse {
  reassessmentDays: number
  updatedAt: string
}

interface AdminLastlinkProductMapResponse {
  productId: string
  tier: "mvp" | "elite"
  isUpsell: boolean
  label: string | null
}

interface ConfiguracoesFormState {
  appName: string
  upgradeLink: string
  validadeTrincaDias: number
  validadeEliteDias: number
  renewLinkTrinca: string
  renewLinkElite: string
  supportLink: string
}

const emptyForm: ConfiguracoesFormState = {
  appName: "",
  upgradeLink: "",
  validadeTrincaDias: 1,
  validadeEliteDias: 1,
  renewLinkTrinca: "",
  renewLinkElite: "",
  supportLink: "",
}

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
})

function settingsToForm(settings: AdminAppSettingsRow): ConfiguracoesFormState {
  return {
    appName: settings.app_name,
    upgradeLink: settings.upgrade_url ?? "",
    validadeTrincaDias: settings.trinca_validity_days,
    validadeEliteDias: settings.elite_validity_days,
    renewLinkTrinca: settings.renewal_trinca_url ?? "",
    renewLinkElite: settings.renewal_elite_url ?? "",
    supportLink: settings.support_url ?? "",
  }
}

function productTitle(product: AdminLastlinkProductMapRow) {
  const tier = product.tier === "elite" ? "Elite" : "Trinca"
  return `${tier}${product.is_upsell ? " upsell" : ""}`
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
  const forceEmpty = searchParams.get("empty") === "1"

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ConfiguracoesFormState>(emptyForm)
  const [products, setProducts] = useState<AdminLastlinkProductMapRow[]>([])
  const [reavaliacaoDias, setReavaliacaoDias] = useState("")
  const [lastAppliedText, setLastAppliedText] = useState<string | undefined>()
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [applyState, setApplyState] = useState<ApplyValueCardApplyState>("idle")
  const [savingProductId, setSavingProductId] = useState<string | null>(null)

  async function loadSettings() {
    setLoading(true)
    setError(null)

    try {
      const [settingsRows, productRows] = await Promise.all([
        adminRpc<AdminAppSettingsRow[]>("admin_app_settings_current"),
        adminRpc<AdminLastlinkProductMapRow[]>("admin_lastlink_product_map"),
      ])

      const settings = settingsRows[0]
      if (!settings) throw new Error("Contrato admin_app_settings_current retornou vazio.")

      setForm(settingsToForm(settings))
      setProducts(productRows.map((product) => ({ ...product, draft_product_id: product.product_id })))
      setReavaliacaoDias(String(settings.reassessment_days))
      setLastAppliedText(`Prazo global atual: ${settings.reassessment_days} dia(s)`)
    } catch (loadError) {
      setError(errorMessage(loadError, "Erro ao carregar configurações."))
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (forceLoading) return
    void loadSettings()
  }, [forceLoading])

  const isLoading = forceLoading || loading
  const visibleProducts = forceEmpty ? [] : products

  const groupedProducts = useMemo(() => {
    return {
      trinca: visibleProducts.filter((product) => product.tier === "mvp"),
      elite: visibleProducts.filter((product) => product.tier === "elite"),
    }
  }, [visibleProducts])

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
          upgradeUrl: nullableUrl(form.upgradeLink),
          renewalTrincaUrl: nullableUrl(form.renewLinkTrinca),
          renewalEliteUrl: nullableUrl(form.renewLinkElite),
          supportUrl: nullableUrl(form.supportLink),
          trincaValidityDays: form.validadeTrincaDias,
          eliteValidityDays: form.validadeEliteDias,
        },
      })

      setForm((current) => ({
        ...current,
        upgradeLink: saved.upgradeUrl ?? "",
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

  async function handleApplyReavaliacao() {
    if (applyState !== "idle") return

    const days = Number(reavaliacaoDias)
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setError("Informe um prazo de reavaliação entre 1 e 365 dias.")
      return
    }

    setApplyState("loading")
    setError(null)

    try {
      const response = await adminMutation<AdminReassessmentResponse>("/admin/settings/reassessment", {
        method: "PATCH",
        body: { reassessmentDays: days },
      })
      setReavaliacaoDias(String(response.reassessmentDays))
      setLastAppliedText(
        `Último prazo global aplicado em ${dateTimeFormatter.format(new Date(response.updatedAt))} (${response.reassessmentDays} dias)`
      )
      setApplyState("success")
    } catch (applyError) {
      setError(errorMessage(applyError, "Erro ao aplicar reavaliação."))
      setApplyState("idle")
    }
  }

  function handleProductDraftChange(
    productId: string,
    patch: Partial<Pick<AdminLastlinkProductMapRow, "draft_product_id" | "label">>
  ) {
    setProducts((current) =>
      current.map((product) => (product.product_id === productId ? { ...product, ...patch } : product))
    )
  }

  async function handleSaveProduct(product: AdminLastlinkProductMapRow) {
    if (savingProductId) return
    const label = product.label?.trim() ?? ""
    const nextProductId = product.draft_product_id?.trim() ?? ""
    if (!nextProductId) {
      setError("Informe um product ID para o produto LastLink.")
      return
    }
    if (!label) {
      setError("Informe um label para o produto LastLink.")
      return
    }

    setSavingProductId(product.product_id)
    setError(null)

    try {
      const saved = await adminMutation<AdminLastlinkProductMapResponse>(
        `/admin/lastlink-product-map/${encodeURIComponent(product.product_id)}`,
        { method: "PATCH", body: { productId: nextProductId, label } }
      )
      setProducts((current) =>
        current.map((item) =>
          item.product_id === product.product_id
            ? {
                product_id: saved.productId,
                draft_product_id: saved.productId,
                tier: saved.tier,
                is_upsell: saved.isUpsell,
                label: saved.label,
              }
            : item
        )
      )
    } catch (productError) {
      setError(errorMessage(productError, "Erro ao salvar produto LastLink."))
    } finally {
      setSavingProductId(null)
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
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ProductGroup title="Produtos Treino Trinca" products={groupedProducts.trinca} />
                  <ProductGroup title="Produtos Trinca Elite" products={groupedProducts.elite} />
                </div>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Link de upgrade para o Elite</span>
                  <Input
                    value={form.upgradeLink}
                    disabled={!canEdit}
                    onChange={(event) => updateField("upgradeLink", event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Usado no botão "Conhecer o Elite" dentro do app.</p>
                </label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Validade Trinca (dias)</span>
                    <StepperInput
                      value={form.validadeTrincaDias}
                      min={1}
                      disabled={!canEdit}
                      onChange={(value) => updateField("validadeTrincaDias", value)}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Validade Elite (dias)</span>
                    <StepperInput
                      value={form.validadeEliteDias}
                      min={1}
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

        <Card className="border border-border shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Mapa LastLink</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : visibleProducts.length === 0 ? (
              <EmptyState icon={Package} message="Nenhum produto LastLink encontrado." />
            ) : (
              visibleProducts.map((product) => (
                <EntityCard
                  key={product.product_id}
                  title={productTitle(product)}
                  metadata={[product.product_id]}
                  badges={[
                    { label: product.tier === "elite" ? "Elite" : "Trinca", variant: "outline" },
                    ...(product.is_upsell ? [{ label: "Upsell", variant: "secondary" as const }] : []),
                  ]}
                >
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-end">
                    <label className="block space-y-2">
                      <span className="text-sm font-medium">Product ID LastLink</span>
                      <Input
                        value={product.draft_product_id ?? product.product_id}
                        disabled={!canEdit}
                        onChange={(event) =>
                          handleProductDraftChange(product.product_id, { draft_product_id: event.target.value })
                        }
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium">Label</span>
                      <Input
                        value={product.label ?? ""}
                        disabled={!canEdit}
                        onChange={(event) => handleProductDraftChange(product.product_id, { label: event.target.value })}
                      />
                    </label>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={savingProductId === product.product_id}
                        onClick={() => handleSaveProduct(product)}
                      >
                        {savingProductId === product.product_id ? "Salvando..." : "Salvar produto"}
                      </Button>
                    )}
                  </div>
                </EntityCard>
              ))
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
          <div className="space-y-3">
            <div className="flex gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <p>
                Este valor salva no admin, mas o app ainda não consome esse prazo para alterar o contador/restante
                de treino dos alunos.
              </p>
            </div>
            <ApplyValueCard
              title="Prazo de Reavaliação"
              description="Define o intervalo padrão salvo nas configurações administrativas."
              label="Prazo global de reavaliação (em dias)"
              value={reavaliacaoDias}
              onChange={setReavaliacaoDias}
              onApply={handleApplyReavaliacao}
              canApply={canEdit}
              applyState={applyState}
              helpText="Integração pendente no app: hoje este campo não muda a contagem visível do aluno."
              lastAppliedText={lastAppliedText}
            />
          </div>
        )}
      </form>
    </div>
  )
}

function ProductGroup({ title, products }: { title: string; products: AdminLastlinkProductMapRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-sm font-medium">{title}</p>
      {products.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Nenhum product id neste grupo.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {products.map((product) => (
            <li key={product.product_id} className="break-all">
              {product.product_id}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

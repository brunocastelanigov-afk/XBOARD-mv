import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, ImageIcon, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Card, CardContent } from "@/components/atoms/card"
import { DropzoneButton } from "@/components/atoms/dropzone-button"
import { EmptyState } from "@/components/atoms/empty-state"
import { Input } from "@/components/atoms/input"
import { PlanBadge, type Plan } from "@/components/atoms/plan-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Skeleton } from "@/components/atoms/skeleton"
import { StepperInput } from "@/components/atoms/stepper-input"
import { EntityCard } from "@/components/composites/entity-card"
import { EntityEditModalShell } from "@/components/composites/entity-edit-modal-shell"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { AdminApiError, adminMutation, adminRpc } from "@/lib/admin-crm-api"

type BannerStatus = "active" | "inactive"

interface AdminBannerRow {
  banner_id: string
  plano: Plan
  ordem: number
  imagem_url: string
  link: string
  ativo: boolean
}

interface AdminBannerResponse {
  bannerId: string
  plano: Plan
  ordem: number
  imagemUrl: string
  link: string
  ativo: boolean
}

interface Banner {
  id: string
  title: string
  imageUrl: string
  linkUrl: string
  plan: Plan
  order: number
  status: BannerStatus
}

interface BannerFormState {
  imageUrl: string
  title: string
  linkUrl: string
  plan: Plan
  order: number
  status: BannerStatus
}

function bannerTitle(plan: Plan, order: number) {
  return `Banner ${plan === "elite" ? "Elite" : "Trinca"} #${order}`
}

function rowToBanner(row: AdminBannerRow): Banner {
  return {
    id: row.banner_id,
    title: bannerTitle(row.plano, row.ordem),
    imageUrl: row.imagem_url,
    linkUrl: row.link,
    plan: row.plano,
    order: row.ordem,
    status: row.ativo ? "active" : "inactive",
  }
}

function responseToBanner(row: AdminBannerResponse): Banner {
  return {
    id: row.bannerId,
    title: bannerTitle(row.plano, row.ordem),
    imageUrl: row.imagemUrl,
    linkUrl: row.link,
    plan: row.plano,
    order: row.ordem,
    status: row.ativo ? "active" : "inactive",
  }
}

function toFormState(banner: Banner | null): BannerFormState {
  if (!banner) {
    return { imageUrl: "", title: "", linkUrl: "", plan: "elite", order: 1, status: "active" }
  }
  return {
    imageUrl: banner.imageUrl,
    title: banner.title,
    linkUrl: banner.linkUrl,
    plan: banner.plan,
    order: banner.order,
    status: banner.status,
  }
}

function errorMessage(error: unknown) {
  if (error instanceof AdminApiError && error.status === 409) {
    return "Conflito real do backend: ja existe outro banner ativo para este plano e ordem."
  }
  return error instanceof Error ? error.message : "Nao foi possivel concluir a operacao."
}

type SaveState = "idle" | "saving" | "saved"

interface BannersPageProps {
  canEdit?: boolean
}

export function BannersPage({ canEdit: canEditProp }: BannersPageProps) {
  const [searchParams] = useSearchParams()
  const canEdit = canEditProp ?? searchParams.get("canEdit") !== "false"
  const forceEmpty = searchParams.get("empty") === "1"
  const forceLoading = searchParams.get("loading") === "1"

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [banners, setBanners] = useState<Banner[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<BannerFormState>(toFormState(null))
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingBanner, setDeletingBanner] = useState<Banner | null>(null)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function loadBanners() {
    setLoading(true)
    setError(null)
    try {
      const rows = await adminRpc<AdminBannerRow[]>("admin_banners_list")
      setBanners(rows.map(rowToBanner))
    } catch (loadError) {
      setError(errorMessage(loadError))
      setBanners([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (forceLoading) return
    void loadBanners()
  }, [forceLoading])

  const isLoading = forceLoading || loading
  const list = forceEmpty ? [] : banners

  function openNewModal() {
    setEditingId(null)
    setForm(toFormState(null))
    setFormError(null)
    setModalOpen(true)
  }

  function openEditModal(banner: Banner) {
    setEditingId(banner.id)
    setForm(toFormState(banner))
    setFormError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setFormError(null)
    setSaveState("idle")
  }

  async function handleConfirmDelete() {
    if (!deletingBanner || deleteLoading) return
    setDeleteLoading(true)
    setError(null)
    try {
      await adminMutation<{ bannerId: string; deleted: boolean }>(`/admin/banners/${deletingBanner.id}`, {
        method: "DELETE",
      })
      setBanners((current) => current.filter((banner) => banner.id !== deletingBanner.id))
      setDeletingBanner(null)
    } catch (deleteError) {
      setError(errorMessage(deleteError))
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (saveState !== "idle") return

    setFormError(null)
    setSaveState("saving")

    const payload = {
      plano: form.plan,
      ordem: form.order,
      imagemUrl: form.imageUrl,
      link: form.linkUrl || "/",
      ativo: form.status === "active",
    }

    try {
      const saved = editingId
        ? await adminMutation<AdminBannerResponse>(`/admin/banners/${editingId}`, {
            method: "PATCH",
            body: payload,
          })
        : await adminMutation<AdminBannerResponse>("/admin/banners", {
            method: "POST",
            body: payload,
          })

      const nextBanner = responseToBanner(saved)
      setBanners((current) =>
        editingId
          ? current.map((banner) => (banner.id === editingId ? nextBanner : banner))
          : [nextBanner, ...current]
      )
      setSaveState("saved")
      window.setTimeout(closeModal, 700)
    } catch (submitError) {
      setFormError(errorMessage(submitError))
      setSaveState("idle")
    }
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <EntityListHeader
          title="Banners"
          className="items-start"
          actions={canEdit ? [{ label: "Adicionar", icon: Plus, onClick: openNewModal }] : []}
        />
        <p className="-mt-4 text-sm text-muted-foreground">
          Configure quantos banners quiser por plano. Eles giram automaticamente a cada 10
          segundos e o link é opcional.
        </p>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }, (_, index) => (
              <Card key={index}>
                <Skeleton className="h-32 w-full rounded-t-lg rounded-b-none" />
                <CardContent className="space-y-2 p-4">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={ImageIcon} message="Nenhum banner cadastrado ainda." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {list.map((banner) => (
              <EntityCard
                key={banner.id}
                title={banner.title}
                badges={[
                  {
                    label: banner.status === "active" ? "Ativo" : "Inativo",
                    variant: banner.status === "active" ? "default" : "outline",
                  },
                ]}
                metadata={[banner.linkUrl]}
                actions={
                  canEdit
                    ? [
                        { icon: Pencil, onClick: () => openEditModal(banner), label: "Editar" },
                        {
                          icon: Trash2,
                          onClick: () => setDeletingBanner(banner),
                          label: `Excluir "${banner.title}"`,
                          variant: "destructive",
                        },
                      ]
                    : []
                }
              >
                <div className="space-y-2">
                  <PlanBadge plan={banner.plan} />
                  <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted/40">
                    {banner.imageUrl ? (
                      <img
                        src={banner.imageUrl}
                        alt={banner.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="size-6 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </EntityCard>
            ))}
          </div>
        )}
      </div>

      {canEdit && modalOpen && (
        <EntityEditModalShell
          title={editingId ? "Editar banner" : "Adicionar banner"}
          onClose={closeModal}
          footer={
            <Button
              type="submit"
              form="banner-edit-form"
              disabled={saveState !== "idle"}
              className={saveState === "saved" ? "bg-green-600 hover:bg-green-600 text-white" : undefined}
            >
              {saveState === "saving" ? (
                <>
                  <Loader2 className="animate-spin" />
                  Salvando...
                </>
              ) : saveState === "saved" ? (
                <>
                  <Check />
                  Salvo!
                </>
              ) : (
                "Salvar banner"
              )}
            </Button>
          }
        >
          <form id="banner-edit-form" className="space-y-4" onSubmit={handleSubmit}>
            {formError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            )}

            <div className="space-y-2">
              <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted/40">
                {form.imageUrl ? (
                  <img
                    src={form.imageUrl}
                    alt="Preview do banner"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="size-6 text-muted-foreground" />
                )}
              </div>
              <DropzoneButton
                label="Escolher imagem"
                accept="image/*"
                onFileSelect={(file) =>
                  setForm((current) => ({ ...current, imageUrl: URL.createObjectURL(file) }))
                }
              />
              <Input
                placeholder="URL da imagem"
                value={form.imageUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, imageUrl: event.target.value }))
                }
              />
            </div>

            <Input
              placeholder="Título interno"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
            <Input
              placeholder="Link ao clicar"
              value={form.linkUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, linkUrl: event.target.value }))
              }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select
                value={form.plan}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, plan: value as Plan }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aparece para" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elite">Plano Elite</SelectItem>
                  <SelectItem value="trinca">Plano Trinca</SelectItem>
                </SelectContent>
              </Select>
              <StepperInput
                value={form.order}
                min={1}
                onChange={(value) => setForm((current) => ({ ...current, order: value }))}
              />
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, status: value as BannerStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
        </EntityEditModalShell>
      )}

      {deletingBanner && (
        <EntityEditModalShell
          title="Excluir banner"
          description={`Tem certeza que deseja excluir "${deletingBanner.title}"? Essa ação não pode ser desfeita.`}
          onClose={() => setDeletingBanner(null)}
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setDeletingBanner(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
              >
                {deleteLoading ? "Excluindo..." : "Excluir definitivamente"}
              </Button>
            </>
          }
        />
      )}
    </div>
  )
}

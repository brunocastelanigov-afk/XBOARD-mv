import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, ImageIcon, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/atoms/button"
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
import { Card, CardContent } from "@/components/atoms/card"

type BannerStatus = "active" | "inactive"

interface Banner {
  id: string
  title: string
  imageUrl: string
  linkUrl?: string
  plan: Plan
  order: number
  status: BannerStatus
}

const MOCK_BANNERS: Banner[] = [
  {
    id: "banner-elite-exemplo",
    title: "Banner Elite exemplo",
    imageUrl: "",
    linkUrl: "https://www.instagram.com/",
    plan: "elite",
    order: 1,
    status: "active",
  },
  {
    id: "banner-trinca-exemplo",
    title: "Banner Trinca exemplo",
    imageUrl: "",
    linkUrl: "/upsell-app?src=upsell-banner",
    plan: "trinca",
    order: 1,
    status: "active",
  },
]

interface BannerFormState {
  imageUrl: string
  title: string
  linkUrl: string
  plan: Plan
  order: number
  status: BannerStatus
}

function toFormState(banner: Banner | null): BannerFormState {
  if (!banner) {
    return { imageUrl: "", title: "", linkUrl: "", plan: "elite", order: 1, status: "active" }
  }
  return {
    imageUrl: banner.imageUrl,
    title: banner.title,
    linkUrl: banner.linkUrl ?? "",
    plan: banner.plan,
    order: banner.order,
    status: banner.status,
  }
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
  const [banners, setBanners] = useState<Banner[]>(MOCK_BANNERS)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<BannerFormState>(toFormState(null))
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingBanner, setDeletingBanner] = useState<Banner | null>(null)
  const [saveState, setSaveState] = useState<SaveState>("idle")

  useEffect(() => {
    if (forceLoading) return
    const timeout = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(timeout)
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

  function handleConfirmDelete() {
    if (!deletingBanner) return
    setBanners((current) => current.filter((banner) => banner.id !== deletingBanner.id))
    setDeletingBanner(null)
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (saveState !== "idle") return

    if (form.status === "active") {
      const conflict = banners.some(
        (banner) =>
          banner.id !== editingId &&
          banner.plan === form.plan &&
          banner.order === form.order &&
          banner.status === "active"
      )
      if (conflict) {
        const planLabel = form.plan === "elite" ? "Elite" : "Trinca"
        setFormError(
          `Já existe um banner ativo para o plano ${planLabel} na ordem ${form.order}. Altere a ordem ou desative o outro banner antes de salvar.`
        )
        return
      }
    }

    setFormError(null)
    setSaveState("saving")

    setTimeout(() => {
      if (editingId) {
        setBanners((current) =>
          current.map((banner) =>
            banner.id === editingId
              ? {
                  ...banner,
                  title: form.title,
                  imageUrl: form.imageUrl,
                  linkUrl: form.linkUrl || undefined,
                  plan: form.plan,
                  order: form.order,
                  status: form.status,
                }
              : banner
          )
        )
      } else {
        setBanners((current) => [
          {
            id: `mock-${Date.now()}`,
            title: form.title || "Novo banner",
            imageUrl: form.imageUrl,
            linkUrl: form.linkUrl || undefined,
            plan: form.plan,
            order: form.order,
            status: form.status,
          },
          ...current,
        ])
      }

      setSaveState("saved")
      setTimeout(() => {
        closeModal()
      }, 700)
    }, 700)
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
                metadata={banner.linkUrl ? [banner.linkUrl] : undefined}
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
          title="Editar banner"
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
                "💾 Salvar banner"
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
              placeholder="Link ao clicar (opcional)"
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
              <Button type="button" variant="destructive" onClick={handleConfirmDelete}>
                Excluir definitivamente
              </Button>
            </>
          }
        />
      )}
    </div>
  )
}

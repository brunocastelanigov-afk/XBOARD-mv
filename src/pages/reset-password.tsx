import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/atoms/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { Input } from "@/components/atoms/input"
import { supabase } from "@/lib/supabase"

export function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (updateError) {
      setError("Não foi possível alterar a senha.")
      return
    }

    navigate("/respostas", { replace: true })
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-sm border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl">Definir nova senha</CardTitle>
          <p className="text-sm text-muted-foreground">
            A senha deve ter pelo menos 8 caracteres.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <Input
              type="password"
              value={password}
              minLength={8}
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? "Salvando..." : "Salvar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

import { useState, type FormEvent } from "react"
import { Mail, LockKeyhole } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/atoms/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { Input } from "@/components/atoms/input"
import { supabase } from "@/lib/supabase"

export function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const reason = (location.state as { reason?: string } | null)?.reason

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    setLoading(false)

    if (authError) {
      setError("Email ou senha inválidos.")
      return
    }

    navigate("/respostas", { replace: true })
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-sm border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl">Entrar no Dashboard</CardTitle>
          <p className="text-sm text-muted-foreground">
            Acesso privado para o time do funil.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {reason === "forbidden" && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Este email não tem acesso ao dashboard.
              </div>
            )}
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <label className="block space-y-2">
              <span className="text-sm font-medium">Email</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Senha</span>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
            </label>
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <Link
              className="block text-center text-sm text-primary hover:underline"
              to="/forgot-password"
            >
              Recuperar senha
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

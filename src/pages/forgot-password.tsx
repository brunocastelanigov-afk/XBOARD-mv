import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/atoms/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { Input } from "@/components/atoms/input"
import { supabase } from "@/lib/supabase"

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` }
    )

    setLoading(false)

    if (resetError) {
      setError("Não foi possível enviar o email de recuperação.")
      return
    }

    setMessage("Email de recuperação enviado.")
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-sm border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl">Recuperar senha</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enviaremos um link para redefinir a senha do usuário do time.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
                {message}
              </div>
            )}
            <Input
              type="email"
              value={email}
              autoComplete="email"
              placeholder="email@time.com"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? "Enviando..." : "Enviar recuperação"}
            </Button>
            <Link
              className="block text-center text-sm text-primary hover:underline"
              to="/login"
            >
              Voltar para login
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

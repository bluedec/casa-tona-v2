import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { supabase } from "~/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);
  const navigate = useNavigate();

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email(),
      password: password(),
    });
    setLoading(false);
    if (error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <main class="flex min-h-[70vh] items-center justify-center p-4">
      <form onSubmit={handleSubmit} class="card w-full max-w-sm space-y-4 p-8 shadow-sm">
        <div>
          <h1 class="text-2xl font-semibold tracking-wide text-stone-900">Casa Tona</h1>
          <p class="text-sm text-stone-500">Inicia sesión para continuar</p>
        </div>
        <div class="space-y-1">
          <label class="block text-sm font-medium text-stone-700" for="email">
            Correo
          </label>
          <input
            id="email"
            type="email"
            required
            value={email()}
            onInput={e => setEmail(e.currentTarget.value)}
            class="field"
          />
        </div>
        <div class="space-y-1">
          <label class="block text-sm font-medium text-stone-700" for="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            value={password()}
            onInput={e => setPassword(e.currentTarget.value)}
            class="field"
          />
        </div>
        <Show when={error()}>
          <p class="text-sm text-red-600">{error()}</p>
        </Show>
        <button type="submit" disabled={loading()} class="btn-primary w-full">
          {loading() ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}

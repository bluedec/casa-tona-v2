import { useLocation, useNavigate } from "@solidjs/router";
import { Show } from "solid-js";
import { useAuth } from "~/lib/auth";

export default function Nav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, profile, isAdmin, signOut } = useAuth();
  const active = (path: string) =>
    path == location.pathname ? "border-white text-white" : "border-transparent text-stone-400 hover:border-stone-500 hover:text-stone-100";

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <nav class="bg-black">
      <ul class="container mx-auto flex items-center p-3 text-stone-300">
        <li class="mr-6 font-semibold tracking-wide text-white">Casa Tona</li>
        <Show when={session()}>
          <li class={`border-b-2 ${active("/")} mx-1.5 sm:mx-6`}>
            <a href="/">Inicio</a>
          </li>
          <li class={`border-b-2 ${active("/eventos")} mx-1.5 sm:mx-6`}>
            <a href="/eventos">Eventos</a>
          </li>
          <li class={`border-b-2 ${active("/inventario")} mx-1.5 sm:mx-6`}>
            <a href="/inventario">Inventario</a>
          </li>
          <Show when={isAdmin()}>
            <li class={`border-b-2 ${active("/flujo-general")} mx-1.5 sm:mx-6`}>
              <a href="/flujo-general">Flujo general</a>
            </li>
          </Show>
        </Show>
        <li class="ml-auto flex items-center gap-3 text-sm">
          <Show
            when={session()}
            fallback={
              <a href="/login" class="text-stone-300 hover:text-white">
                Iniciar sesión
              </a>
            }
          >
            <span class="text-stone-400">{profile()?.full_name}</span>
            <button onClick={handleSignOut} class="text-stone-300 hover:text-white">
              Cerrar sesión
            </button>
          </Show>
        </li>
      </ul>
    </nav>
  );
}

import { createEffect, Show, type JSX } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useAuth } from "~/lib/auth";

export default function Protected(props: { children: JSX.Element; adminOnly?: boolean }) {
  const { session, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  createEffect(() => {
    if (!loading() && !session()) {
      navigate("/login", { replace: true });
    }
  });

  return (
    <Show
      when={!loading() && session()}
      fallback={<p class="p-8 text-center text-stone-500">Cargando...</p>}
    >
      <Show
        when={!props.adminOnly || isAdmin()}
        fallback={<p class="p-8 text-center text-red-600">No tienes permiso para ver esta página.</p>}
      >
        {props.children}
      </Show>
    </Show>
  );
}

import { A } from "@solidjs/router";

export default function NotFound() {
  return (
    <main class="text-center mx-auto text-stone-700 p-4">
      <h1 class="max-6-xs text-6xl text-stone-900 font-thin uppercase my-16">Página no encontrada</h1>
      <p class="my-4">
        <A href="/" class="link">
          Volver al inicio
        </A>
      </p>
    </main>
  );
}

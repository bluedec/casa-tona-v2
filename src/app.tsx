import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { ErrorBoundary, Suspense } from "solid-js";
import Nav from "~/components/Nav";
import { AuthProvider } from "~/lib/auth";
import "./app.css";

export default function App() {
  return (
    <Router
      root={props => (
        <AuthProvider>
          <Nav />
          <ErrorBoundary
            fallback={err => {
              console.error("Error en la aplicación:", err, err?.cause);
              return (
                <pre class="whitespace-pre-wrap p-4 text-xs text-red-600">
                  {JSON.stringify({ message: err?.message, cause: err?.cause, stack: err?.stack }, null, 2)}
                </pre>
              );
            }}
          >
            <Suspense>{props.children}</Suspense>
          </ErrorBoundary>
        </AuthProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}


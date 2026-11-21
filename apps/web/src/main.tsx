import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router";

import { AuthPage } from "./routes/auth.js";
import { AuthCallbackPage } from "./routes/auth-callback.js";
import { HomePage } from "./routes/home.js";
import { LegalPage, NotFoundPage } from "./routes/legal.js";
import { OnboardingPage } from "./routes/onboarding.js";
import { AuthProvider, RequireAuth } from "./lib/auth.js";
import "./index.css";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RequireAuth>
        <HomePage />
      </RequireAuth>
    ),
  },
  { path: "/auth/login", element: <AuthPage mode="login" /> },
  { path: "/auth/register", element: <AuthPage mode="register" /> },
  { path: "/auth/callback", element: <AuthCallbackPage /> },
  {
    path: "/onboarding",
    element: (
      <RequireAuth>
        <OnboardingPage />
      </RequireAuth>
    ),
  },
  {
    path: "/privasi",
    element: (
      <LegalPage
        title="Kebijakan Privasi"
        description="Kami memakai data usahamu hanya untuk menjalankan layanan Gerailo, sesuai UU PDP No. 27/2022."
      />
    ),
  },
  {
    path: "/syarat",
    element: (
      <LegalPage
        title="Syarat Layanan"
        description="Ketentuan penggunaan Gerailo untuk penjual UMKM, termasuk batas paket dan tanggung jawab data."
      />
    ),
  },
  { path: "*", element: <NotFoundPage /> },
]);

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemen #root tidak ditemukan");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

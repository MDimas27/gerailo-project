import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router";

import { AdminParserPage } from "./routes/admin-parser.js";
import { AuthPage } from "./routes/auth.js";
import { AuthCallbackPage } from "./routes/auth-callback.js";
import { HomePage } from "./routes/home.js";
import { LegalPage, NotFoundPage } from "./routes/legal.js";
import { OnboardingPage } from "./routes/onboarding.js";
import { PasteConfirmPage } from "./routes/paste-confirm.js";
import { PastePage } from "./routes/paste.js";
import { ProductFormPage } from "./routes/product-form.js";
import { ProductsPage } from "./routes/products.js";
import { SharePage } from "./routes/share.js";
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
    path: "/admin/parser",
    element: (
      <RequireAuth>
        <AdminParserPage />
      </RequireAuth>
    ),
  },
  {
    path: "/share",
    element: (
      <RequireAuth>
        <SharePage />
      </RequireAuth>
    ),
  },
  {
    path: "/tes-smart-paste",
    element: (
      <RequireAuth>
        <Navigate to="/paste" replace />
      </RequireAuth>
    ),
  },
  {
    path: "/paste",
    element: (
      <RequireAuth>
        <PastePage />
      </RequireAuth>
    ),
  },
  {
    path: "/paste/confirm",
    element: (
      <RequireAuth>
        <PasteConfirmPage />
      </RequireAuth>
    ),
  },
  {
    path: "/products",
    element: (
      <RequireAuth>
        <ProductsPage />
      </RequireAuth>
    ),
  },
  {
    path: "/products/new",
    element: (
      <RequireAuth>
        <ProductFormPage mode="create" />
      </RequireAuth>
    ),
  },
  {
    path: "/products/:id/edit",
    element: (
      <RequireAuth>
        <ProductFormPage mode="edit" />
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

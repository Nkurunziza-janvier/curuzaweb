import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { LanguageProvider } from "../i18n";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return <LanguageProvider><QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider></LanguageProvider>;
}

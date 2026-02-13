// js/1-config.js
(() => {
  "use strict";

  // Preenche com os dados do teu projeto Supabase
  const SUPABASE_URL = "https://SEU-PROJECT.supabase.co";
  const SUPABASE_ANON_KEY = "SUA_ANON_KEY_AQUI";

  // Estratégia de login: email “virtual” derivado de company_code + username
  // Ex.: admin + DC-000123 => admin@dc-000123.dc
  const AUTH_EMAIL_DOMAIN = "dc"; // apenas para formar email virtual

  // Planos permitidos
  const PLANS = ["basic", "pro", "inteligente"];

  // Branches (templates)
  const BRANCHES = [
    "Mercearia",
    "Bottle Store",
    "Farmácia",
    "Restaurante",
    "Pastelaria / Café",
    "Hotel",
    "Guest House",
    "Armazém e Distribuição",
    "Oficina",
    "Salão",
    "Clínica",
    "Avicultura",
    "Agricultura",
    "Incubadora (salas/estúdios/co-work)"
  ];

  // Mapa de módulos por template (podes expandir)
  const TEMPLATE_MODULES = {
    default: ["dashboard", "sales", "stock", "cash", "clients", "suppliers", "reports", "settings"],
    "Incubadora (salas/estúdios/co-work)": ["dashboard", "bookings", "clients", "cash", "reports", "settings"],
    "Hotel": ["dashboard", "bookings", "clients", "cash", "stock", "reports", "settings"],
    "Clínica": ["dashboard", "patients", "appointments", "cash", "reports", "settings"],
    "Avicultura": ["dashboard", "production", "stock", "sales", "cash", "reports", "settings"],
    "Agricultura": ["dashboard", "production", "stock", "sales", "cash", "reports", "settings"]
  };

  window.DC_CONFIG = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    AUTH_EMAIL_DOMAIN,
    PLANS,
    BRANCHES,
    TEMPLATE_MODULES,
    APP_NAME: "DC ONE",
    VERSION: "0.1.0"
  };
})();











if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");
      console.log("SW registado:", reg.scope);
    } catch (e) {
      console.warn("SW falhou:", e);
    }
  });
}

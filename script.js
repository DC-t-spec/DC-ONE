/* =========================================================
   DC ONE - script.js (8 partes num ficheiro)
   Ordem interna:
   1) CONFIG
   2) STATE/DB (state)
   3) HELPERS
   4) DB (load/save) + Supabase
   5) LOGIC
   6) UI
   7) EVENTS
   8) START/INIT
========================================================= */

(() => {
  "use strict";

  /* =======================
     1) CONFIGURAÇÃO
  ======================= */
  const DC_CONFIG = {
    SUPABASE_URL: "https://jnovwijxuplrcjbtnerc.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impub3Z3aWp4dXBscmNqYnRuZXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MTI0MjcsImV4cCI6MjA4NjQ4ODQyN30.99oSvJ94iq4IfukLQTCFi5DvdAPbooDV4Ll9KgAuGD0",

    // login por user+empresa: cria um email virtual
    AUTH_EMAIL_DOMAIN: "dc",

    PLANS: ["basic", "pro", "inteligente"],

    BRANCHES: [
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
    ],

    TEMPLATE_MODULES: {
      default: ["dashboard", "sales", "stock", "cash", "clients", "suppliers", "reports", "settings"],
      "Incubadora (salas/estúdios/co-work)": ["dashboard", "bookings", "clients", "cash", "reports", "settings"],
      "Hotel": ["dashboard", "bookings", "clients", "cash", "stock", "reports", "settings"],
      "Clínica": ["dashboard", "patients", "appointments", "cash", "reports", "settings"],
      "Avicultura": ["dashboard", "production", "stock", "sales", "cash", "reports", "settings"],
      "Agricultura": ["dashboard", "production", "stock", "sales", "cash", "reports", "settings"]
    }
  };

  /* =======================
     2) STATE / DB (STATE)
  ======================= */
  const DC_STATE = {
    state: {
      session: {
        isAuthed: false,
        userId: null,          // auth.users.id
        companyId: null,       // companies.id
        companyCode: null,     // companies.company_code
        username: null,
        role: null,
        plan: null,
        branch: null,
        companyName: null
      },
      ui: {
        currentScreen: "lock",   // lock | onboard | app
        currentRoute: "dashboard",
        modules: []
      }
    },
    setSession(patch) { Object.assign(this.state.session, patch); },
    setUI(patch) { Object.assign(this.state.ui, patch); },
    resetSession() {
      this.state.session = {
        isAuthed: false,
        userId: null,
        companyId: null,
        companyCode: null,
        username: null,
        role: null,
        plan: null,
        branch: null,
        companyName: null
      };
    }
  };

/* =======================
   3) HELPERS
======================= */
const DC_HELPERS = (() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const sanitize = (s) => String(s ?? "").trim();
  const slug = (s) => sanitize(s).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");

  const randomDigits = (n = 6) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
  const generateCompanyCode = () => `DC-${randomDigits(6)}`;

  const makeAuthEmail = (companyCode, username) => {
    const code = slug(companyCode);
    const user = slug(username);
    return `${user}@${code}.${DC_CONFIG.AUTH_EMAIL_DOMAIN}`;
  };

  const pickModulesForBranch = (branch) => {
    const map = DC_CONFIG.TEMPLATE_MODULES;
    return map[branch] || map.default;
  };

  const toast = (msg, type = "info") => {
    const wrapId = "toastWrap";
    let wrap = document.getElementById(wrapId);

    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = wrapId;
      wrap.style.cssText =
        "position:fixed;right:18px;bottom:18px;display:flex;flex-direction:column;gap:10px;z-index:99999;";
      document.body.appendChild(wrap);

      const st = document.createElement("style");
      st.textContent = `
        .toast{padding:12px 14px;border-radius:14px;border:1px solid rgba(0,0,0,.08);background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.12);font-weight:800;max-width:360px}
        .toast--info{border-color:rgba(31,111,235,.35)}
        .toast--ok{border-color:rgba(22,163,74,.35)}
        .toast--warn{border-color:rgba(245,158,11,.45)}
        .toast--err{border-color:rgba(239,68,68,.45)}
      `;
      document.head.appendChild(st);
    }

    const el = document.createElement("div");
    el.className = `toast toast--${type}`;
    el.textContent = msg;
    wrap.appendChild(el);

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      el.style.transition = "all .25s ease";
    }, 2200);
    setTimeout(() => el.remove(), 2600);
  };

  // MODAL fixo para mostrar ID da empresa (não some)
  const showCompanyIdModal = (companyId) => {
    const old = document.getElementById("dcCompanyIdModal");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "dcCompanyIdModal";
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.55);
      display:flex;align-items:center;justify-content:center;
      z-index:999999;padding:18px;
    `;

    const box = document.createElement("div");
    box.style.cssText = `
      width:min(520px, 100%); background:#fff; border-radius:18px;
      padding:18px 18px 14px; box-shadow:0 20px 60px rgba(0,0,0,.25);
      border:1px solid rgba(0,0,0,.08);
    `;

    box.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="font-weight:900;font-size:18px">✅ Empresa criada</div>
        <button id="dcCloseCompanyId" style="border:none;background:transparent;font-size:18px;font-weight:900;cursor:pointer">✕</button>
      </div>

      <p style="margin:10px 0 10px;color:#334155;font-weight:700">
        Guarda este <b>ID da Empresa</b> (vais usar sempre para entrar):
      </p>

      <div style="
        font-size:28px;font-weight:950;letter-spacing:1px;
        padding:14px;border-radius:14px;background:#f1f5f9;border:1px solid rgba(0,0,0,.08);
        text-align:center;
      " id="dcCompanyIdText">${companyId}</div>

      <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
        <button id="dcCopyCompanyId" style="
          flex:1;min-width:180px;padding:12px 14px;border-radius:14px;
          border:1px solid rgba(0,0,0,.12); background:#0ea5e9;color:#fff;font-weight:900;cursor:pointer
        ">Copiar ID</button>

        <button id="dcGoLogin" style="
          flex:1;min-width:180px;padding:12px 14px;border-radius:14px;
          border:1px solid rgba(0,0,0,.12); background:#16a34a;color:#fff;font-weight:900;cursor:pointer
        ">Ir para Login</button>
      </div>

      <p style="margin:10px 0 0;color:#64748b;font-weight:700;font-size:12px">
        Último ID guardado neste dispositivo:
        <span style="font-weight:900">${localStorage.getItem("DC_ONE_LAST_COMPANY_ID") || companyId}</span>
      </p>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    document.getElementById("dcCloseCompanyId")?.addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

    document.getElementById("dcCopyCompanyId")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(companyId);
        const btn = document.getElementById("dcCopyCompanyId");
        if (btn) {
          const oldText = btn.textContent;
          btn.textContent = "✅ Copiado";
          setTimeout(() => (btn.textContent = oldText), 1200);
        }
      } catch {
        alert("Não foi possível copiar automaticamente. Copie manualmente: " + companyId);
      }
    });

    document.getElementById("dcGoLogin")?.addEventListener("click", () => {
      document.getElementById("screen-onboard")?.classList.remove("screen--active");
      document.getElementById("screen-app")?.classList.remove("screen--active");
      document.getElementById("screen-lock")?.classList.add("screen--active");
      close();
    });
  };

  // preenche o ID salvo no login (usado no INIT)
  const applyLastCompanyIdToLogin = () => {
    const last = localStorage.getItem("DC_ONE_LAST_COMPANY_ID");
    const loginCompanyInput = document.getElementById("loginCompanyId");
    if (last && loginCompanyInput && !loginCompanyInput.value) {
      loginCompanyInput.value = last;
    }
  };

  return {
    $,
    $$,
    sanitize,
    slug,
    generateCompanyCode,
    makeAuthEmail,
    pickModulesForBranch,
    toast,
    showCompanyIdModal,
    applyLastCompanyIdToLogin
  };
})();

  /* =======================
     4) DB (load/save) + SUPABASE
  ======================= */
  const DC_DB = (() => {
    const { toast, makeAuthEmail } = DC_HELPERS;

    if (!window.supabase?.createClient) {
      throw new Error("Supabase não carregou. Confirma o <script src='...supabase-js@2'> antes do script.js");
    }

    const supabase = window.supabase.createClient(DC_CONFIG.SUPABASE_URL, DC_CONFIG.SUPABASE_ANON_KEY);

    const db = {
      async createCompany(company) {
        const { data, error } = await supabase.from("companies").insert(company).select("*").single();
        if (error) throw error;
        return data;
      },

      async createProfile(profile) {
        const { data, error } = await supabase.from("profiles").insert(profile).select("*").single();
        if (error) throw error;
        return data;
      },

      async getProfile(userId) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*, companies(*)")
          .eq("id", userId)
          .maybeSingle();
        if (error) throw error;
        return data;
      }
    };

    const auth = {
      async signIn(companyCode, username, password) {
        const email = makeAuthEmail(companyCode, username);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
      },

      async signUp(companyCode, username, password) {
        const email = makeAuthEmail(companyCode, username);
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        return data;
      },

      async getSession() {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data.session;
      },

      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
    };

    const api = {
      supabase,

      async createCompanyWithAdmin({ company, admin }) {
        // 1) criar empresa
        const createdCompany = await db.createCompany(company);

        // 2) criar auth user
        const signUpRes = await auth.signUp(createdCompany.company_code, admin.username, admin.pass);

        // NOTA: se Email Confirmation estiver ON, user pode vir null
        const user = signUpRes?.user;
        if (!user) {
          throw new Error("Auth não devolveu user. Desliga Email Confirmation no Supabase Auth (para este modelo).");
        }

        // 3) criar profile
        await db.createProfile({
          id: user.id,
          company_id: createdCompany.id,
          full_name: admin.fullName || null,
          username: admin.username,
          role: "Admin"
        });

        return createdCompany;
      },

      async login(companyCode, username, password) {
        const authRes = await auth.signIn(companyCode, username, password);
        const userId = authRes?.user?.id;
        if (!userId) throw new Error("Login falhou: utilizador inválido.");

        const profile = await db.getProfile(userId);
        if (!profile?.companies) throw new Error("Perfil/Empresa não encontrados.");

        return { authRes, profile };
      },

      async restore() {
        const session = await auth.getSession();
        if (!session?.user?.id) return null;
        const profile = await db.getProfile(session.user.id);
        if (!profile?.companies) return null;
        return { session, profile };
      },

      async logout() {
        await auth.signOut();
      }
    };

    window.addEventListener("unhandledrejection", (e) => {
      const msg = e?.reason?.message || "Erro inesperado.";
      console.error(e.reason);
      toast(msg, "err");
    });

    return api;
  })();


/* =======================
   5) LÓGICA
======================= */
const DC_LOGIC = (() => {
  const { sanitize, generateCompanyCode, pickModulesForBranch, showCompanyIdModal } = DC_HELPERS;

  return {
    async createCompanyFlow(formData) {
      const companyCode = generateCompanyCode();

      // validações
      if (!formData.branch) throw new Error("Selecione o ramo/template.");
      if (!DC_CONFIG.PLANS.includes(formData.plan)) throw new Error("Plano inválido.");

      if (!formData.adminUser) formData.adminUser = "admin";

      if (!formData.adminPass || formData.adminPass.length < 6) {
        throw new Error("A palavra-passe do admin deve ter pelo menos 6 caracteres.");
      }
      if (formData.adminPass !== formData.adminPass2) {
        throw new Error("As palavras-passe não coincidem.");
      }

      const company = {
        company_code: companyCode,
        name: sanitize(formData.name),
        branch: formData.branch,
        plan: formData.plan,
        nuit: sanitize(formData.nuit) || null,
        email: sanitize(formData.email) || null,
        phone: sanitize(formData.phone) || null,
        address: sanitize(formData.address) || null,
        city: sanitize(formData.city) || null,
        country: sanitize(formData.country) || null
      };

      const admin = {
        fullName: sanitize(formData.adminFullName) || null,
        username: sanitize(formData.adminUser),
        pass: formData.adminPass
      };

      // criar empresa + admin
      const createdCompany = await DC_DB.createCompanyWithAdmin({ company, admin });

      // --- ID da empresa: mostrar grande + copiar + guardar
      const companyId = createdCompany.company_code;

      // 1) guardar no localStorage
      localStorage.setItem("DC_ONE_LAST_COMPANY_ID", companyId);

      // 2) preencher o campo de login automaticamente (para já ficar)
      const loginCompanyInput = document.getElementById("loginCompanyId");
      if (loginCompanyInput) loginCompanyInput.value = companyId;

      // 3) mostrar modal fixo (não desaparece)
      showCompanyIdModal(companyId);

      // login imediato
      const res = await DC_DB.login(createdCompany.company_code, admin.username, admin.pass);

      const comp = res.profile.companies;
      const modules = pickModulesForBranch(comp.branch);

      DC_STATE.setSession({
        isAuthed: true,
        userId: res.authRes.user.id,
        companyId: comp.id,
        companyCode: comp.company_code,
        username: res.profile.username,
        role: res.profile.role,
        plan: comp.plan,
        branch: comp.branch,
        companyName: comp.name
      });

      DC_STATE.setUI({
        currentScreen: "app",
        currentRoute: "dashboard",
        modules
      });

      return true;
    },

    async loginFlow(companyCode, username, password) {
      companyCode = sanitize(companyCode);
      username = sanitize(username);
      if (!companyCode || !username || !password) throw new Error("Preencha todos os campos do login.");

      const res = await DC_DB.login(companyCode, username, password);
      const comp = res.profile.companies;
      const modules = pickModulesForBranch(comp.branch);

      DC_STATE.setSession({
        isAuthed: true,
        userId: res.authRes.user.id,
        companyId: comp.id,
        companyCode: comp.company_code,
        username: res.profile.username,
        role: res.profile.role,
        plan: comp.plan,
        branch: comp.branch,
        companyName: comp.name
      });

      DC_STATE.setUI({
        currentScreen: "app",
        currentRoute: "dashboard",
        modules
      });

      DC_HELPERS.toast("Login com sucesso.", "ok");
      return true;
    },

    async restoreSessionFlow() {
      const restored = await DC_DB.restore();
      if (!restored) return false;

      const comp = restored.profile.companies;
      const modules = pickModulesForBranch(comp.branch);

      DC_STATE.setSession({
        isAuthed: true,
        userId: restored.profile.id,
        companyId: comp.id,
        companyCode: comp.company_code,
        username: restored.profile.username,
        role: restored.profile.role,
        plan: comp.plan,
        branch: comp.branch,
        companyName: comp.name
      });

      DC_STATE.setUI({
        currentScreen: "app",
        currentRoute: "dashboard",
        modules
      });

      return true;
    },

    async logoutFlow() {
      await DC_DB.logout();
      DC_STATE.resetSession();
      DC_STATE.setUI({ currentScreen: "lock", currentRoute: "dashboard", modules: [] });
      DC_HELPERS.toast("Sessão terminada.", "info");
    }
  };
})();

/* =========================
   STOCK - LÓGICA
========================= */
const STOCK_LOGIC = (() => {

  const sb = () => DC_DB.supabase; // ✅ supabase client certo

  async function createStockOut({
    company_id,
    branch_id,
    warehouse_id,
    product_id,
    qty,
    note
  }) {
    // 1) Buscar produto
    const { data: product, error } = await sb()
      .from("products")
      .select("id, product_type")
      .eq("id", product_id)
      .single();
    if (error) throw error;

    const created_by = DC_STATE.state.session.userId || null;

    // 2) Produto simples
    if (product.product_type === "SIMPLE") {
      const { error: e2 } = await sb().from("stock_moves").insert({
        company_id,
        branch_id,
        warehouse_id,
        product_id,
        move_type: "OUT",
        qty,
        ref_type: "manual",
        ref_note: note || null,
        created_by
      });
      if (e2) throw e2;
      return true;
    }

    // 3) Produto BUNDLE (KIT)
    const { data: components, error: e3 } = await sb()
      .from("product_components")
      .select("component_product_id, qty")
      .eq("parent_product_id", product_id);
    if (e3) throw e3;

    if (!components || components.length === 0) {
      throw new Error("Este kit não possui componentes definidos.");
    }

    const moves = components.map(c => ({
      company_id,
      branch_id,
      warehouse_id,
      product_id: c.component_product_id,
      move_type: "OUT",
      qty: Number(qty) * Number(c.qty),
      ref_type: "bundle_expand",
      ref_note: note || "Saída via kit",
      created_by
    }));

    const { error: e4 } = await sb().from("stock_moves").insert(moves);
    if (e4) throw e4;

    return true;
  }
   async function createStockIn({
  company_id,
  branch_id,
  warehouse_id,
  product_id,
  qty,
  note
}) {
  const created_by = DC_STATE.state.session.userId || null;

  const { error } = await sb().from("stock_moves").insert({
    company_id,
    branch_id,
    warehouse_id,
    product_id,
    move_type: "IN",
    qty,
    ref_type: "manual",
    ref_note: note || null,
    created_by
  });
  if (error) throw error;

  return true;
}


  return { createStockOut };
         return { createStockOut, createStockIn };

})();



  /* =======================
     6) UI
  ======================= */
  const DC_UI = (() => {
    const { $, $$ } = DC_HELPERS;
    const screens = { lock: "#screen-lock", onboard: "#screen-onboard", app: "#screen-app" };

    const titleMap = {
      dashboard: "Dashboard",
      sales: "Vendas",
      stock: "Stock",
      cash: "Caixa",
      clients: "Clientes",
      suppliers: "Fornecedores",
      reports: "Relatórios",
      settings: "Configurações",
      bookings: "Reservas",
      patients: "Pacientes",
      appointments: "Agendamentos",
      production: "Produção"
    };

    const subtitleMap = {
      dashboard: "Visão geral do negócio",
      sales: "Registo de vendas e pagamentos",
      stock: "Gestão de produtos e inventário",
      cash: "Entradas, saídas e saldo",
      clients: "Gestão de clientes",
      suppliers: "Gestão de fornecedores",
      reports: "Relatórios e indicadores",
      settings: "Empresa e utilizadores",
      bookings: "Salas, estúdios e co-work",
      patients: "Cadastro e histórico",
      appointments: "Consultas e agenda",
      production: "Produção e custos"
    };

    const cards = (route) => {
      const plan = DC_STATE.state.session.plan;

      const map = {
        dashboard: `
          <div class="card">
            <h2 class="subtitle">Dashboard</h2>
            <p class="muted">Visão geral: vendas, caixa, stock, alertas e KPIs.</p>
            <div class="divider"></div>
            <div class="grid grid--2">
              <div class="card" style="padding:16px">
                <div class="subtitle subtitle--sm">Vendas Hoje</div>
                <div style="font-size:28px;font-weight:900;margin-top:6px">—</div>
                <div class="muted small">Ligaremos aos dados reais a seguir.</div>
              </div>
              <div class="card" style="padding:16px">
                <div class="subtitle subtitle--sm">Caixa</div>
                <div style="font-size:28px;font-weight:900;margin-top:6px">—</div>
                <div class="muted small">Entradas / Saídas / Saldo.</div>
              </div>
            </div>
          </div>
        `,
        sales: `
          <div class="card">
            <h2 class="subtitle">Vendas</h2>
            <p class="muted">POS + histórico + cliente + pagamento.</p>
            <div class="divider"></div>
            <p class="muted small">Próximo passo: tabelas sales, sale_items, payments.</p>
          </div>
        `,
     stock: `
  <div class="card">
    <h2 class="subtitle">Stock</h2>
    <p class="muted">Entradas e Saídas rápidas (teste).</p>
    <div class="divider"></div>

    <div class="grid grid--2" style="gap:14px">
      <!-- ENTRADA -->
      <div class="card" style="padding:14px">
        <div class="subtitle subtitle--sm">Entrada (IN)</div>
        <form id="stockInForm" style="display:grid;gap:10px;margin-top:10px">
          <select id="inProduct" style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.12)"></select>
          <input id="inQty" type="number" step="0.001" value="1"
            style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.12)"/>
          <select id="inWarehouse" style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.12)"></select>
          <input id="inNote" placeholder="Nota (opcional)" 
            style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.12)"/>
          <button type="submit" style="padding:12px 14px;border-radius:14px;border:1px solid rgba(0,0,0,.12);font-weight:900;cursor:pointer">
            Confirmar Entrada
          </button>
        </form>
        <p id="inMsg" class="muted small" style="margin-top:10px"></p>
      </div>

      <!-- SAÍDA -->
      <div class="card" style="padding:14px">
        <div class="subtitle subtitle--sm">Saída (OUT)</div>
        <form id="stockOutForm" style="display:grid;gap:10px;margin-top:10px">
          <select id="outProduct" style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.12)"></select>
          <input id="outQty" type="number" step="0.001" value="1"
            style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.12)"/>
          <select id="outWarehouse" style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.12)"></select>
          <input id="outNote" placeholder="Nota (opcional)" 
            style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.12)"/>
          <button type="submit" style="padding:12px 14px;border-radius:14px;border:1px solid rgba(0,0,0,.12);font-weight:900;cursor:pointer">
            Confirmar Saída
          </button>
        </form>
        <p id="outMsg" class="muted small" style="margin-top:10px"></p>
      </div>
    </div>
  </div>
`,

        cash: `
          <div class="card">
            <h2 class="subtitle">Caixa</h2>
            <p class="muted">Movimentos, reconciliação e relatórios.</p>
          </div>
        `,
        clients: `
          <div class="card">
            <h2 class="subtitle">Clientes</h2>
            <p class="muted">Cadastro, histórico, dívida/crédito.</p>
          </div>
        `,
        suppliers: `
          <div class="card">
            <h2 class="subtitle">Fornecedores</h2>
            <p class="muted">Compras, prazos, pagamentos.</p>
          </div>
        `,
        reports: `
          <div class="card">
            <h2 class="subtitle">Relatórios</h2>
            <p class="muted">Relatórios operacionais e fiscais.</p>
            <div class="divider"></div>
            <p class="muted small">Plano atual: <b>${plan || "—"}</b></p>
          </div>
        `,
        settings: `
          <div class="card">
            <h2 class="subtitle">Configurações</h2>
            <p class="muted">Empresa, utilizadores, permissões, integrações.</p>
          </div>
        `,
        bookings: `
          <div class="card">
            <h2 class="subtitle">Reservas</h2>
            <p class="muted">Salas/estúdios/co-work: slots e faturação.</p>
          </div>
        `,
        patients: `
          <div class="card">
            <h2 class="subtitle">Pacientes</h2>
            <p class="muted">Cadastro e histórico clínico.</p>
          </div>
        `,
        appointments: `
          <div class="card">
            <h2 class="subtitle">Agendamentos</h2>
            <p class="muted">Consultas e agenda.</p>
          </div>
        `,
        production: `
          <div class="card">
            <h2 class="subtitle">Produção</h2>
            <p class="muted">Registos de produção e custos.</p>
          </div>
        `
      };

      return map[route] || map.dashboard;
    };

    const showScreen = (name) => {
      Object.values(screens).forEach((sel) => $(sel)?.classList.remove("screen--active"));
      $(screens[name])?.classList.add("screen--active");
    };

    const setPreviewBranch = (branch) => {
      const el = $("#previewBranch");
      if (el) el.textContent = branch || "—";
    };

    const applyModules = () => {
      const modules = DC_STATE.state.ui.modules || [];
      $$(".nav__item").forEach((b) => {
        const route = b.getAttribute("data-route");
        b.style.display = (modules.length && !modules.includes(route)) ? "none" : "";
      });
    };

    const highlightRoute = (route) => {
      $$(".nav__item").forEach((b) => b.classList.remove("nav__item--active"));
      $(`.nav__item[data-route="${route}"]`)?.classList.add("nav__item--active");
    };

    const setHeader = (route) => {
      $("#pageTitle").textContent = titleMap[route] || "Dashboard";
      $("#pageSubtitle").textContent = subtitleMap[route] || "Visão geral";
    };

    const setUserBadge = () => {
      const s = DC_STATE.state.session;

      $("#companyLabel").textContent = s.companyName || "Empresa";

      const planChip = $("#planChip");
      const p = s.plan || "basic";
      planChip.textContent = p === "inteligente" ? "Inteligente" : (p === "pro" ? "Pro" : "Basic");
      planChip.classList.remove("pill--blue", "pill--green", "pill--orange");
      planChip.classList.add(p === "basic" ? "pill--blue" : (p === "pro" ? "pill--green" : "pill--orange"));

      $("#userName").textContent = s.username || "Utilizador";
      $("#userRole").textContent = s.role || "Perfil";
    };

    const renderRoute = (route) => {
      const content = $("#content");
      if (!content) return;
      content.innerHTML = cards(route);
    };

    const syncAll = () => {
      const u = DC_STATE.state.ui;

      showScreen(u.currentScreen);

      if (u.currentScreen === "app") {
        applyModules();
        setUserBadge();
        highlightRoute(u.currentRoute);
        setHeader(u.currentRoute);
        renderRoute(u.currentRoute);
         if (u.currentRoute === "stock") {
  setTimeout(() => DC_UI.initStockScreen(), 0);
}

      }
    };
const initStockScreen = async () => {
  const route = DC_STATE.state.ui.currentRoute;
  if (route !== "stock") return;

  const sb = DC_DB.supabase;
  const company_id = DC_STATE.state.session.companyId;

  // pegar 1 branch (MVP)
  const { data: branches, error: be } = await sb
    .from("branches")
    .select("id")
    .eq("company_id", company_id)
    .order("created_at", { ascending: true })
    .limit(1);
  if (be) throw be;

  const branch_id = branches?.[0]?.id;
  if (!branch_id) throw new Error("Crie uma filial (branches) para continuar.");

  // carregar dados
  const { data: products, error: pe } = await sb
    .from("products")
    .select("id,name,product_type")
    .eq("company_id", company_id)
    .order("name");
  if (pe) throw pe;

  const { data: whs, error: we } = await sb
    .from("warehouses")
    .select("id,name")
    .eq("company_id", company_id)
    .eq("branch_id", branch_id)
    .order("name");
  if (we) throw we;

  // selects
  const fill = (el, html) => { if (el) el.innerHTML = html; };
  const prodHtml = (products || []).map(p => `<option value="${p.id}">${p.name} (${p.product_type})</option>`).join("");
  const whHtml = (whs || []).map(w => `<option value="${w.id}">${w.name}</option>`).join("");

  fill(document.getElementById("inProduct"), prodHtml);
  fill(document.getElementById("outProduct"), prodHtml);
  fill(document.getElementById("inWarehouse"), whHtml);
  fill(document.getElementById("outWarehouse"), whHtml);

  // ENTRADA
  document.getElementById("stockInForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await STOCK_LOGIC.createStockIn({
        company_id,
        branch_id,
        warehouse_id: document.getElementById("inWarehouse").value,
        product_id: document.getElementById("inProduct").value,
        qty: Number(document.getElementById("inQty").value),
        note: document.getElementById("inNote").value
      });
      document.getElementById("inMsg").textContent = "✅ Entrada registada.";
      DC_HELPERS.toast("Entrada registada!", "ok");
    } catch (err) {
      document.getElementById("inMsg").textContent = "❌ " + (err?.message || err);
      DC_HELPERS.toast(err?.message || "Erro", "err");
    }
  });

  // SAÍDA
  document.getElementById("stockOutForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await STOCK_LOGIC.createStockOut({
        company_id,
        branch_id,
        warehouse_id: document.getElementById("outWarehouse").value,
        product_id: document.getElementById("outProduct").value,
        qty: Number(document.getElementById("outQty").value),
        note: document.getElementById("outNote").value
      });
      document.getElementById("outMsg").textContent = "✅ Saída registada.";
      DC_HELPERS.toast("Saída registada!", "ok");
    } catch (err) {
      document.getElementById("outMsg").textContent = "❌ " + (err?.message || err);
      DC_HELPERS.toast(err?.message || "Erro", "err");
    }
  });
};



    return {
      showScreen,
      setPreviewBranch,
      applyModules,
      highlightRoute,
      setHeader,
      renderRoute,
      syncAll,
      initStockScreen
    };
  })();
  function renderStockOutScreen() {
  DC_UI.setContent(`
    <h2>Saída de Stock</h2>

    <form id="stockOutForm">
      <label>Produto</label>
      <select id="product"></select>

      <label>Quantidade</label>
      <input id="qty" type="number" step="0.001" value="1"/>

      <label>Armazém</label>
      <select id="warehouse"></select>

      <button type="submit">Confirmar Saída</button>
    </form>
  `);

  initStockOutForm();
  loadProductsAndWarehouses();
}
   
async function loadProductsAndWarehouses() {
  const sb = DC_STATE.session.supabase;

  const company_id = DC_STATE.company.id;
  const branch_id = DC_STATE.branch.id;

  const { data: products } = await sb.from("products").select("id,name").eq("company_id", company_id).order("name");
  const { data: whs } = await sb.from("warehouses").select("id,name").eq("company_id", company_id).eq("branch_id", branch_id).order("name");

  document.getElementById("product").innerHTML =
    (products || []).map(p => `<option value="${p.id}">${p.name}</option>`).join("");

  document.getElementById("warehouse").innerHTML =
    (whs || []).map(w => `<option value="${w.id}">${w.name}</option>`).join("");
}

function initStockOutForm() {
  const form = document.getElementById("stockOutForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      await STOCK_LOGIC.createStockOut({
        company_id: DC_STATE.company.id,
        branch_id: DC_STATE.branch.id,
        warehouse_id: document.getElementById("warehouse").value,
        product_id: document.getElementById("product").value,
        qty: Number(document.getElementById("qty").value),
        note: "Saída manual"
      });

      DC_HELPERS.toast("Saída registada!");
    } catch (err) {
      DC_HELPERS.toast(err.message, "error");
    }
  });
}



  /* =======================
     7) EVENTOS
  ======================= */
  const DC_EVENTS = (() => {
    const { $, $$, toast } = DC_HELPERS;

    const bind = () => {
      // LOGIN
      $("#formLogin")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await DC_LOGIC.loginFlow(
            $("#loginCompanyId")?.value,
            $("#loginUser")?.value,
            $("#loginPass")?.value
          );
          DC_UI.syncAll();
        } catch (err) {
          toast(err.message || "Falha no login.", "err");
        }
      });

      // IR PARA CRIAR EMPRESA
      $("#btnGoCreateCompany")?.addEventListener("click", () => {
        DC_STATE.setUI({ currentScreen: "onboard" });
        DC_UI.showScreen("onboard");
      });

      // VOLTAR PARA LOGIN
      $("#btnBackToLogin")?.addEventListener("click", () => {
        DC_STATE.setUI({ currentScreen: "lock" });
        DC_UI.showScreen("lock");
      });

      // PREVIEW TEMPLATE
      $("#cBranch")?.addEventListener("change", (e) => {
        DC_UI.setPreviewBranch(e.target.value);
      });

      // CRIAR EMPRESA
      $("#formCreateCompany")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.currentTarget;

        const payload = {
          name: $("#cName")?.value,
          branch: $("#cBranch")?.value,
          nuit: $("#cNuit")?.value,
          email: $("#cEmail")?.value,
          phone: $("#cPhone")?.value,
          address: $("#cAddress")?.value,
          city: $("#cCity")?.value,
          country: $("#cCountry")?.value,
          plan: form.querySelector('input[name="plan"]:checked')?.value || "basic",

          adminFullName: $("#aFullName")?.value,
          adminUser: $("#aUser")?.value,
          adminPass: $("#aPass")?.value,
          adminPass2: $("#aPass2")?.value
        };

        try {
          await DC_LOGIC.createCompanyFlow(payload);
          DC_UI.syncAll();
        } catch (err) {
          toast(err.message || "Falha ao criar empresa.", "err");
        }
      });

      // MENU
      $$(".nav__item").forEach((btn) => {
        btn.addEventListener("click", () => {
          const route = btn.getAttribute("data-route");
          if (!route) return;

          DC_STATE.setUI({ currentRoute: route });
          DC_UI.highlightRoute(route);
          DC_UI.setHeader(route);
          DC_UI.renderRoute(route);
           if (route === "stock") {
  DC_UI.initStockScreen();
}

        });
      });

      // LOGOUT
      $("#btnLogout")?.addEventListener("click", async () => {
        try {
          await DC_LOGIC.logoutFlow();
          DC_UI.syncAll();
        } catch (err) {
          toast(err.message || "Falha ao sair.", "err");
        }
      });
    };

    return { bind };
  })();

 /* =======================
   8) START / INIT
======================= */
const DC_INIT = (() => {
  const start = async () => {
    // segurança mínima
    if (!DC_CONFIG.SUPABASE_URL || !DC_CONFIG.SUPABASE_URL.includes("supabase.co")) {
      DC_HELPERS.toast("Config do Supabase ainda não foi definida no script.js", "warn");
    }

    // liga eventos
    DC_EVENTS.bind();

    // aplica último ID no campo de login (se existir)
    DC_HELPERS.applyLastCompanyIdToLogin();

    // tenta restaurar sessão
    try {
      const ok = await DC_LOGIC.restoreSessionFlow();
      if (ok) {
        DC_STATE.setUI({ currentScreen: "app" });
        DC_UI.syncAll();
        return;
      }
    } catch (_) {
      // ignora
    }

    // fallback para login
    DC_STATE.setUI({ currentScreen: "lock" });
    DC_UI.syncAll();
  };

  return { start };
})();

// START
window.addEventListener("DOMContentLoaded", () => {
  DC_INIT.start();
});

// expõe (opcional) para debug
window.DC_ONE = { DC_CONFIG, DC_STATE, DC_HELPERS, DC_DB, DC_LOGIC, DC_UI };
   
   })(); // <-- FECHA a IIFE iniciada lá em cima


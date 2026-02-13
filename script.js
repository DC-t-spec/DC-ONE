const app = document.querySelector("#app");
app.innerHTML = `
  <main style="font-family:system-ui;padding:16px">
    <h1>DC ONE</h1>
    <p>Rodando via GitHub Pages ✅</p>
  </main>
`;
console.log("DC ONE carregou ✅");

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

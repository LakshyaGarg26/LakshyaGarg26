const API = "https://backend.cesto.co";
const fsp = process.getBuiltinModule("node:fs/promises");

const pct = (n) => (typeof n === "number" ? `${n >= 0 ? "+" : ""}${n.toFixed(2)}%` : "—");

async function main() {
  const [products, analytics] = await Promise.all([
    fetch(`${API}/products`).then((r) => r.json()),
    fetch(`${API}/products/analytics`).then((r) => r.json()),
  ]);

  const rows = products
    .filter((p) => p.isActive && p.isPublished)
    .map((p) => {
      const a = analytics[p.id];
      if (!a) return null;
      const r30 = a.tokenPerformance30d?.return;
      if (typeof r30 !== "number") return null;
      return { name: p.name, slug: p.slug, r30, r7: a.tokenPerformance7d?.return };
    })
    .filter(Boolean)
    .sort((a, b) => b.r30 - a.r30)
    .slice(0, 5);

  if (!rows.length) throw new Error("no basket data returned");

  const table = [
    "| Basket | 30d | 7d |",
    "| :--- | ---: | ---: |",
    ...rows.map((r) => `| [${r.name}](https://app.cesto.co/product/${r.slug}) | ${pct(r.r30)} | ${pct(r.r7)} |`),
  ].join("\n");

  const stamp = new Date().toISOString().slice(0, 10);
  const block = table + "\n\n<sub>Top baskets by 30-day return, pulled live from the Cesto API. Last updated " + stamp + ".</sub>";

  const file = "ReadMe.md";
  const src = await fsp.readFile(file, "utf8");
  const out = src.replace(
    /<!-- CESTO:START -->[\s\S]*?<!-- CESTO:END -->/,
    "<!-- CESTO:START -->\n" + block + "\n<!-- CESTO:END -->"
  );

  if (out === src) {
    console.log("no change");
    return;
  }
  await fsp.writeFile(file, out);
  console.log("updated with " + rows.length + " baskets");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

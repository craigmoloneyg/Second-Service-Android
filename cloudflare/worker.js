var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/worker.js
var OPENAI_BASE = "https://api.openai.com/v1";
var MAX_BYTES = 20 * 1024 * 1024;
var ALLOWED = /* @__PURE__ */ new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
var invoiceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    document_type: { type: "string" },
    supplier_or_source: { type: ["string", "null"] },
    document_number: { type: ["string", "null"] },
    document_date: { type: ["string", "null"] },
    currency: { type: ["string", "null"] },
    subtotal: { type: ["number", "null"] },
    tax: { type: ["number", "null"] },
    total: { type: ["number", "null"] },
    line_items: { type: "array", items: {
      type: "object",
      additionalProperties: false,
      properties: {
        description: { type: "string" },
        quantity: { type: ["number", "null"] },
        unit: { type: ["string", "null"] },
        unit_price: { type: ["number", "null"] },
        line_total: { type: ["number", "null"] },
        category: { type: ["string", "null"] },
        confidence: { type: ["number", "null"] },
        evidence: { type: ["string", "null"] }
      },
      required: ["description", "quantity", "unit", "unit_price", "line_total", "category", "confidence", "evidence"]
    } },
    missing_or_ambiguous: { type: "array", items: { type: "string" } }
  },
  required: ["document_type", "supplier_or_source", "document_number", "document_date", "currency", "subtotal", "tax", "total", "line_items", "missing_or_ambiguous"]
};
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      return json({ ok: true, ai_configured: Boolean(env.OPENAI_API_KEY), database_configured: Boolean(env.DB) });
    }
    if (url.pathname === "/api/invoice/extract" && request.method === "POST") {
      return extractInvoice(request, env);
    }
    if (url.pathname === "/api/ingredients" && request.method === "GET") {
      if (!env.DB) return json({ error: "Database has not been connected yet." }, 503);
      const { results = [] } = await env.DB.prepare(`
        SELECT i.*,
          (SELECT COUNT(*) FROM price_history ph WHERE ph.ingredient_id=i.id) AS price_points,
          (SELECT MIN(ph.base_unit_cost) FROM price_history ph WHERE ph.ingredient_id=i.id AND ph.base_unit_cost IS NOT NULL) AS low_cost,
          (SELECT MAX(ph.base_unit_cost) FROM price_history ph WHERE ph.ingredient_id=i.id AND ph.base_unit_cost IS NOT NULL) AS high_cost
        FROM ingredients i ORDER BY i.display_name
      `).all();
      return json({ ingredients: results });
    }
    if (url.pathname === "/api/recipes" && request.method === "GET") {
      if (!env.DB) return json({ error: "Database has not been connected yet." }, 503);
      return json({ recipes: await listRecipes(env.DB) });
    }
    if (url.pathname === "/api/recipes" && request.method === "POST") {
      if (!env.DB) return json({ error: "Database has not been connected yet." }, 503);
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid recipe data." }, 400);
      }
      const name = String(body.name || "").trim();
      const sellingPrice = Number(body.selling_price || 0);
      const yieldPortions = Math.max(1, Number(body.yield_portions || 1));
      const items = Array.isArray(body.items) ? body.items : [];
      if (!name || !items.length) return json({ error: "Recipe name and at least one ingredient are required." }, 400);
      const insert = await env.DB.prepare(
        `INSERT INTO recipes(name,selling_price,yield_portions) VALUES(?,?,?) RETURNING id`
      ).bind(name, sellingPrice, yieldPortions).first();
      const recipeId = insert.id;
      for (const item of items) {
        const ingredientId = Number(item.ingredient_id);
        const quantity = Number(item.quantity);
        const unit = String(item.unit || "").toLowerCase();
        if (!ingredientId || !Number.isFinite(quantity) || quantity <= 0 || !unit) continue;
        await env.DB.prepare(
          `INSERT INTO recipe_items(recipe_id,ingredient_id,quantity,unit) VALUES(?,?,?,?)`
        ).bind(recipeId, ingredientId, quantity, unit).run();
      }
      return json({ recipe: await recipeDetail(env.DB, recipeId) }, 201);
    }
    if (url.pathname.startsWith("/api/recipes/") && request.method === "DELETE") {
      if (!env.DB) return json({ error: "Database has not been connected yet." }, 503);
      const id = Number(url.pathname.split("/").pop());
      await env.DB.prepare(`DELETE FROM recipe_items WHERE recipe_id=?`).bind(id).run();
      await env.DB.prepare(`DELETE FROM recipes WHERE id=?`).bind(id).run();
      return json({ ok: true });
    }
    if (url.pathname === "/api/purchasing/alerts" && request.method === "GET") {
      if (!env.DB) return json({ error: "Database has not been connected yet." }, 503);
      const { results = [] } = await env.DB.prepare(`
        SELECT i.id,i.display_name,i.supplier,i.base_unit,
          MIN(ph.base_unit_cost) AS first_cost,
          i.base_unit_cost AS current_cost,
          ROUND((i.base_unit_cost-MIN(ph.base_unit_cost))*100.0/NULLIF(MIN(ph.base_unit_cost),0),1) AS change_pct,
          COUNT(ph.id) AS points
        FROM ingredients i JOIN price_history ph ON ph.ingredient_id=i.id
        WHERE ph.base_unit_cost IS NOT NULL
        GROUP BY i.id HAVING COUNT(ph.id)>=2
        ORDER BY ABS(change_pct) DESC LIMIT 30
      `).all();
      return json({ alerts: results });
    }
    if (url.pathname === "/api/ai/advice" && request.method === "POST") return aiAdvice(request, env);
    if (url.pathname === "/api/action-plans" && request.method === "GET") return listActionPlans(env);
    if (url.pathname === "/api/action-plans" && request.method === "POST") return createActionPlan(request, env);
    if (url.pathname === "/api/stock/events" && request.method === "POST") return recordStockEvent(request, env);
    if (url.pathname === "/api/stock/balance" && request.method === "GET") return stockBalance(url, env);
    return env.ASSETS.fetch(request);
  }
};
async function extractInvoice(request, env) {
  if (!env.OPENAI_API_KEY) return json({ error: "OpenAI API key has not been added to Cloudflare yet." }, 503);
  const contentType = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED.has(contentType)) return json({ error: "Please upload a PDF, PNG, JPG or WEBP invoice." }, 400);
  const body = await request.arrayBuffer();
  if (!body.byteLength || body.byteLength > MAX_BYTES) return json({ error: "Invoice must be between 1 byte and 20 MB." }, 413);
  const encoded = request.headers.get("x-filename") || "invoice";
  let filename = "invoice";
  try {
    filename = decodeURIComponent(encoded);
  } catch {
  }
  filename = filename.replace(/[^\w.\- ()]/g, "_").slice(0, 120) || "invoice";
  let fileId = null;
  try {
    const form = new FormData();
    form.append("purpose", "user_data");
    form.append("file", new Blob([body], { type: contentType }), filename);
    const upload = await fetch(`${OPENAI_BASE}/files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: form
    });
    const uploadJson = await upload.json();
    if (!upload.ok) throw new Error(openAIError(uploadJson, "Could not upload invoice to AI."));
    fileId = uploadJson.id;
    const payload = {
      model: env.OPENAI_MODEL || "gpt-5.6-luna",
      instructions: "You extract commercial data from hospitality supplier invoices. Return only facts supported by the document. Do not recommend staffing, supplier, menu, pricing or operational actions. Preserve product descriptions closely. Capture invoice units exactly as shown. Use null where a value cannot be supported. Flag uncertainty.",
      input: [{ role: "user", content: [
        { type: "input_file", file_id: fileId },
        { type: "input_text", text: "Extract this supplier invoice into the required structured schema." }
      ] }],
      text: { format: { type: "json_schema", name: "hospitality_invoice", strict: true, schema: invoiceSchema } }
    };
    const response = await fetch(`${OPENAI_BASE}/responses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const responseJson = await response.json();
    if (!response.ok) throw new Error(openAIError(responseJson, "AI invoice extraction failed."));
    const text = outputText(responseJson);
    if (!text) throw new Error("AI returned no structured invoice data.");
    const result = JSON.parse(text);
    if (env.DB) {
      const persisted = await persistInvoice(env.DB, result, filename);
      result.saved = true;
      result.invoice_id = persisted.invoiceId;
      result.ingredients_updated = persisted.ingredientsUpdated;
    } else {
      result.saved = false;
      result.storage_warning = "Invoice was read successfully, but the permanent database is not connected yet.";
    }
    return json(result);
  } catch (err) {
    return json({ error: err?.message || "Invoice processing failed." }, 500);
  } finally {
    if (fileId) {
      try {
        await fetch(`${OPENAI_BASE}/files/${encodeURIComponent(fileId)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` }
        });
      } catch {
      }
    }
  }
}
__name(extractInvoice, "extractInvoice");
async function persistInvoice(db, r, filename) {
  const inv = await db.prepare(`
    INSERT INTO invoices(supplier,document_number,document_date,currency,subtotal,tax,total,filename)
    VALUES(?,?,?,?,?,?,?,?) RETURNING id
  `).bind(r.supplier_or_source, r.document_number, r.document_date, r.currency, r.subtotal, r.tax, r.total, filename).first();
  let updated = 0;
  for (const item of r.line_items || []) {
    if (!item.description || item.unit_price == null) continue;
    const key = normaliseName(item.description);
    const calc = deriveBaseCost(item.description, item.unit, item.unit_price);
    const existing = await db.prepare(`SELECT id FROM ingredients WHERE normalized_key=?`).bind(key).first();
    let ingredientId;
    if (existing) {
      ingredientId = existing.id;
      await db.prepare(`
        UPDATE ingredients SET display_name=?,supplier=?,invoice_unit=?,base_unit=?,
        current_unit_price=?,base_unit_cost=?,last_invoice_date=?,updated_at=CURRENT_TIMESTAMP WHERE id=?
      `).bind(item.description, r.supplier_or_source, item.unit, calc.baseUnit, item.unit_price, calc.baseCost, r.document_date, ingredientId).run();
    } else {
      const row = await db.prepare(`
        INSERT INTO ingredients(normalized_key,display_name,supplier,invoice_unit,base_unit,current_unit_price,base_unit_cost,last_invoice_date)
        VALUES(?,?,?,?,?,?,?,?) RETURNING id
      `).bind(key, item.description, r.supplier_or_source, item.unit, calc.baseUnit, item.unit_price, calc.baseCost, r.document_date).first();
      ingredientId = row.id;
    }
    await db.prepare(`
      INSERT INTO price_history(ingredient_id,invoice_id,supplier,invoice_date,invoice_unit,unit_price,base_unit,base_unit_cost)
      VALUES(?,?,?,?,?,?,?,?)
    `).bind(ingredientId, inv.id, r.supplier_or_source, r.document_date, item.unit, item.unit_price, calc.baseUnit, calc.baseCost).run();
    updated++;
  }
  return { invoiceId: inv.id, ingredientsUpdated: updated };
}
__name(persistInvoice, "persistInvoice");
function normaliseName(s) {
  return String(s || "").toLowerCase().replace(/\b\d+\s*x\s*\d+(?:\.\d+)?\s*(kg|g|l|ml)\b/gi, " ").replace(/\b\d+(?:\.\d+)?\s*(kg|g|l|ml)\b/gi, " ").replace(/\b(carton|ctn|box|case|pcs?|each|ea)\b/gi, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
__name(normaliseName, "normaliseName");
function deriveBaseCost(description, unit, unitPrice) {
  const p = Number(unitPrice);
  if (!Number.isFinite(p)) return { baseUnit: null, baseCost: null };
  const u = String(unit || "").toLowerCase().trim();
  const d = String(description || "").toLowerCase();
  let m = d.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(kg|g|l|ml)\b/i);
  if (m && ["box", "carton", "ctn", "case"].includes(u)) {
    const count = Number(m[1]), size = Number(m[2]), pack = m[3].toLowerCase();
    if (pack === "kg") return { baseUnit: "g", baseCost: p / (count * size * 1e3) };
    if (pack === "g") return { baseUnit: "g", baseCost: p / (count * size) };
    if (pack === "l") return { baseUnit: "ml", baseCost: p / (count * size * 1e3) };
    if (pack === "ml") return { baseUnit: "ml", baseCost: p / (count * size) };
  }
  m = d.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml)\b/i);
  if (m && ["box", "carton", "ctn", "case"].includes(u)) {
    const size = Number(m[1]), pack = m[2].toLowerCase();
    if (pack === "kg") return { baseUnit: "g", baseCost: p / (size * 1e3) };
    if (pack === "g") return { baseUnit: "g", baseCost: p / size };
    if (pack === "l") return { baseUnit: "ml", baseCost: p / (size * 1e3) };
    if (pack === "ml") return { baseUnit: "ml", baseCost: p / size };
  }
  if (["kg", "kilogram", "kilograms"].includes(u)) return { baseUnit: "g", baseCost: p / 1e3 };
  if (["g", "gram", "grams"].includes(u)) return { baseUnit: "g", baseCost: p };
  if (["l", "litre", "liter", "litres", "liters"].includes(u)) return { baseUnit: "ml", baseCost: p / 1e3 };
  if (["ml", "millilitre", "milliliter"].includes(u)) return { baseUnit: "ml", baseCost: p };
  if (["pcs", "pc", "piece", "pieces", "ea", "each", "unit"].includes(u)) return { baseUnit: "each", baseCost: p };
  return { baseUnit: u || "unit", baseCost: p };
}
__name(deriveBaseCost, "deriveBaseCost");
async function listRecipes(db) {
  const { results = [] } = await db.prepare(`SELECT id FROM recipes ORDER BY updated_at DESC,id DESC`).all();
  const out = [];
  for (const r of results) out.push(await recipeDetail(db, r.id));
  return out;
}
__name(listRecipes, "listRecipes");
async function recipeDetail(db, id) {
  const recipe = await db.prepare(`SELECT * FROM recipes WHERE id=?`).bind(id).first();
  if (!recipe) return null;
  const { results = [] } = await db.prepare(`
    SELECT ri.quantity,ri.unit,i.id AS ingredient_id,i.display_name,i.base_unit,i.base_unit_cost,i.supplier
    FROM recipe_items ri JOIN ingredients i ON i.id=ri.ingredient_id WHERE ri.recipe_id=?
  `).bind(id).all();
  let batchCost = 0;
  const items = results.map((x) => {
    const converted = convertQuantity(Number(x.quantity), x.unit, x.base_unit);
    const cost = converted == null || x.base_unit_cost == null ? null : converted * Number(x.base_unit_cost);
    if (cost != null) batchCost += cost;
    return { ...x, cost: round(cost), conversion_ok: converted != null };
  });
  const portionCost = batchCost / Math.max(1, Number(recipe.yield_portions || 1));
  const selling = Number(recipe.selling_price || 0);
  return {
    ...recipe,
    items,
    batch_cost: round(batchCost),
    portion_cost: round(portionCost),
    food_cost_pct: selling > 0 ? round(portionCost * 100 / selling) : null,
    gross_profit: selling > 0 ? round(selling - portionCost) : null,
    target_price_28: portionCost > 0 ? round(portionCost / 0.28) : null,
    target_price_30: portionCost > 0 ? round(portionCost / 0.3) : null
  };
}
__name(recipeDetail, "recipeDetail");
function convertQuantity(q, from, to) {
  from = String(from || "").toLowerCase();
  to = String(to || "").toLowerCase();
  if (from === to) return q;
  if (from === "kg" && to === "g") return q * 1e3;
  if (from === "g" && to === "g") return q;
  if (from === "l" && to === "ml") return q * 1e3;
  if (from === "ml" && to === "ml") return q;
  if (["each", "ea", "pc", "pcs"].includes(from) && to === "each") return q;
  return null;
}
__name(convertQuantity, "convertQuantity");
function round(v) {
  return v == null ? null : Math.round(v * 100) / 100;
}
__name(round, "round");

async function createActionPlan(request, env) {
  let body = {};
  try { body = await request.json(); } catch { return json({ error: "Invalid action plan data." }, 400); }
  const title = String(body.title || "Price 2 Plate profit recovery plan").trim().slice(0, 160);
  const focus = String(body.focus || "profit recovery").trim().slice(0, 500);
  const evidence = String(body.evidence || "").trim().slice(0, 9000);
  const steps = [
    { day: "Today · Baseline", title: "Confirm the numbers", detail: "Record food cost, labour percentage, sales, waste and gross profit so every change has a measurable starting point." },
    { day: "Days 1–7 · Purchasing", title: "Close purchasing leaks", detail: "Review supplier price movements, check yields and establish a receiving and invoice review routine." },
    { day: "Days 8–14 · Labour", title: "Align labour to demand", detail: "Match rosters to demand by service, remove avoidable overlap and test one labour-saving change at a time." },
    { day: "Days 15–30 · Menu", title: "Improve menu margin", detail: "Cost the highest-volume dishes, test evidence-backed portion or substitute changes and review pricing." },
    { day: "Days 31–90 · Measure", title: "Keep what works", detail: "Track food cost, labour, waste and gross profit weekly; keep changes that improve margin without harming service." }
  ];
  const plan = { id: crypto.randomUUID(), title, focus, evidence, steps, status: "draft", created_at: new Date().toISOString() };
  if (!env.DB) return json({ plan, saved: false }, 201);
  try {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS action_plans (id TEXT PRIMARY KEY, title TEXT NOT NULL, focus TEXT, evidence TEXT, steps_json TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL)").run();
    await env.DB.prepare("INSERT INTO action_plans (id,title,focus,evidence,steps_json,status,created_at) VALUES (?,?,?,?,?,?,?)").bind(plan.id, plan.title, plan.focus, plan.evidence, JSON.stringify(plan.steps), plan.status, plan.created_at).run();
    return json({ plan, saved: true }, 201);
  } catch (error) {
    return json({ plan, saved: false, warning: "Plan is ready but could not be persisted yet." }, 201);
  }
}
__name(createActionPlan, "createActionPlan");
async function listActionPlans(env) {
  if (!env.DB) return json({ plans: [] });
  try {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS action_plans (id TEXT PRIMARY KEY, title TEXT NOT NULL, focus TEXT, evidence TEXT, steps_json TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL)").run();
    const { results = [] } = await env.DB.prepare("SELECT id,title,focus,evidence,steps_json,status,created_at FROM action_plans ORDER BY created_at DESC LIMIT 25").all();
    return json({ plans: results.map((row) => ({ ...row, steps: JSON.parse(row.steps_json || "[]") })) });
  } catch {
    return json({ plans: [] });
  }
}
__name(listActionPlans, "listActionPlans");

function outputText(r) {
  if (typeof r.output_text === "string" && r.output_text) return r.output_text;
  for (const item of r.output || []) {
    if (item.type !== "message") continue;
    for (const c of item.content || []) if (c.type === "output_text" && typeof c.text === "string") return c.text;
  }
  return "";
}
__name(outputText, "outputText");
function openAIError(body, fallback) {
  return body?.error?.message || body?.message || fallback;
}
__name(openAIError, "openAIError");
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  } });
}
__name(json, "json");
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map



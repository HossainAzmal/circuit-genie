import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  provider: z.string(),
  base: z.string(),
  model: z.string(),
  apiKey: z.string().optional(),
  system: z.string(),
  prompt: z.string(),
});

export const askAI = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    if (data.provider === "lovable") {
      const key = process.env["LOVABLE_API_KEY"];
      if (!key) return { error: "Built-in AI is not configured." };
      const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          instructions: data.system,
          input: data.prompt,
          stream: true,
          store: false,
          reasoning: { effort: "low" },
        }),
      });
      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => "");
        if (res.status === 429) return { error: "Too many requests — please wait a moment." };
        if (res.status === 402) return { error: "AI credits used up. Add credits in workspace settings." };
        return { error: `AI error ${res.status}: ${t.slice(0, 200)}` };
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", out = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.startsWith("data:")) continue;
          const p = l.slice(5).trim();
          if (!p || p === "[DONE]") continue;
          try {
            const j = JSON.parse(p);
            if (j.type === "response.output_text.delta") out += j.delta;
          } catch { /* partial */ }
        }
      }
      return { text: out };
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (data.apiKey) headers["Authorization"] = `Bearer ${data.apiKey}`;
    const res = await fetch(`${data.base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: data.model,
        messages: [
          { role: "system", content: data.system },
          { role: "user", content: data.prompt },
        ],
      }),
    });
    const t = await res.text();
    if (!res.ok) return { error: `Provider error ${res.status}: ${t.slice(0, 300)}` };
    try {
      const j = JSON.parse(t);
      return { text: j.choices?.[0]?.message?.content ?? "" };
    } catch {
      return { error: "Provider returned an unexpected response." };
    }
  });

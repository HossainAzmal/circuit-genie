import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Cpu, Usb, Upload, Sparkles, Download, Plug, Cable, Bug, MessageSquare, Search, KeyRound } from "lucide-react";
import { BOARDS, LIBRARIES, starter, type Board } from "@/lib/boards";
import { PROVIDERS } from "@/lib/providers";
import { askAI } from "@/lib/ai.functions";
import * as serial from "@/lib/serial";
import { ArduinoWizard } from "@/components/ArduinoWizard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CircuitForge — AI Microcontroller IDE" },
      { name: "description", content: "Write, generate and upload code to micro:bit, Arduino Mega and 50+ boards over USB with free AI models." },
      { property: "og:title", content: "CircuitForge — AI Microcontroller IDE" },
      { property: "og:description", content: "Upload code to 50+ boards over USB, with free AI to write code and wiring diagrams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IDE,
});

const ACTIONS = [
  { id: "generate", label: "Generate code", icon: Sparkles },
  { id: "wiring", label: "Wiring diagram", icon: Cable },
  { id: "fix", label: "Fix / debug", icon: Bug },
  { id: "explain", label: "Explain", icon: MessageSquare },
] as const;

function IDE() {
  const [board, setBoard] = useState<Board>(BOARDS[0]!);
  const [code, setCode] = useState(starter(BOARDS[0]!));
  const [q, setQ] = useState("");
  const [providerId, setProviderId] = useState("lovable");
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [models, setModels] = useState<Record<string, string>>({});
  const [prompt, setPrompt] = useState("Blink an LED on pin 13 and read a button on pin 2");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("");
  const [connected, setConnected] = useState(false);
  const [baud, setBaud] = useState(115200);
  const [libs, setLibs] = useState<string[]>([]);
  const [connMsg, setConnMsg] = useState("");
  const [wizard, setWizard] = useState(false);
  useEffect(() => { if (!serial.serialSupported()) setConnMsg("This browser can't connect to USB boards. Use Chrome or Edge on a computer."); }, []);
  const logRef = useRef<HTMLPreElement>(null);
  const ask = useServerFn(askAI);

  useEffect(() => {
    try {
      setKeys(JSON.parse(localStorage.getItem("cf-keys") || "{}"));
      setModels(JSON.parse(localStorage.getItem("cf-models") || "{}"));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { logRef.current?.scrollTo(0, 1e9); }, [log]);

  const provider = PROVIDERS.find((p) => p.id === providerId)!;
  const filtered = useMemo(() => BOARDS.filter((b) => (b.name + b.family + b.mcu).toLowerCase().includes(q.toLowerCase())), [q]);

  const pickBoard = (b: Board) => { setBoard(b); setCode(starter(b)); };
  const saveKey = (v: string) => { const k = { ...keys, [providerId]: v }; setKeys(k); localStorage.setItem("cf-keys", JSON.stringify(k)); };
  const saveModel = (v: string) => { const k = { ...models, [providerId]: v }; setModels(k); localStorage.setItem("cf-models", JSON.stringify(k)); };
  const out = (s: string) => setLog((l) => (l + s).slice(-20000));

  async function runAI(action: string) {
    setBusy(true); setAnswer("");
    const lang = board.lang === "arduino" ? "Arduino C++" : "MicroPython";
    const system = `You are an expert embedded engineer. Target board: ${board.name} (${board.mcu}), language ${lang}. Installed libraries: ${libs.join(", ") || "standard"}.`;
    const tasks: Record<string, string> = {
      generate: `Write complete ${lang} code for: ${prompt}. Reply with ONLY one fenced code block, then a short list of required parts.`,
      wiring: `Give a clear connection/wiring diagram for: ${prompt}. Use an ASCII diagram plus a pin table (Component pin -> Board pin), and mention resistors/voltage levels.`,
      fix: `Find and fix bugs in this code. Reply with the fixed code in one fenced block, then the fixes.\n\n${code}`,
      explain: `Explain this code line by line for a beginner:\n\n${code}`,
    };
    try {
      const r = await ask({ data: { provider: provider.id, base: provider.base, model: models[providerId] || provider.model, apiKey: keys[providerId], system, prompt: tasks[action] } });
      if ("error" in r && r.error) { setAnswer("⚠ " + r.error); return; }
      const text = (r as { text: string }).text;
      setAnswer(text);
      if (action === "generate" || action === "fix") {
        const m = text.match(/```[a-zA-Z+]*\n([\s\S]*?)```/);
        if (m?.[1]) setCode(m[1]);
      }
    } catch (e) { setAnswer("⚠ " + (e as Error).message); } finally { setBusy(false); }
  }

  async function doConnect() {
    if (!serial.serialSupported()) { setConnMsg("Your browser can't talk to USB boards. Open this site in Chrome or Edge on a Windows, Mac, Linux or ChromeOS computer (phones, Safari and Firefox are not supported)."); return; }
    if (!serial.isSecure()) { setConnMsg("USB only works on a secure (https) page. Open the site using its https address."); return; }
    try {
      if (connected) { await serial.disconnect(); setConnected(false); out("\n[disconnected]\n"); return; }
      await serial.connect(baud, out, () => { setConnected(false); setConnMsg("Board disconnected. Check the USB cable, plug it back in and press Connect USB."); out("\n[!] board unplugged\n"); });
      setConnected(true); setConnMsg(""); out(`\n[connected @ ${baud}]\n`);
    } catch (e) { const m = serial.explainSerialError(e); setConnMsg(m); out(`\n[!] ${m}\n`); }
  }

  function download() {
    const name = board.lang === "arduino" ? "sketch.ino" : "main.py";
    const blob = new Blob([code], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  }

  async function upload() {
    if (board.lang === "micropython") {
      if (!connected) { setConnMsg("Connect the board over USB first (press Connect USB)."); return; }
      out("\n[uploading main.py…]\n");
      try { await serial.uploadMicroPython(code); out("\n[✓ uploaded & running]\n"); } catch (e) { const m = serial.explainSerialError(e); setConnMsg(m); out(`\n[!] ${m}\n`); }
    } else setWizard(true);
  }

  async function checkCompat() {
    setBusy(true); setAnswer("");
    try {
      const r = await ask({ data: { provider: "lovable", base: "", model: "", system: "You are an expert embedded engineer who reviews sketches for board and library compatibility.",
        prompt: `Board: ${board.name} (MCU ${board.mcu}, ${board.fqbn ? "FQBN " + board.fqbn : "MicroPython"}). Selected libraries: ${libs.join(", ") || "none"}.\nCheck this code for compatibility problems with this board and these libraries: wrong pin numbers/names, unavailable peripherals (WiFi, BLE, DAC, ADC pins, PWM), voltage levels (3.3V vs 5V), memory/flash limits, AVR-only or ESP-only APIs, wrong language, missing or unsupported #include/imports, library architecture support.\nReply as: "Verdict: Compatible / Issues found", then a numbered list of issues each with the exact line and the specific change, then the corrected full code in one fenced block (only if changes are needed).\n\nCODE:\n${code}` } });
      if ("error" in r && r.error) setAnswer("⚠ " + r.error); else setAnswer((r as { text: string }).text);
    } catch (e) { setAnswer("⚠ " + (e as Error).message); } finally { setBusy(false); }
  }

  async function diagnose() {
    setBusy(true); setAnswer("");
    try {
      const r = await ask({ data: { provider: "lovable", base: "", model: "", system: `You are an expert embedded debugger for ${board.name} (${board.mcu}), ${board.lang === "arduino" ? "Arduino C++" : "MicroPython"}.`,
        prompt: `Diagnose the problem from this serial output and code. Give: 1) likely cause, 2) specific fixes with line references, 3) the corrected code in one fenced block.\n\nSERIAL OUTPUT:\n${log.slice(-6000) || "(empty)"}\n\nCODE:\n${code}` } });
      if ("error" in r && r.error) setAnswer("⚠ " + r.error); else setAnswer((r as { text: string }).text);
    } catch (e) { setAnswer("⚠ " + (e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 bg-card">
        <div className="flex items-center gap-2">
          <Cpu className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold tracking-tight">Circuit<span className="text-primary">Forge</span></h1>
          <span className="hidden sm:inline text-xs text-muted-foreground">AI microcontroller IDE</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <select className="cf-input" value={baud} onChange={(e) => setBaud(+e.target.value)}>
            {[9600, 57600, 115200, 250000].map((b) => <option key={b}>{b}</option>)}
          </select>
          <button className={connected ? "cf-btn-accent" : "cf-btn"} onClick={doConnect}>
            <Usb className="h-4 w-4" />{connected ? "Connected" : "Connect USB"}
          </button>
          <button className="cf-btn-primary" onClick={upload}><Upload className="h-4 w-4" />Upload</button>
          <button className="cf-btn" onClick={download}><Download className="h-4 w-4" /></button>
        </div>
      </header>
      {connMsg && (
        <div role="alert" className="flex items-start justify-between gap-3 border-b border-destructive bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <span>⚠ {connMsg}</span>
          <button onClick={() => setConnMsg("")} aria-label="Dismiss">✕</button>
        </div>
      )}
      {wizard && <ArduinoWizard board={board} libs={libs} connected={connected} log={out} onClose={() => setWizard(false)} />}

      <div className="grid gap-px bg-border lg:grid-cols-[260px_1fr_380px]">
        <aside className="bg-card p-3 space-y-3 lg:h-[calc(100vh-57px)] overflow-auto">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input className="cf-input w-full pl-8" placeholder={`Search ${BOARDS.length} boards`} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <ul className="space-y-1 max-h-72 lg:max-h-[45vh] overflow-auto">
            {filtered.map((b) => (
              <li key={b.id}>
                <button onClick={() => pickBoard(b)} className={`w-full text-left rounded px-2 py-1.5 text-xs transition ${b.id === board.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  <div className="font-semibold">{b.name}</div>
                  <div className="opacity-70">{b.mcu} · {b.lang === "arduino" ? "C++" : "MicroPython"}</div>
                </button>
              </li>
            ))}
          </ul>
          <div>
            <h3 className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Libraries · pre-installed</h3>
            <div className="flex flex-wrap gap-1">
              {LIBRARIES.map((l) => (
                <button key={l} onClick={() => setLibs((s) => s.includes(l) ? s.filter((x) => x !== l) : [...s, l])}
                  className={`rounded border px-1.5 py-0.5 text-[10px] ${libs.includes(l) ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{l}</button>
              ))}
            </div>
          </div>
        </aside>

        <main className="bg-background flex flex-col lg:h-[calc(100vh-57px)]">
          <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
            <span>{board.lang === "arduino" ? "sketch.ino" : "main.py"} — {board.name}</span>
            <span className="text-accent">{board.fqbn ?? "MicroPython · direct USB upload"}</span>
          </div>
          <textarea spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)}
            className="flex-1 min-h-[45vh] resize-none bg-background p-4 text-sm leading-6 outline-none" />
          <div className="border-t border-border">
            <div className="flex items-center justify-between gap-2 px-3 py-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-2"><Plug className="h-3 w-3" />Serial monitor</span>
              <button disabled={busy} className="cf-btn py-0.5" onClick={diagnose}><Bug className="h-3 w-3" />AI diagnose output</button>
            </div>
            <pre ref={logRef} className="h-40 overflow-auto bg-card px-3 py-2 text-xs text-accent whitespace-pre-wrap">{log || "Plug in your board with a USB cable and press Connect USB."}</pre>
            <input className="cf-input w-full rounded-none border-x-0" placeholder="Send to board… (Enter)"
              onKeyDown={async (e) => { if (e.key === "Enter" && connected) { await serial.sendLine(e.currentTarget.value); e.currentTarget.value = ""; } }} />
          </div>
        </main>

        <section className="bg-card p-3 space-y-3 lg:h-[calc(100vh-57px)] overflow-auto">
          <h2 className="flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4 text-primary" />AI Assistant</h2>
          <select className="cf-input w-full" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
            {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {provider.id !== "lovable" && (
            <div className="space-y-2 rounded border border-border p-2 text-xs">
              <a href={provider.url} target="_blank" rel="noreferrer" className="text-primary underline">Get a free key →</a>
              <div className="flex items-center gap-1"><KeyRound className="h-3 w-3" />
                <input type="password" className="cf-input flex-1" placeholder={provider.needsKey ? "API key (saved in this browser)" : "Key optional"} value={keys[providerId] || ""} onChange={(e) => saveKey(e.target.value)} />
              </div>
              <input className="cf-input w-full" placeholder="Model" value={models[providerId] ?? provider.model} onChange={(e) => saveModel(e.target.value)} />
            </div>
          )}
          <textarea className="cf-input w-full h-24 resize-none" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your project…" />
          <div className="grid grid-cols-2 gap-2">
            {ACTIONS.map(({ id, label, icon: I }) => (
              <button key={id} disabled={busy} className="cf-btn justify-center" onClick={() => runAI(id)}><I className="h-4 w-4" />{label}</button>
            ))}
          </div>
          <pre className="min-h-40 whitespace-pre-wrap rounded border border-border bg-background p-3 text-xs leading-5">{busy ? "Thinking…" : answer || "AI answers, code and wiring diagrams appear here. Generated code goes straight into the editor."}</pre>
          <p className="text-center text-xs text-muted-foreground pt-4">Made by <span className="text-primary font-bold">Hossain Azmal</span></p>
        </section>
      </div>
    </div>
  );
}

/* Web Serial (USB) helpers — Chrome/Edge desktop only. */
type Port = any;
let port: Port | null = null;
let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let onText: ((s: string) => void) | null = null;
let onLost: (() => void) | null = null;
let raw: number[] | null = null;
let listening = false;

export const serialSupported = () => typeof navigator !== "undefined" && "serial" in navigator;
export const isSecure = () => typeof window !== "undefined" && window.isSecureContext;

/** Turn browser serial errors into plain, actionable messages. */
export function explainSerialError(e: unknown): string {
  const err = e as { name?: string; message?: string };
  switch (err?.name) {
    case "NotFoundError":
      return "No board was chosen. Press Connect USB again and pick your board in the pop-up. If the list is empty, try another USB cable (some are charge-only) or install the CH340/CP210x driver.";
    case "SecurityError":
      return "USB permission was blocked. Click the lock icon in the address bar → Site settings → allow Serial ports, then reload. Embedded previews/iframes may also block USB — open the site in its own tab.";
    case "InvalidStateError":
      return "The port is already open. Close the Arduino IDE serial monitor or any other app using the board, then try again.";
    case "NetworkError":
      return "The board could not be opened. Unplug it, plug it back in, and make sure no other program is using it.";
    case "BreakError":
    case "FramingError":
    case "ParityError":
      return "Garbled data — check that the baud rate matches Serial.begin() in your code.";
    default:
      return err?.message || String(e);
  }
}

function startLoop() {
  reader = port.readable.getReader();
  const dec = new TextDecoder();
  (async () => {
    try {
      for (;;) {
        const { value, done } = await reader!.read();
        if (done) break;
        if (raw) raw.push(...value);
        else onText?.(dec.decode(value, { stream: true }));
      }
    } catch { /* closed */ } finally { try { reader?.releaseLock(); } catch { /* */ } }
  })();
}

async function open(baud: number) {
  await port.open({ baudRate: baud });
  writer = port.writable.getWriter();
  startLoop();
}
async function closeStreams() {
  try { await reader?.cancel(); } catch { /* */ }
  try { writer?.releaseLock(); } catch { /* */ }
  try { await port?.close(); } catch { /* */ }
  reader = null; writer = null;
}

export async function connect(baud: number, text: (s: string) => void, lost: () => void) {
  if (!serialSupported()) throw Object.assign(new Error("unsupported"), { name: "Unsupported" });
  onText = text; onLost = lost;
  // @ts-expect-error web serial
  port = await navigator.serial.requestPort();
  await open(baud);
  if (!listening) {
    listening = true;
    // @ts-expect-error web serial
    navigator.serial.addEventListener("disconnect", (ev: Event) => {
      if (port && ev.target === port) { reader = null; writer = null; port = null; onLost?.(); }
    });
  }
}

export async function disconnect() { await closeStreams(); port = null; }
export const isConnected = () => !!port;

const enc = new TextEncoder();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function send(s: string | Uint8Array) {
  if (!writer) throw new Error("Board is not connected — press Connect USB.");
  await writer.write(typeof s === "string" ? enc.encode(s) : s);
}
export async function sendLine(s: string) { await send(s + "\r\n"); }

/** Upload MicroPython as main.py via raw REPL, then soft-reset. */
export async function uploadMicroPython(code: string) {
  await send("\r\x03\x03"); await sleep(200);
  await send("\x01"); await sleep(200);
  const b64 = btoa(unescape(encodeURIComponent(code)));
  await send("f=open('main.py','w')\r\x04"); await sleep(150);
  for (let i = 0; i < b64.length; i += 200) {
    await send(`import ubinascii as b;f.write(b.a2b_base64('${b64.slice(i, i + 200)}'))\r\x04`);
    await sleep(120);
  }
  await send("f.close()\r\x04"); await sleep(150);
  await send("\x02"); await sleep(100);
  await send("\x04");
}

/* ---------- Direct .hex flashing for AVR boards (STK500 v1 / v2) ---------- */
export type FlashProfile = { proto: "stk500v1" | "stk500v2"; baud: number; page: number };
export function flashProfile(fqbn?: string): FlashProfile | null {
  if (!fqbn) return null;
  if (fqbn === "arduino:avr:mega") return { proto: "stk500v2", baud: 115200, page: 256 };
  if (fqbn === "arduino:avr:uno" || fqbn === "arduino:avr:nano") return { proto: "stk500v1", baud: 115200, page: 128 };
  if (fqbn === "arduino:avr:pro") return { proto: "stk500v1", baud: 57600, page: 128 };
  return null;
}

export function parseHex(text: string): Uint8Array {
  const mem: number[] = []; let base = 0, max = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith(":")) continue;
    const b = line.slice(1).match(/../g)!.map((h) => parseInt(h, 16));
    const len = b[0]!, addr = (b[1]! << 8) | b[2]!, type = b[3]!;
    if (type === 0) for (let i = 0; i < len; i++) { const a = base + addr + i; mem[a] = b[4 + i]!; if (a + 1 > max) max = a + 1; }
    else if (type === 2) base = ((b[4]! << 8) | b[5]!) << 4;
    else if (type === 4) base = ((b[4]! << 8) | b[5]!) << 16;
  }
  if (!max) throw new Error("This .hex file has no program data.");
  const out = new Uint8Array(max).fill(0xff);
  mem.forEach((v, i) => { if (v !== undefined) out[i] = v; });
  return out;
}

async function take(n: number, ms = 1000): Promise<number[]> {
  const t = Date.now();
  while (raw!.length < n) { if (Date.now() - t > ms) throw new Error("Board did not answer the bootloader."); await sleep(5); }
  return raw!.splice(0, n);
}

async function v1(cmd: number[]) {
  await send(new Uint8Array([...cmd, 0x20]));
  const r = await take(2);
  if (r[0] !== 0x14 || r[1] !== 0x10) throw new Error("Bootloader rejected a command.");
}

let seq = 0;
async function v2(body: number[]) {
  seq = (seq + 1) & 0xff;
  const msg = [0x1b, seq, body.length >> 8, body.length & 0xff, 0x0e, ...body];
  msg.push(msg.reduce((a, b) => a ^ b, 0));
  await send(new Uint8Array(msg));
  const t = Date.now();
  while (true) { const [b] = await take(1, 1500); if (b === 0x1b) break; if (Date.now() - t > 1500) throw new Error("No reply from Mega bootloader."); }
  const h = await take(4);
  const size = (h[1]! << 8) | h[2]!;
  const res = await take(size + 1);
  if (res[1] !== 0x00) throw new Error("Mega bootloader reported an error.");
  return res;
}

export async function flashHex(hex: Uint8Array, p: FlashProfile, progress: (pct: number) => void) {
  if (!port) throw new Error("Board is not connected — press Connect USB.");
  await closeStreams();
  await open(p.baud);
  raw = [];
  try {
    // reset into bootloader
    await port.setSignals({ dataTerminalReady: false, requestToSend: false }); await sleep(250);
    await port.setSignals({ dataTerminalReady: true, requestToSend: true }); await sleep(p.proto === "stk500v2" ? 100 : 50);
    if (p.proto === "stk500v1") {
      let ok = false;
      for (let i = 0; i < 8 && !ok; i++) { raw.length = 0; try { await v1([0x30]); ok = true; } catch { await sleep(50); } }
      if (!ok) throw new Error("Could not reach the bootloader. Pick the right board, or for old Nano clones choose 'Pro Mini' (57600 baud).");
      await v1([0x50]);
      for (let a = 0; a < hex.length; a += p.page) {
        const w = a >> 1, chunk = Array.from(hex.slice(a, a + p.page));
        await v1([0x55, w & 0xff, w >> 8]);
        await v1([0x64, chunk.length >> 8, chunk.length & 0xff, 0x46, ...chunk]);
        progress(Math.round(((a + chunk.length) / hex.length) * 100));
      }
      await v1([0x51]);
    } else {
      let ok = false;
      for (let i = 0; i < 8 && !ok; i++) { raw.length = 0; try { await v2([0x01]); ok = true; } catch { await sleep(50); } }
      if (!ok) throw new Error("Could not reach the Mega bootloader. Press the reset button just before uploading and try again.");
      await v2([0x10, 0xc8, 0x64, 0x19, 0x20, 0x00, 0x53, 0x03, 0xac, 0x53, 0x00, 0x00]);
      for (let a = 0; a < hex.length; a += p.page) {
        const w = a >> 1, chunk = Array.from(hex.slice(a, a + p.page));
        await v2([0x06, 0x80 | ((w >> 24) & 0x7f), (w >> 16) & 0xff, (w >> 8) & 0xff, w & 0xff]);
        await v2([0x13, chunk.length >> 8, chunk.length & 0xff, 0xc1, 0x0a, 0x40, 0x4c, 0x20, 0x00, 0x00, ...chunk]);
        progress(Math.round(((a + chunk.length) / hex.length) * 100));
      }
      await v2([0x11, 0x01, 0x01]);
    }
  } finally { raw = null; }
}

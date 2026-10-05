/* Web Serial (USB) helpers — Chrome/Edge desktop only. */
type Port = any;
let port: Port | null = null;
let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
let reading = false;

export const serialSupported = () => typeof navigator !== "undefined" && "serial" in navigator;

export async function connect(baud: number, onData: (s: string) => void) {
  // @ts-expect-error web serial
  port = await navigator.serial.requestPort();
  await port.open({ baudRate: baud });
  writer = port.writable.getWriter();
  reading = true;
  (async () => {
    const reader = port.readable.getReader();
    const dec = new TextDecoder();
    try {
      while (reading) {
        const { value, done } = await reader.read();
        if (done) break;
        onData(dec.decode(value));
      }
    } catch { /* closed */ } finally { reader.releaseLock(); }
  })();
}

export async function disconnect() {
  reading = false;
  try { writer?.releaseLock(); await port?.close(); } catch { /* ignore */ }
  port = null; writer = null;
}

export const isConnected = () => !!port;

const enc = new TextEncoder();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function send(s: string) { if (!writer) throw new Error("Not connected"); await writer.write(enc.encode(s)); }

/** Upload MicroPython as main.py via raw REPL, then soft-reset. Works for micro:bit, Pico, ESP32 MicroPython. */
export async function uploadMicroPython(code: string) {
  await send("\r\x03\x03"); await sleep(200);
  await send("\x01"); await sleep(200); // raw REPL
  const b64 = btoa(unescape(encodeURIComponent(code)));
  await send("f=open('main.py','w')\r\x04"); await sleep(150);
  for (let i = 0; i < b64.length; i += 200) {
    const chunk = b64.slice(i, i + 200);
    await send(`import ubinascii as b;f.write(b.a2b_base64('${chunk}'))\r\x04`);
    await sleep(120);
  }
  await send("f.close()\r\x04"); await sleep(150);
  await send("\x02"); await sleep(100);
  await send("\x04"); // soft reset -> runs main.py
}

export async function sendLine(s: string) { await send(s + "\r\n"); }

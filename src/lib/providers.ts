export type Provider = { id: string; name: string; url: string; base: string; model: string; needsKey: boolean };

// All OpenAI-compatible chat endpoints. "lovable" is built in and needs no key.
export const PROVIDERS: Provider[] = [
  { id: "lovable", name: "Lovable AI (built-in)", url: "https://lovable.dev", base: "", model: "openai/gpt-6-astra", needsKey: false },
  { id: "groq", name: "Groq", url: "https://console.groq.com", base: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile", needsKey: true },
  { id: "cerebras", name: "Cerebras", url: "https://cloud.cerebras.ai", base: "https://api.cerebras.ai/v1", model: "llama-3.3-70b", needsKey: true },
  { id: "gemini", name: "Google Gemini", url: "https://aistudio.google.com", base: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash", needsKey: true },
  { id: "llm7", name: "LLM7.io", url: "https://llm7.io", base: "https://api.llm7.io/v1", model: "gpt-4o-mini", needsKey: false },
  { id: "intern", name: "Intern AI", url: "https://intern-ai.org.cn", base: "https://chat.intern-ai.org.cn/api/v1", model: "internlm3-latest", needsKey: true },
  { id: "void", name: "Void AI", url: "https://voidai.dev", base: "https://api.voidai.app/v1", model: "gpt-4o-mini", needsKey: true },
  { id: "openrouter", name: "OpenRouter", url: "https://openrouter.ai", base: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.3-70b-instruct:free", needsKey: true },
  { id: "github", name: "GitHub Models", url: "https://github.com/marketplace/models", base: "https://models.github.ai/inference", model: "openai/gpt-4o-mini", needsKey: true },
  { id: "cloudflare", name: "Cloudflare Workers AI", url: "https://dash.cloudflare.com", base: "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/ai/v1", model: "@cf/meta/llama-3.1-8b-instruct", needsKey: true },
  { id: "hf", name: "Hugging Face", url: "https://huggingface.co/inference-api", base: "https://router.huggingface.co/v1", model: "meta-llama/Llama-3.1-8B-Instruct", needsKey: true },
  { id: "mistral", name: "Mistral AI", url: "https://console.mistral.ai", base: "https://api.mistral.ai/v1", model: "codestral-latest", needsKey: true },
  { id: "cohere", name: "Cohere", url: "https://dashboard.cohere.com", base: "https://api.cohere.ai/compatibility/v1", model: "command-r-plus", needsKey: true },
  { id: "together", name: "Together AI", url: "https://api.together.xyz", base: "https://api.together.xyz/v1", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free", needsKey: true },
  { id: "fireworks", name: "Fireworks AI", url: "https://fireworks.ai", base: "https://api.fireworks.ai/inference/v1", model: "accounts/fireworks/models/llama-v3p1-8b-instruct", needsKey: true },
  { id: "nvidia", name: "NVIDIA NIM", url: "https://build.nvidia.com", base: "https://integrate.api.nvidia.com/v1", model: "meta/llama-3.1-70b-instruct", needsKey: true },
];

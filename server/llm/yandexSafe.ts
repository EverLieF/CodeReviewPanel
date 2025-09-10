import { yandexCompletion, YCMessage } from "./yandex";
import { config } from "../config";

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export async function yandexCompletionSafe(messages: YCMessage[], opts?: { temperature?: number; maxTokens?: number; modelUri?: string }) {
  const { timeoutMs, maxRetries, retryBaseMs } = config.llm;
  let attempt = 0;
  while (true) {
    attempt++;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // yandexCompletion внутри использует fetch; прокинь signal при необходимости (если поддерживаешь).
      const res = await yandexCompletion(messages, opts);
      clearTimeout(t);
      return res;
    } catch (e: any) {
      clearTimeout(t);
      const retriable =
        e?.name === "AbortError" ||
        e?.code === "ETIMEDOUT" ||
        e?.code === "ECONNRESET" ||
        e?.status === 429 ||
        (e?.status >= 500 && e?.status < 600);
      if (!retriable || attempt > (maxRetries + 1)) throw e;
      const backoff = retryBaseMs * Math.pow(2, attempt - 2); // 1x,2x...
      await sleep(backoff);
    }
  }
}

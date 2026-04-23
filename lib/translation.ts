// Server-only — never import from client components

interface CacheEntry {
  translated: string;
  timestamp: number;
}

// Simple LRU cache (100 entries)
const cache = new Map<string, CacheEntry>();
const MAX_CACHE = 100;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function getCacheKey(text: string, targetLang: string): string {
  return `${targetLang}:${text}`;
}

function pruneCache() {
  if (cache.size >= MAX_CACHE) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}

export async function translateMessage(
  text: string,
  targetLang: string
): Promise<string> {
  const key = getCacheKey(text, targetLang);
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.translated;
  }

  try {
    const res = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: targetLang.toUpperCase(),
      }),
    });

    if (res.status === 429) {
      console.warn('[DeepL] Rate limited');
      return text;
    }

    if (!res.ok) {
      console.warn('[DeepL] API error:', res.status);
      return text;
    }

    const data = await res.json();
    const translated: string = data.translations?.[0]?.text ?? text;

    pruneCache();
    cache.set(key, { translated, timestamp: Date.now() });

    return translated;
  } catch (err) {
    console.warn('[DeepL] Failed:', err);
    return text;
  }
}

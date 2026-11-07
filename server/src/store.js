import { randomBytes, randomUUID } from 'node:crypto';

export function createStore() {
  const links = new Map();

  return {
    list() {
      return [...links.values()].reverse().map((link) => ({ ...link }));
    },
    get(code) {
      const link = links.get(code);
      return link ? { ...link } : undefined;
    },
    create(url, customAlias) {
      let code = customAlias;
      if (!code) {
        do {
          code = randomBytes(6).toString('base64url');
        } while (links.has(code));
      }
      if (links.has(code)) return null;
      const link = { id: randomUUID(), code, url, clicks: 0, createdAt: new Date().toISOString() };
      links.set(code, link);
      return { ...link };
    },
    delete(code) {
      return links.delete(code);
    },
    incrementClicks(code) {
      const link = links.get(code);
      if (!link) return undefined;
      link.clicks += 1;
      return { ...link };
    }
  };
}

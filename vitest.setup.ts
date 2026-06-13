const memory = new Map<string, string>();

const localStorageMock: Storage = {
  getItem(key: string) {
    return memory.has(key) ? memory.get(key)! : null;
  },
  setItem(key: string, value: string) {
    memory.set(key, value);
  },
  removeItem(key: string) {
    memory.delete(key);
  },
  clear() {
    memory.clear();
  },
  key(index: number) {
    return [...memory.keys()][index] ?? null;
  },
  get length() {
    return memory.size;
  },
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

if (typeof globalThis.window === "undefined") {
  (globalThis as any).window = {
    location: { href: "http://localhost:5173/" },
  };
}

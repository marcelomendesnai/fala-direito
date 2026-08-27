(function (global) {
  "use strict";

  const DB_NAME = "fala-direito-recordings";
  const DB_VERSION = 1;
  const SESSION_STORE = "sessions";
  const CHUNK_STORE = "chunks";
  let dbPromise = null;

  function openDb() {
    if (!global.indexedDB) return Promise.reject(new Error("Armazenamento local indisponivel."));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = global.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SESSION_STORE)) {
          db.createObjectStore(SESSION_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(CHUNK_STORE)) {
          const store = db.createObjectStore(CHUNK_STORE, { keyPath: "key" });
          store.createIndex("sessionId", "sessionId", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Falha ao abrir o armazenamento local."));
    });
    return dbPromise;
  }

  async function run(storeNames, mode, work) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, mode);
      let result;
      try { result = work(tx); }
      catch (error) { reject(error); return; }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error("Falha ao salvar a gravacao."));
      tx.onabort = () => reject(tx.error || new Error("Gravacao local interrompida."));
    });
  }

  async function createSession(session) {
    await run([SESSION_STORE], "readwrite", (tx) => tx.objectStore(SESSION_STORE).put(session));
    return session;
  }

  async function updateSession(id, patch) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SESSION_STORE], "readwrite");
      const store = tx.objectStore(SESSION_STORE);
      const request = store.get(id);
      let updated = null;
      request.onsuccess = () => {
        if (!request.result) return;
        updated = { ...request.result, ...patch, id, updatedAt: Date.now() };
        store.put(updated);
      };
      request.onerror = () => reject(request.error || new Error("Falha ao ler a sessao."));
      tx.oncomplete = () => resolve(updated);
      tx.onerror = () => reject(tx.error || new Error("Falha ao atualizar a sessao."));
      tx.onabort = () => reject(tx.error || new Error("Atualizacao local interrompida."));
    });
  }

  async function saveChunk(sessionId, part, seq, blob, mimeType) {
    const record = {
      key: `${sessionId}:${String(part).padStart(5, "0")}:${String(seq).padStart(8, "0")}`,
      sessionId,
      part,
      seq,
      blob,
      mimeType: mimeType || blob.type || "audio/webm",
      createdAt: Date.now(),
    };
    await run([CHUNK_STORE], "readwrite", (tx) => tx.objectStore(CHUNK_STORE).put(record));
    return record;
  }

  async function getSessionChunks(sessionId) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CHUNK_STORE], "readonly");
      const index = tx.objectStore(CHUNK_STORE).index("sessionId");
      const request = index.getAll(global.IDBKeyRange.only(sessionId));
      request.onsuccess = () => resolve((request.result || []).sort((a, b) => a.part - b.part || a.seq - b.seq));
      request.onerror = () => reject(request.error || new Error("Falha ao recuperar o audio."));
    });
  }

  async function getLatestRecoverableSession() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SESSION_STORE], "readonly");
      const request = tx.objectStore(SESSION_STORE).getAll();
      request.onsuccess = () => {
        const sessions = (request.result || [])
          .filter((item) => ["recording", "paused", "ready"].includes(item.status))
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(sessions[0] || null);
      };
      request.onerror = () => reject(request.error || new Error("Falha ao procurar gravacao interrompida."));
    });
  }

  async function deleteSession(sessionId) {
    const chunks = await getSessionChunks(sessionId);
    await run([SESSION_STORE, CHUNK_STORE], "readwrite", (tx) => {
      tx.objectStore(SESSION_STORE).delete(sessionId);
      const chunkStore = tx.objectStore(CHUNK_STORE);
      chunks.forEach((item) => chunkStore.delete(item.key));
    });
  }

  global.FDRecordingStore = {
    open: openDb,
    createSession,
    updateSession,
    saveChunk,
    getSessionChunks,
    getLatestRecoverableSession,
    deleteSession,
  };
})(window);

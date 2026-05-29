/**
 * Client-safe script generator constants (no Prisma, no server imports).
 */

export const SCRIPT_PROMPT_REF_ONLY = "__SCRIPT_REF_ONLY__";

export const SCRIPT_REF_LIMIT_MESSAGE =
  "В один чат можно добавить только один ролик-референс. Создайте новый чат для другого ролика.";

export const SCRIPT_REF_DUPLICATE_MESSAGE = "Этот ролик уже добавлен в чат";

export const SCRIPT_REF_HAS_HISTORY_MESSAGE =
  "У этого чата уже есть история сообщений. Создайте новый чат для другого ролика.";

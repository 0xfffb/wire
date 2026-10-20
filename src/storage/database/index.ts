abstract class SqlDatabase {
  abstract prepare(query: string): SqlStatement;
  abstract batch<T = unknown>(statements: SqlStatement[]): Promise<T[]>;
  abstract exec(query: string): Promise<unknown>;
}

abstract class SqlStatement {
  abstract bind(...values: unknown[]): SqlStatement;
  abstract first<T = Record<string, unknown>>(): Promise<T | null>;
  abstract all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  abstract run(): Promise<{ success: boolean; meta?: unknown }>;
}

export { SqlDatabase, SqlStatement };

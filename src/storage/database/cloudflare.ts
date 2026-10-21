import { SqlDatabase, SqlStatement } from "./index";

class D1SqlStatement extends SqlStatement {
  constructor(private readonly stmt: D1PreparedStatement) {
    super();
  }

  toD1() {
    return this.stmt;
  }

  bind(...values: unknown[]) {
    return new D1SqlStatement(this.stmt.bind(...values));
  }

  first<T = Record<string, unknown>>() {
    return this.stmt.first<T>();
  }

  all<T = Record<string, unknown>>() {
    return this.stmt.all<T>();
  }

  async run() {
    const result = await this.stmt.run();
    return { success: result.success, meta: result.meta };
  }
}

class CloudflareSqlDatabase extends SqlDatabase {
  constructor(private readonly d1: D1Database) {
    super();
  }

  prepare(query: string) {
    return new D1SqlStatement(this.d1.prepare(query));
  }

  async batch<T = unknown>(statements: SqlStatement[]): Promise<T[]> {
    const prepared = statements.map((statement) => {
      if (!(statement instanceof D1SqlStatement)) {
        throw new Error("CloudflareSqlDatabase.batch only accepts D1 statements");
      }
      return statement.toD1();
    });
    return (await this.d1.batch(prepared)) as T[];
  }

  exec(query: string) {
    return this.d1.exec(query);
  }
}

export { CloudflareSqlDatabase };

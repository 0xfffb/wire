import type { Deps } from "../deps";

abstract class Job {
  readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(payload: unknown) {
    throw new Error("Not implemented");
  }
}

export { Job };

import type { Deps } from "../deps";
import { Job } from "./job";

class ExampleJob extends Job {
  readonly type = "example";


  constructor(deps: Deps) {
    super(deps);
  }

  async execute(payload: unknown) {
    console.log("ExampleJob executed", payload);
  }
}

export { ExampleJob };
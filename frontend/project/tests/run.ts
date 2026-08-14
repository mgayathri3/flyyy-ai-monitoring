// Test entry point — imports all test files and runs them.
import { runAll } from "./deps.ts";
import "./pii.test.ts";
import "./agent.test.ts";
import "./retention.test.ts";

await runAll();

## Working principles

- **Simplest possible implementation, always.** Prefer the most straightforward solution that works. No speculative abstraction, no gold-plating.
- **Robust, but simple first.** The simple version must still be correct and reliable — simple does not mean fragile.
- **Ask before implementing edge cases.** Build the core happy path, then stop and ask before adding handling for edge cases, error branches, or extra scenarios.
- **Least amount of changes possible.** Make the smallest diff that accomplishes the task. Don't refactor, rename, or touch unrelated code unless asked.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

# Worker entrypoints

Every module in this directory runs **off the main thread** inside a `workerpool`
thread. The rules below are not style preferences — breaking them causes runtime
failures that are hard to trace back here.

## Rules

1. **No `better-sqlite3`.** Never `require("../dbService")` or open a database
   handle. The DB connection in this codebase is main-thread-only. Resolve all
   data on the main thread and pass plain values in.
2. **No Express.** No `req`, no `res`, no middleware. They are not serializable.
3. **No `dotenv` / `process.env`.** The caller reads configuration and passes it
   as an argument. Workers that read env drift from the parent's assumptions and
   are painful to test.
4. **Absolute paths only.** Never resolve paths from `__dirname` relative to the
   project. The caller resolves and passes an absolute path.
5. **Caller creates directories.** `fs.mkdirSync(..., { recursive: true })`
   happens on the main thread before dispatch.
6. **Structured-clone payloads only.** Strings, numbers, booleans, plain objects,
   arrays, `Buffer`/`TypedArray`. No class instances, no functions, no streams.

## Errors

`workerpool` serializes a rejection's `message` and `stack` only. Custom error
classes and extra properties **do not survive** the boundary. If a caller must
branch on a failure type, encode a `code` string into the message or return a
result object instead of throwing.

## Shape

Each module ends with:

```js
workerpool.worker({ methodName: fn });
```

See `specs/009-worker-thread-pool/contracts/worker-tasks.md` for the task
signatures.

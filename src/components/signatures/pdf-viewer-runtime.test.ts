import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { runInNewContext } from "node:vm";
import type { WebpackConfigContext } from "next/dist/server/config-shared";
import { expect, it } from "vitest";
import nextConfig from "../../../next.config";

type CompilationStats = { hasErrors(): boolean; toString(): string };
type Compiler = {
  run(callback: (error: Error | null, stats?: CompilationStats) => void): void;
  close(callback: (error?: Error | null) => void): void;
};

const require = createRequire(import.meta.url);
const nextWebpack = require("next/dist/compiled/webpack/webpack") as {
  init(): void;
  webpack(config: object): Compiler;
};
nextWebpack.init();

it("initializes React-PDF in the actual Next Webpack development browser bundle", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "artieda-pdf-runtime-"));
  try {
    const entry = path.join(directory, "entry.mjs");
    await writeFile(entry, `
      import { Document, Page, pdfjs } from "react-pdf";
      globalThis.pdfViewer = { Document, Page, getDocument: pdfjs.getDocument, version: pdfjs.version };
    `);
    const config = {
      mode: "development",
      // Next development uses eval source maps. Importing directly under Vitest
      // does not exercise this bundling path, which previously crashed in browsers.
      devtool: "eval-source-map",
      target: "web",
      entry,
      output: { path: directory, filename: "viewer.js", publicPath: "/" },
      resolve: { modules: [path.resolve("node_modules")] },
    };
    const configured = nextConfig.webpack
      ? nextConfig.webpack(config, { dev: true, isServer: false } as WebpackConfigContext)
      : config;
    const compiler = nextWebpack.webpack(configured);
    try {
      await new Promise<void>((resolve, reject) => compiler.run((error, stats) => {
        if (error) reject(error);
        else if (stats?.hasErrors()) reject(new Error(stats.toString()));
        else resolve();
      }));
    } finally {
      await new Promise<void>((resolve, reject) => compiler.close((error) => error ? reject(error) : resolve()));
    }

    // Only the import-time browser primitive is stubbed; React-PDF, PDF.js, and
    // Next's Webpack compiler/runtime all execute their installed real code.
    const browser = {
      DOMMatrix: class DOMMatrix {},
      console,
      pdfViewer: undefined as undefined | {
        Document: unknown;
        Page: unknown;
        getDocument: unknown;
        version: string;
      },
    };
    runInNewContext(await readFile(path.join(directory, "viewer.js"), "utf8"), browser);
    expect(browser.pdfViewer?.getDocument).toBeTypeOf("function");
    expect(browser.pdfViewer?.Document).toBeDefined();
    expect(browser.pdfViewer?.Page).toBeDefined();
    expect(browser.pdfViewer?.version).toBe(require("pdfjs-dist/package.json").version);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);

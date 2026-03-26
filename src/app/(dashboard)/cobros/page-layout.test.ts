import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cobrosPageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("cobros page metric cards", () => {
  it("renders Programados in the previous Pendiente slot and Pendiente in the previous Programados slot", () => {
    const cobradoIndex = cobrosPageSource.indexOf('label="Cobrado"');
    const programadosIndex = cobrosPageSource.indexOf('label="Programados"');
    const vencidosIndex = cobrosPageSource.indexOf('label="Vencidos"');
    const pendienteIndex = cobrosPageSource.indexOf('label="Pendiente"');

    expect(cobradoIndex).toBeGreaterThanOrEqual(0);
    expect(programadosIndex).toBeGreaterThan(cobradoIndex);
    expect(vencidosIndex).toBeGreaterThan(programadosIndex);
    expect(pendienteIndex).toBeGreaterThan(vencidosIndex);
  });
});

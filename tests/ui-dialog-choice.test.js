// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";
import { createChoiceDialog, createConfirmDialog } from "../src/ui-dialog.js";

describe("createChoiceDialog", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="choiceDialog" class="modal-bg">
        <div class="modal">
          <h2 id="choiceDialogTitle">Zakres</h2>
          <p id="choiceDialogBody"></p>
          <div class="actions">
            <button type="button" id="choiceDialogCancel">Anuluj</button>
            <button type="button" id="choiceDialogLocal">Lokalnie</button>
            <button type="button" id="choiceDialogLib">Biblioteka</button>
          </div>
        </div>
      </div>
    `;
  });

  it("zwraca library / local / cancel", async () => {
    const dlg = createChoiceDialog();
    dlg.init();
    const pLib = dlg.ask("msg");
    document.getElementById("choiceDialogLib").click();
    expect(await pLib).toBe("library");

    const pLocal = dlg.ask("msg");
    document.getElementById("choiceDialogLocal").click();
    expect(await pLocal).toBe("local");

    const pCancel = dlg.ask("msg");
    document.getElementById("choiceDialogCancel").click();
    expect(await pCancel).toBe("cancel");
  });

  it("po ask pierwszy przycisk ma fokus i aria-modal", async () => {
    const dlg = createChoiceDialog();
    dlg.init();
    const p = dlg.ask("msg");
    const bg = document.getElementById("choiceDialog");
    expect(bg.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement?.id).toBe("choiceDialogCancel");
    document.getElementById("choiceDialogCancel").click();
    expect(await p).toBe("cancel");
  });
});

describe("createConfirmDialog", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="confirmDialog" class="modal-bg">
        <div class="modal">
          <h2 id="confirmDialogTitle">Potwierdzenie</h2>
          <p id="confirmDialogBody"></p>
          <div class="actions">
            <button type="button" id="confirmDialogCancel">Anuluj</button>
            <button type="button" id="confirmDialogOk">OK</button>
          </div>
        </div>
      </div>
    `;
  });

  it("po ask pierwszy przycisk ma fokus i aria-modal", async () => {
    const dlg = createConfirmDialog();
    dlg.init();
    const p = dlg.ask("Na pewno?");
    const bg = document.getElementById("confirmDialog");
    expect(bg.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement?.id).toBe("confirmDialogCancel");
    document.getElementById("confirmDialogOk").click();
    expect(await p).toBe(true);
  });
});

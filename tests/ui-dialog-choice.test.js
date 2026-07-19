// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";
import { createChoiceDialog } from "../src/ui-dialog.js";

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
});

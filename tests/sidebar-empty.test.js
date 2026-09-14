// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { SIDEBAR_PANEL_KEY, syncSidebarEmptyStates, wireSidebarPanels } from "../src/sidebar-empty.js";
import { W } from "../src/ui-wording.js";

function mountSidebar() {
  document.body.innerHTML = `
    <div id="left">
      <section class="side-sec" data-sec="sheets">
        <button type="button" class="side-sec-head" aria-expanded="true">
          <span class="side-sec-label">X</span>
          <span class="side-sec-count" id="schCount">0</span>
        </button>
        <div class="side-sec-body">
          <div id="schEmpty" class="list-empty">
            <div></div>
            <button type="button"><span class="btn-text"></span></button>
          </div>
        </div>
      </section>
      <section class="side-sec" data-sec="symbols">
        <button type="button" class="side-sec-head" aria-expanded="true">
          <span class="side-sec-label">Y</span>
          <span class="side-sec-count" id="symCount">0</span>
        </button>
        <div class="side-sec-body">
          <div id="symEmpty" class="list-empty"></div>
        </div>
      </section>
      <section class="side-sec" data-sec="elements">
        <button type="button" class="side-sec-head" aria-expanded="true">
          <span class="side-sec-label">Z</span>
          <span class="side-sec-count" id="elemCount">0</span>
        </button>
        <div class="side-sec-body">
          <div id="elemEmpty" class="list-empty"></div>
        </div>
      </section>
    </div>
  `;
  return document.getElementById("left");
}

afterEach(() => {
  document.body.innerHTML = "";
  sessionStorage.removeItem(SIDEBAR_PANEL_KEY);
});

describe("syncSidebarEmptyStates", () => {
  it("ustawia liczniki i ukrywa puste stany gdy są pozycje", () => {
    mountSidebar();
    syncSidebarEmptyStates({
      schEmpty: document.getElementById("schEmpty"),
      symEmpty: document.getElementById("symEmpty"),
      elemEmpty: document.getElementById("elemEmpty"),
      sheetCount: 2,
      symbolCount: 4,
      elementCount: 3,
      sheetActive: true,
    });
    expect(document.getElementById("schCount").textContent).toBe("2");
    expect(document.getElementById("symCount").textContent).toBe("4");
    expect(document.getElementById("elemCount").textContent).toBe("3");
    expect(document.getElementById("schEmpty").hidden).toBe(true);
    expect(document.getElementById("symEmpty").hidden).toBe(true);
    expect(document.getElementById("elemEmpty").hidden).toBe(true);
  });

  it("czyści licznik elementów poza arkuszem", () => {
    mountSidebar();
    syncSidebarEmptyStates({
      schEmpty: document.getElementById("schEmpty"),
      symEmpty: document.getElementById("symEmpty"),
      elemEmpty: document.getElementById("elemEmpty"),
      sheetCount: 0,
      symbolCount: 0,
      elementCount: 9,
      sheetActive: false,
    });
    expect(document.getElementById("elemCount").textContent).toBe("");
    expect(document.getElementById("elemEmpty").hidden).toBe(true);
    expect(document.getElementById("schEmpty").hidden).toBe(false);
    expect(document.getElementById("schEmpty").querySelector("div").textContent).toBe(W.empty.sheets);
  });
});

describe("wireSidebarPanels", () => {
  it("zwija sekcję i zapamiętuje stan", () => {
    const root = mountSidebar();
    wireSidebarPanels(root);
    const sec = root.querySelector('[data-sec="sheets"]');
    const head = sec.querySelector(".side-sec-head");
    expect(head.getAttribute("aria-expanded")).toBe("true");
    expect(sec.querySelector(".side-sec-label").textContent).toBe(W.sidebar.sheets);
    head.click();
    expect(sec.classList.contains("is-collapsed")).toBe(true);
    expect(head.getAttribute("aria-expanded")).toBe("false");
    expect(JSON.parse(sessionStorage.getItem(SIDEBAR_PANEL_KEY)).sheets).toBe(true);
  });

  it("przywraca zwinięcie z sessionStorage", () => {
    sessionStorage.setItem(SIDEBAR_PANEL_KEY, JSON.stringify({ symbols: true }));
    const root = mountSidebar();
    wireSidebarPanels(root);
    const sec = root.querySelector('[data-sec="symbols"]');
    expect(sec.classList.contains("is-collapsed")).toBe(true);
    expect(sec.querySelector(".side-sec-head").getAttribute("aria-expanded")).toBe("false");
  });
});

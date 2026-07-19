/** Stan badge zapisu / dirty / uprawnień — czysta logika (testowalna). */

/**
 * @param {{ dirtyN: number, needPerm: boolean, hasDir: boolean, hasLibDirty?: boolean }} p
 * @returns {{ kind: "ok"|"dirty"|"perm"|"idle", label: string, tip: string, actionable: boolean }}
 */
export function resolveSaveBadgeState({ dirtyN, needPerm, hasDir, hasLibDirty = false }) {
  if (needPerm && hasDir) {
    return {
      kind: "perm",
      label: "Przywróć dostęp",
      tip: "Kliknij, aby przywrócić zapis do folderu projektu",
      actionable: true,
    };
  }
  const dirty = (dirtyN | 0) + (hasLibDirty ? 1 : 0);
  if (dirty > 0) {
    const n = dirtyN | 0;
    const label = n > 0 ? (n === 1 ? "1 niezapisany" : n + " niezapisane") : "Niezapisane";
    return {
      kind: "dirty",
      label,
      tip: "Są niezapisane zmiany — Zapisz (Ctrl+S)",
      actionable: false,
    };
  }
  if (hasDir) {
    return {
      kind: "ok",
      label: "Zapisano",
      tip: "Projekt zsynchronizowany z dyskiem",
      actionable: false,
    };
  }
  return {
    kind: "idle",
    label: "Brak projektu",
    tip: "Otwórz folder projektu, aby włączyć zapis na dysk",
    actionable: false,
  };
}

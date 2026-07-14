/** Pola nazwy symbolu w toolbarze — ID techniczne vs oznaczenie instancji. */

/** Oznaczenie (prefiks) nie jest auto-wypełniane sugestią — tylko placeholder. */
export function resolveInstPrefixFields(explicitPrefix, suggestedBase) {
  return {
    value: (explicitPrefix || "").trim(),
    placeholder: (suggestedBase || "").trim(),
  };
}

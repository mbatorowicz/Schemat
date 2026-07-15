/** Pola nazwy symbolu w toolbarze — bez sugestii w placeholderze. */

export function resolveInstPrefixFields(explicitPrefix) {
  return {
    value: (explicitPrefix || "").trim(),
    placeholder: "",
  };
}

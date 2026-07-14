/** Wybór styku punktu względem drugiego końca połączenia (jeden logiczny endpoint). */

/**
 * @param {{ x: number, y: number, dir: string }[]} contacts — styki w układzie arkusza
 * @param {{ x: number, y: number }} center — środek jointa w układzie arkusza
 * @param {{ x: number, y: number }} toward — pozycja drugiego końca (hint)
 */
export function pickPointContactByToward(contacts, center, toward) {
  if (!contacts.length) return { x: center.x, y: center.y, dir: "E" };
  const tdx = toward.x - center.x;
  const tdy = toward.y - center.y;
  const tlen = Math.hypot(tdx, tdy);
  const tnx = tlen > 0.001 ? tdx / tlen : 1;
  const tny = tlen > 0.001 ? tdy / tlen : 0;
  let best = contacts[0];
  let bestScore = -Infinity;
  contacts.forEach((c) => {
    const vdx = c.x - center.x;
    const vdy = c.y - center.y;
    const vlen = Math.hypot(vdx, vdy) || 1;
    const score = (vdx / vlen) * tnx + (vdy / vlen) * tny;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  });
  return best;
}

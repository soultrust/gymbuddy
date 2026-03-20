/** Strip trailing decimal zeros: "4.00" -> "4", "4.50" -> "4.5" */
export const formatNumber = (v: string | number | undefined): string => {
  if (v == null || v === "") return "";
  const n = parseFloat(String(v));
  return Number.isNaN(n) ? "" : String(n);
};

/** Same as formatNumber but returns "" for zero values (useful for weight display). */
export const formatWeight = (w: string | number | undefined): string => {
  const s = formatNumber(w);
  return s === "0" ? "" : s;
};

/** Format as MM/DD (e.g. 03/17) -- no year. */
export const formatDate = (d: string): string => {
  const date = new Date(d);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}/${dd}`;
};

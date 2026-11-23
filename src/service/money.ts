// `useGrouping: "always"`: l'es-ES per defecte no separa els milers de quatre xifres («1234,56 €»).
const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always",
});

// El mateix format sense el símbol, per als camps on l'usuari escriu un import.
const amount = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: "always",
});

// Partim dels cèntims enters i passem a Intl un decimal exacte: cap divisió en coma flotant.
// Amb BigInt, una suma de saldos és exacta encara que superi 2^53 - 1.
const toDecimal = (cents: number | bigint) => {
  const value = BigInt(cents);
  const rest = String(value % 100n).padStart(2, "0");
  return `${value / 100n}.${rest}` as `${number}`;
};

// «1.234,56 €»
export const formatEuroCents = (cents: number | bigint) => eur.format(toDecimal(cents));

// «1.234,56»
export const formatAmountCents = (cents: number | bigint) => amount.format(toDecimal(cents));

// Converteix el text del camp (format espanyol) a cèntims enters, sense coma flotant.
// Accepta «100», «100,5», «1.000,50» i també «100.50» si no és un separador de milers.
export const parseEuroAmount = (
  text: string,
): { cents: number } | { error: "empty" | "invalid" | "decimals" } => {
  const value = text.replace(/[\s€]/g, "");
  if (!value) return { error: "empty" };

  let normalized = value;
  if (value.includes(",")) {
    // «1.234,56»: els punts separen milers i la coma és el decimal.
    if (!/^(\d{1,3}(\.\d{3})*|\d+),\d*$/.test(value)) return { error: "invalid" };
    normalized = value.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(value)) {
    // «1.000» o «27.000»: només separadors de milers.
    normalized = value.replace(/\./g, "");
  }

  const match = /^(\d+)(?:\.(\d*))?$/.exec(normalized);
  if (!match) return { error: "invalid" };
  const [, units, fraction = ""] = match;
  if (fraction.length > 2) return { error: "decimals" };

  const cents = Number(units) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return { error: "invalid" };
  return { cents };
};

// Dona format al camp mentre s'escriu: «114000000» → «114.000.000», «1000,5» → «1.000,5».
// Els punts de milers els posa el camp, així que un punt o una coma escrits són el decimal
// (el teclat numèric sovint escriu un punt). Els decimals no es retallen: si n'hi ha més de
// dos, ho indica la validació. Retorna també on ha de quedar el cursor.
export const formatAmountInput = (
  value: string,
  caret: number,
  inputType = "insertText",
): { text: string; caret: number } => {
  let raw = value;
  let position = Math.min(Math.max(caret, 0), raw.length);

  const typed = inputType.startsWith("insert") && inputType !== "insertFromPaste" && position > 0
    ? raw[position - 1]
    : "";
  if (typed === "." || typed === ",") {
    const before = raw.slice(0, position - 1);
    const after = raw.slice(position);
    if ((before + after).includes(",")) {
      // Ja hi ha decimal: s'ignora el separador nou.
      raw = before + after;
      position -= 1;
    } else {
      raw = `${before},${after}`;
    }
  } else if (inputType === "insertFromPaste" && !raw.includes(",")) {
    // «100.50» enganxat: un punt seguit d'una o dues xifres al final és el decimal.
    raw = raw.replace(/\.(\d{0,2})$/, ",$1");
  }

  // Només queden xifres i la primera coma; comptem quants d'aquests caràcters hi ha abans del cursor.
  let cleaned = "";
  let significantBeforeCaret = 0;
  for (let index = 0; index < raw.length; index++) {
    const char = raw[index];
    const keep = /\d/.test(char) || (char === "," && !cleaned.includes(","));
    if (!keep) continue;
    cleaned += char;
    if (index < position) significantBeforeCaret++;
  }

  const hasDecimal = cleaned.includes(",");
  const parts = cleaned.split(",");
  let integer = parts[0];
  const fraction = parts[1] ?? "";
  if (hasDecimal && integer === "") {
    integer = "0";
    if (significantBeforeCaret > 0) significantBeforeCaret++;
  }
  // «007» → «7», però «0,5» conserva el zero.
  const withoutLeadingZeros = integer.replace(/^0+(?=\d)/, "");
  significantBeforeCaret = Math.max(
    0,
    significantBeforeCaret - Math.min(integer.length - withoutLeadingZeros.length, significantBeforeCaret),
  );

  const grouped = withoutLeadingZeros.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const text = hasDecimal ? `${grouped},${fraction}` : grouped;

  // El cursor queda darrere del mateix nombre de xifres que tenia abans; els punts nous no compten.
  let newCaret = 0;
  for (let count = 0; newCaret < text.length && count < significantBeforeCaret; newCaret++) {
    if (text[newCaret] !== ".") count++;
  }
  return { text, caret: newCaret };
};

// Longitud de l'IBAN de cada país: la mateixa taula amb què valida el backend
// (app/schemas/wallet.py, IBAN_LENGTHS). Si un país no hi és, el backend el rebutja.
const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BF: 27,
  BG: 22, BH: 22, BI: 16, BJ: 28, BR: 29, BY: 28, CF: 27, CG: 27,
  CH: 21, CI: 28, CM: 27, CR: 22, CV: 25, CY: 28, CZ: 24, DE: 22,
  DJ: 27, DK: 18, DO: 28, DZ: 24, EE: 20, EG: 29, ES: 24, FI: 18,
  FO: 18, FR: 27, GA: 27, GB: 22, GE: 22, GI: 23, GL: 18, GQ: 27,
  GR: 27, GT: 28, GW: 25, HN: 28, HR: 21, HU: 28, IE: 22, IL: 23,
  IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32,
  LI: 21, LT: 20, LU: 20, LV: 21, LY: 25, MA: 28, MC: 27, MD: 24,
  ME: 22, MG: 27, MK: 19, ML: 28, MR: 27, MT: 31, MU: 30, MZ: 25,
  NE: 28, NI: 28, NL: 18, NO: 15, OM: 23, PK: 24, PL: 28, PS: 29,
  PT: 25, QA: 29, RO: 24, RS: 22, SA: 24, SC: 31, SD: 18, SE: 24,
  SI: 19, SK: 24, SM: 27, SN: 28, ST: 25, SV: 28, TD: 27, TG: 28,
  TL: 23, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20,
};

// «es91 2100 0418…» → «ES9121000418…»: sense espais i en majúscules, com el desa el backend.
export const normalizeIban = (text: string) => text.replace(/\s+/g, "").toUpperCase();

// Les mateixes comprovacions que el backend (WithdrawalRequest): codi de país i dos dígits de
// control, la longitud d'aquell país i el mòdul 97. Rep l'IBAN normalitzat.
export const isValidIban = (iban: string): boolean => {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return false;
  if (IBAN_LENGTHS[iban.slice(0, 2)] !== iban.length) return false;

  // Els quatre primers caràcters van al final i cada lletra passa a ser un nombre (A = 10).
  // El residu es calcula xifra a xifra: el nombre sencer no cap en un enter segur.
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
};

// «ES9121000418450200051332» → «ES91 2100 0418 4502 0005 1332»
export const formatIban = (iban: string) => iban.replace(/(.{4})(?=.)/g, "$1 ");

// Només es veuen els quatre primers i els quatre últims caràcters: «ES91 •••• •••• •••• •••• 1332».
export const maskIban = (iban: string) =>
  formatIban(`${iban.slice(0, 4)}${"•".repeat(Math.max(iban.length - 8, 0))}${iban.slice(-4)}`);

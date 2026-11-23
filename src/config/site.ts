import type { SiteConfig } from "../models/SiteConfig";

// Site-wide constants. Unknown facts stay as visible TODO markers until
// Kristjan provides them (listed in docs/todo-content.md).
export const site: SiteConfig = {
  name: "Kmetija Kremžar",
  wordmarkLead: "KMETIJA",
  wordmarkAccent: "KREMŽAR",
  description:
    "Domače mleko, jogurt, sir in kruh z naše družinske kmetije. Naročite enkrat na teden, naročilo vam prinesemo osebno, plačate ob prevzemu.",
  phone: "[TODO Kristjan: telefonska številka]",
  address: "[TODO Kristjan: naslov kmetije]",
  mapLink: { href: "#", label: "[TODO Kristjan: povezava na zemljevid]" },
  socialLinks: [
    { href: "#", label: "[TODO Kristjan: Instagram]" },
    { href: "#", label: "[TODO Kristjan: Facebook]" },
  ],
  orderLink: { href: "/narocilo", label: "Naročilo" },
  navLinks: [
    { href: "/izdelki", label: "Izdelki" },
    { href: "/o-kmetiji", label: "O kmetiji" },
    { href: "/novice", label: "Novice" },
    { href: "/galerija", label: "Galerija" },
    { href: "/kontakt", label: "Kontakt" },
  ],
};

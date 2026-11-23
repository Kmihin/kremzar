import type { NavLink } from "./NavLink";

export interface SiteConfig {
  name: string;
  wordmarkLead: string;
  wordmarkAccent: string;
  description: string;
  phone: string;
  address: string;
  mapLink: NavLink;
  socialLinks: NavLink[];
  orderLink: NavLink;
  navLinks: NavLink[];
}

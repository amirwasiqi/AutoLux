import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { MenuRounded, CloseRounded, ArrowOutwardRounded } from "@mui/icons-material";
const links = [{ label: "Vehicles", to: "/vehicles" }, { label: "Auto shop", to: "/shop" },
  { label: "Our services", to: "/services" }, { label: "Contact", to: "/contact" }];
export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="site-header"><div className="header-inner">
    <Link className="brand-mark" to="/" aria-label="AutoLux home"><span className="brand-symbol">A<span>·</span>L</span><span className="brand-word">AUTOLUX</span></Link>
    <nav className={`desktop-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
      {links.map((link) => <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)}
        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>{link.label}</NavLink>)}
      <Link className="mobile-nav-cta" to="/vehicles" onClick={() => setMenuOpen(false)}>Explore vehicles <ArrowOutwardRounded fontSize="small"/></Link>
    </nav>
    <div className="header-actions"><Link className="header-cta" to="/vehicles">Explore inventory <ArrowOutwardRounded fontSize="small"/></Link>
      <button className="menu-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <CloseRounded/> : <MenuRounded/>}</button>
    </div>
  </div></header>;
}
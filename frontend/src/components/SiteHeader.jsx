import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { MenuRounded, CloseRounded, ArrowOutwardRounded } from "@mui/icons-material";
import { useAuth } from "../auth/AuthContext.jsx";
const links = [{ label: "Home", to: "/" }, { label: "Vehicles", to: "/vehicles" }, { label: "Auto shop", to: "/shop" },
  { label: "Our services", to: "/services" }, { label: "Contact", to: "/contact" }];
export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const canManageFleet = user?.roles?.some((role) => ["super_admin", "company_admin", "fleet_manager"].includes(role));
  return <header className="site-header"><div className="header-inner">
    <Link className="brand-mark" to="/" aria-label="AutoLux home"><span className="brand-symbol">A<span>·</span>L</span><span className="brand-word">AUTOLUX</span></Link>
    <nav className={`desktop-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
      {links.map((link) => <NavLink key={link.to} to={link.to} end={link.to === "/"} onClick={() => setMenuOpen(false)}
        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>{link.label}</NavLink>)}
      {canManageFleet && <NavLink to="/admin" onClick={() => setMenuOpen(false)} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>Admin dashboard</NavLink>}
      {canManageFleet && <NavLink to="/admin/bookings" onClick={() => setMenuOpen(false)} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>Reservations</NavLink>}
      {canManageFleet && <NavLink to="/admin/fleet" onClick={() => setMenuOpen(false)} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>Fleet management</NavLink>}
      {!user ? <div className="mobile-auth-links"><Link to="/login" onClick={() => setMenuOpen(false)}>Log in</Link><Link to="/register" onClick={() => setMenuOpen(false)}>Create account</Link></div> : <Link className="mobile-nav-cta" to="/account" onClick={() => setMenuOpen(false)}>My account</Link>}
      <Link className="mobile-nav-cta" to="/vehicles" onClick={() => setMenuOpen(false)}>Explore vehicles <ArrowOutwardRounded fontSize="small"/></Link>
    </nav>
    <div className="header-actions">{canManageFleet && <Link className="header-cta" to="/admin">Admin dashboard</Link>}{!user ? <><Link className="header-auth-link" to="/login">Log in</Link><Link className="header-cta header-register" to="/register">Register <ArrowOutwardRounded fontSize="small"/></Link></> : <Link className="header-auth-link" to="/account">My account</Link>}<Link className="header-cta header-inventory" to="/vehicles">Explore inventory <ArrowOutwardRounded fontSize="small"/></Link>
      <button className="menu-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <CloseRounded/> : <MenuRounded/>}</button>
    </div>
  </div></header>;
}
import { Link } from "react-router-dom";
export default function SiteFooter() {
  return <footer className="site-footer"><div className="footer-main">
    <div><Link className="brand-mark footer-brand" to="/"><span className="brand-symbol">A<span>·</span>L</span><span className="brand-word">AUTOLUX</span></Link>
      <p className="footer-statement">The road is yours.<br/><span>Make every mile matter.</span></p></div>
    <div className="footer-column"><span className="eyebrow">Explore</span><Link to="/vehicles">Vehicles</Link><Link to="/shop">Auto shop</Link><Link to="/services">Services</Link></div>
    <div className="footer-column"><span className="eyebrow">Company</span><a href="#experience">Our approach</a><a href="#locations">Locations</a><Link to="/contact">Contact</Link></div>
    <div className="footer-column"><span className="eyebrow">Stay connected</span><p>Automotive, considered differently.</p><a href="mailto:hello@autolux.example">hello@autolux.example</a></div>
  </div><div className="footer-bottom"><span>© {new Date().getFullYear()} AutoLux. All rights reserved.</span><span>Designed for the driven.</span></div></footer>;
}
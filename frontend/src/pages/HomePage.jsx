import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ArrowOutwardRounded from "@mui/icons-material/ArrowOutwardRounded";
import NorthEastRounded from "@mui/icons-material/NorthEastRounded";
import GoldButton from "../components/GoldButton.jsx";
gsap.registerPlugin(ScrollTrigger);
const hero = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2200&q=88";
const detail = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1800&q=85";
const showroom = "https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&w=1600&q=85";
const divisions = [
  { n: "01", title: "Drive", sub: "Premium vehicle rentals", body: "The right vehicle, ready when you are. Flexible terms, considered service and a fleet worth looking back at.", to: "/vehicles", image: hero },
  { n: "02", title: "Own", sub: "Exceptional automobiles", body: "Explore a curated collection of vehicles selected for their character, condition and presence.", to: "/vehicles", image: detail },
  { n: "03", title: "Equip", sub: "Automotive essentials", body: "Thoughtful accessories and parts for the people who care about every detail of the drive.", to: "/shop", image: showroom }
];
const principles = [
  ["A considered collection", "Vehicles selected with purpose, not simply added to a list."],
  ["Service with precision", "Clear communication and support at every point of the journey."],
  ["Freedom to move", "Branch pickup and delivery options designed around your plans."]
];
export default function HomePage() {
  const pageRef = useRef(null);
  const heroRef = useRef(null);
  const reduceMotion = useReducedMotion();
  useLayoutEffect(() => {
    if (reduceMotion || !pageRef.current) return undefined;
    const context = gsap.context(() => {
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .from(".hero-kicker", { y: 18, opacity: 0, duration: 0.7 })
        .from(".hero-title-line", { yPercent: 110, opacity: 0, duration: 0.95, stagger: 0.12 }, "-=0.35")
        .from(".hero-copy, .hero-actions", { y: 20, opacity: 0, duration: 0.65, stagger: 0.12 }, "-=0.4")
        .from(".hero-visual", { scale: 1.08, opacity: 0, duration: 1.3 }, "-=0.9");
      gsap.utils.toArray(".reveal-section").forEach((section) => gsap.from(section, {
        y: 46, opacity: 0, duration: 0.85, ease: "power2.out",
        scrollTrigger: { trigger: section, start: "top 82%", once: true }
      }));
      gsap.to(".hero-visual img", { yPercent: 10, ease: "none",
        scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true } });
    }, pageRef);
    return () => context.revert();
  }, [reduceMotion]);
  return <main ref={pageRef}>
    <section className="hero" ref={heroRef}><div className="hero-grid">
      <div className="hero-content"><p className="eyebrow hero-kicker"><span className="eyebrow-line"/>THE ART OF THE AUTOMOTIVE</p>
        <h1 className="hero-title"><span className="hero-title-line">Driven</span><span className="hero-title-line title-outline">beyond</span><span className="hero-title-line">ordinary<span className="gold-period">.</span></span></h1>
        <p className="hero-copy">A more considered way to move. Discover exceptional vehicles, flexible rentals and automotive essentials, all in one place.</p>
        <div className="hero-actions"><GoldButton>Explore the collection</GoldButton><Link className="text-link" to="/services">Discover AutoLux <ArrowOutwardRounded fontSize="small"/></Link></div>
        <div className="hero-index"><span>01 / 03</span><span className="index-rule"/><span>THE AUTOLUX EXPERIENCE</span></div>
      </div>
      <div className="hero-visual"><img src={hero} alt="Sculpted sports coupe in dramatic studio lighting"/><div className="hero-image-shade"/>
        <div className="hero-image-caption"><span className="caption-dot"/>FORM FOLLOWS FEELING</div><div className="hero-vertical-label">AUTOMOTIVE / EST. FOR THE DRIVEN</div></div>
    </div><div className="hero-bottom"><span>UNITED STATES</span><span>RENT · OWN · EQUIP</span><span>SCROLL TO EXPLORE <i className="scroll-line"/></span></div></section>

    <section className="intro-section section-shell reveal-section" id="experience"><div className="section-heading"><p className="eyebrow">A DIFFERENT KIND OF AUTOMOTIVE COMPANY</p><h2>More than a destination.<br/><span>A way forward.</span></h2></div>
      <div className="intro-copy"><p>From the first search to the final mile, AutoLux brings the automotive experience together with clarity, care and a point of view.</p><Link className="underlined-link" to="/services">The AutoLux approach <NorthEastRounded fontSize="small"/></Link></div></section>

    <section className="division-section section-shell"><div className="section-topline reveal-section"><div><p className="eyebrow">THREE WAYS TO MOVE</p><h2 className="section-title">Find your <span>way.</span></h2></div><span className="section-count">01 — 03 / OUR DIVISIONS</span></div>
      <div className="division-grid">{divisions.map((item) => <motion.article className="division-card" key={item.n} whileHover={reduceMotion ? undefined : { y: -7 }} transition={{ duration: 0.25 }}>
        <Link to={item.to} className="division-image"><img src={item.image} alt="" loading="lazy"/><span className="division-number">{item.n}</span><span className="division-arrow"><ArrowOutwardRounded/></span></Link>
        <div className="division-meta">{item.sub}</div><h3>{item.title}<span>.</span></h3><p>{item.body}</p><Link to={item.to} className="card-link">Explore <ArrowOutwardRounded fontSize="small"/></Link>
      </motion.article>)}</div></section>

    <section className="manifesto-section"><div className="manifesto-image"><img src={detail} alt="Close detail of a premium performance vehicle" loading="lazy"/></div>
      <div className="manifesto-content reveal-section"><p className="eyebrow">THE DETAILS MAKE THE DRIVE</p><h2>Confidence is<br/>in every <span>detail.</span></h2>
        <p>Great automotive service should feel effortless. Clear choices, thoughtful support and a standard that never needs explaining.</p><GoldButton href="/services">Explore our services</GoldButton></div><span className="manifesto-watermark">AUTOLUX</span></section>

    <section className="principles-section section-shell reveal-section"><div className="principles-heading"><p className="eyebrow">THE AUTOLUX STANDARD</p><h2>Built around<br/><span>your journey.</span></h2></div>
      <div className="principles-list">{principles.map(([title, body], index) => <div className="principle-row" key={title}><span className="principle-number">0{index + 1}</span><div><h3>{title}</h3><p>{body}</p></div><NorthEastRounded/></div>)}</div></section>

    <section className="locations-section" id="locations"><div className="locations-inner section-shell reveal-section"><div><p className="eyebrow">WHEREVER THE ROAD LEADS</p><h2>Closer to<br/><span>your next drive.</span></h2></div>
      <div className="locations-copy"><p>With multiple locations across the United States and flexible delivery options, your next chapter starts closer than you think.</p><Link className="underlined-link" to="/contact">Talk with our team <NorthEastRounded fontSize="small"/></Link></div>
      <div className="map-art" aria-hidden="true"><div className="map-grid-lines"/><span className="map-pin pin-one"/><span className="map-pin pin-two"/><span className="map-pin pin-three"/><span className="map-route"/><span className="map-label">THE UNITED STATES</span></div></div></section>

    <section className="final-cta section-shell reveal-section"><div className="cta-overline">YOUR NEXT MOVE STARTS HERE</div><h2>Make room for<br/><span>something remarkable.</span></h2><GoldButton>Explore AutoLux</GoldButton><div className="cta-orbit" aria-hidden="true"/></section>
  </main>;
}
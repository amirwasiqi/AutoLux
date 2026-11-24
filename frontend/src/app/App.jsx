import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useLenis } from "../hooks/useLenis.js";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import HomePage from "../pages/HomePage.jsx";
import InfoPage from "../pages/InfoPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
function AnimatedRoutes() {
  const location = useLocation();
  return <AnimatePresence mode="wait"><motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.24 }}>
    <Routes location={location}><Route path="/" element={<HomePage/>}/><Route path="/vehicles" element={<InfoPage page="vehicles"/>}/>
      <Route path="/shop" element={<InfoPage page="shop"/>}/><Route path="/services" element={<InfoPage page="services"/>}/>
      <Route path="/contact" element={<InfoPage page="contact"/>}/><Route path="*" element={<NotFoundPage/>}/></Routes>
  </motion.div></AnimatePresence>;
}
export default function App() {
  useLenis();
  return <><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader/><div id="main-content"><AnimatedRoutes/></div><SiteFooter/></>;
}
import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider } from "../auth/AuthContext.jsx";
import RequireAuth from "../auth/RequireAuth.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import RegisterPage from "../pages/RegisterPage.jsx";
import AccountPage from "../pages/AccountPage.jsx";
import { RegistrationSuccessPage, ForbiddenPage, PlaceholderPage } from "../pages/InfoPages.jsx";
import { useLenis } from "../hooks/useLenis.js";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import HomePage from "../pages/HomePage.jsx";
import InfoPage from "../pages/InfoPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import VehiclesPage from "../pages/VehiclesPage.jsx";
import VehicleDetailPage from "../pages/VehicleDetailPage.jsx";
import FleetManagementPage from "../pages/FleetManagementPage.jsx";
import AdminDashboardPage from "../pages/AdminDashboardPage.jsx";
import BookingPage from "../pages/BookingPage.jsx";
import AdminBookingsPage from "../pages/AdminBookingsPage.jsx";
import AdminControlPage from "../pages/AdminControlPage.jsx";
import ShopPage from "../pages/ShopPage.jsx";
import PaymentResultPage from "../pages/PaymentResultPage.jsx";
import DriverVerificationPage from "../pages/DriverVerificationPage.jsx";
import SalesPage from "../pages/SalesPage.jsx";
import PartnerPortalPage from "../pages/PartnerPortalPage.jsx";
import CommercialAdminPage from "../pages/CommercialAdminPage.jsx";
import { VerifyEmailPage, ForgotPasswordPage, ResetPasswordPage } from "../pages/AccountRecoveryPages.jsx";

function AnimatedRoutes() {
  const location = useLocation();
  return <AnimatePresence mode="wait"><motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.24 }}>
    <Routes location={location}>
      <Route path="/" element={<HomePage />} />
      <Route path="/vehicles" element={<VehiclesPage />} />
      <Route path="/vehicles/:slug" element={<VehicleDetailPage />} />
      <Route element={<RequireAuth />}><Route path="/vehicles/:slug/book" element={<BookingPage />} /></Route>
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/sales" element={<SalesPage />} />
      <Route element={<RequireAuth />}><Route path="/partner" element={<PartnerPortalPage />} /></Route>
      <Route path="/payment/success" element={<PaymentResultPage />} />
      <Route path="/payment/cancel" element={<InfoPage page="payment-cancel" />} />
      <Route path="/services" element={<InfoPage page="services" />} />
      <Route path="/contact" element={<InfoPage page="contact" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/registration-success" element={<RegistrationSuccessPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route element={<RequireAuth />}><Route path="/account" element={<AccountPage />} /></Route>
      <Route element={<RequireAuth roles={["super_admin", "company_admin"]} />}><Route path="/admin" element={<AdminControlPage />} /></Route>
      <Route element={<RequireAuth roles={["super_admin", "company_admin", "driver_verification_staff"]} />}><Route path="/admin/drivers" element={<DriverVerificationPage />} /></Route>
      <Route element={<RequireAuth roles={["super_admin","company_admin","sales_manager","shop_manager","finance_staff","branch_manager","fleet_manager","rental_staff"]} />}><Route path="/admin/commercial" element={<CommercialAdminPage />} /></Route>
      <Route element={<RequireAuth roles={["super_admin", "company_admin", "fleet_manager"]} />}><Route path="/admin/fleet" element={<FleetManagementPage />} /></Route>
      <Route element={<RequireAuth roles={["super_admin", "company_admin", "fleet_manager", "rental_staff"]} />}><Route path="/admin/bookings" element={<AdminBookingsPage />} /></Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </motion.div></AnimatePresence>;
}

export default function App() {
  useLenis();
  return <AuthProvider><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader /><div id="main-content"><AnimatedRoutes /></div><SiteFooter /></AuthProvider>;
}

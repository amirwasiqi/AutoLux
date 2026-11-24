import { Link } from "react-router-dom";
import { Button, Container } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
const pages = {
  vehicles: ["THE COLLECTION", "Exceptional vehicles. A considered selection.", "Vehicle discovery is being prepared for Phase 3. Rental and purchase listings will share a polished browsing experience while keeping their transaction journeys distinct."],
  shop: ["AUTOMOTIVE ESSENTIALS", "The details that complete the drive.", "AutoLux automotive products, accessories and parts will arrive with the Phase 5 commerce experience."],
  services: ["THE AUTOLUX STANDARD", "Thoughtful service, from first mile to last.", "Explore rental support, vehicle delivery, sales assistance and automotive product services. Detailed service booking will be introduced in later phases."],
  contact: ["START A CONVERSATION", "Let's talk about your next move.", "Company contact details and the inquiry workflow will be configured before launch. Contact details in this foundation preview are placeholders."]
};
export default function InfoPage({ page }) {
  const [eyebrow, title, body] = pages[page];
  return <Container maxWidth="lg" className="info-page"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{body}</p>
    <Button component={Link} to="/" variant="outlined" color="primary" startIcon={<ArrowBackRounded/>}>Back to AutoLux</Button></Container>;
}
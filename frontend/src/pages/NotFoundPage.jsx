import { Link } from "react-router-dom";
export default function NotFoundPage() {
  return <main className="not-found"><span className="eyebrow">404 / OFF THE MAP</span><h1>This road<br/><span>ends here.</span></h1><p>The page you're looking for isn't available.</p><Link to="/" className="text-link">Return to AutoLux ↗</Link></main>;
}
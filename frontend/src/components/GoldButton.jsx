import { Button } from "@mui/material";
import ArrowOutwardRounded from "@mui/icons-material/ArrowOutwardRounded";
import { Link } from "react-router-dom";
export default function GoldButton({ children = "Explore the collection", href = "/vehicles", variant = "contained", ...props }) {
  return <Button component={Link} to={href} className={`autolux-gold-button ${props.className || ''}`} variant={variant} color="primary" endIcon={<ArrowOutwardRounded/>} {...props}>{children}</Button>;
}

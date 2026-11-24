import { Button } from "@mui/material";
import ArrowOutwardRounded from "@mui/icons-material/ArrowOutwardRounded";
export default function GoldButton({ children, href = "/vehicles", variant = "contained", ...props }) {
  return <Button component="a" href={href} variant={variant} color="primary" endIcon={<ArrowOutwardRounded/>} {...props}>{children}</Button>;
}

import { Box, Container, Typography } from '@mui/material';

export default function AuthLayout({ eyebrow = 'THE AUTOLUX EXPERIENCE', title, subtitle, children }) {
  return (
    <Box sx={{
      minHeight:'100vh', display:'grid', placeItems:'center', py:6, px:2,
      background:'radial-gradient(ellipse at 50% 0%, rgba(193,151,76,.15), transparent 42%), #090909',
      color:'#f7f4ee'
    }}>
      <Container maxWidth="sm">
        <Typography align="center" sx={{ color:'#c9a35f', letterSpacing:'.28em', fontSize:12, mb:2 }}>
          AUTOLUX
        </Typography>
        <Box sx={{ border:'1px solid rgba(201,163,95,.24)', borderRadius:3, p:{xs:3,sm:5},
          background:'rgba(20,20,20,.94)', boxShadow:'0 28px 90px rgba(0,0,0,.4)' }}>
          <Typography sx={{ color:'#c9a35f', letterSpacing:'.16em', fontSize:10, mb:1 }}>{eyebrow}</Typography>
          <Typography variant="h4" fontWeight={700} mb={1}>{title}</Typography>
          <Typography color="grey.400" mb={3}>{subtitle}</Typography>
          {children}
        </Box>
      </Container>
    </Box>
  );
}

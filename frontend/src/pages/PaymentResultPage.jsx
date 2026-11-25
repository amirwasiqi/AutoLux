import {useEffect,useState} from 'react';
import {Alert,Button,Container,Stack,Typography} from '@mui/material';
import {Link,useLocation} from 'react-router-dom';
import {api} from '../api/client.js';
export default function PaymentResultPage(){
 const location=useLocation();const [status,setStatus]=useState('checking');const [message,setMessage]=useState('Checking payment confirmation…');
 useEffect(()=>{const params=new URLSearchParams(location.search);const id=params.get('transaction_id');if(!id){setStatus('unknown');setMessage('The payment reference is missing. Check your account payment history.');return;}let active=true;(async()=>{try{if(params.has('token')){await api.post('/payments/paypal/capture',{transactionId:id});}const {data}=await api.get(`/payments/transactions/${id}`);if(!active)return;setStatus(data.data.status);setMessage(data.data.status==='succeeded'?'Your payment has been confirmed.':`Payment status: ${data.data.status}.`);}catch(e){if(active){setStatus('pending');setMessage(e.response?.data?.error?.message||'Payment confirmation is pending. Your account will update when the provider webhook is received.');}}})();return()=>{active=false;};},[location.search]);
 return <Container maxWidth="sm" sx={{pt:18,pb:10}}><Stack spacing={2}><Typography variant="overline" color="warning.main">AUTOLUX PAYMENTS</Typography><Typography variant="h3">Payment status</Typography><Alert severity={status==='succeeded'?'success':status==='checking'?'info':'warning'}>{message}</Alert><Button component={Link} to="/account" variant="contained">Return to your account</Button><Button component={Link} to="/shop">Continue shopping</Button></Stack></Container>;
}

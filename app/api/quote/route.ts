import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getUser} from '@/lib/session';
import {getConnection} from '@/lib/alpaca-oauth';
import {alpacaQuote,AlpacaApiError} from '@/lib/alpaca';

export async function GET(req:Request){
  const user=await getUser();
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
  const connection=await getConnection(user.id);
  if(!connection)return NextResponse.json({error:'Connect your Alpaca account first',code:'ALPACA_NOT_CONNECTED'},{status:409});
  const s=new URL(req.url).searchParams.get('symbol')||'';
  try{
    const symbol=z.string().regex(/^[A-Z.]{1,8}$/).parse(s.toUpperCase());
    return NextResponse.json(await alpacaQuote(connection.accessToken,symbol));
  }catch(error){
    console.error('Alpaca quote failed',error);
    const status=error instanceof AlpacaApiError&&error.status===401?401:400;
    return NextResponse.json({error:status===401?'Failed to authenticate with Alpaca account':error instanceof Error?error.message:'Invalid symbol',code:status===401?'ALPACA_AUTH_FAILED':'ALPACA_QUOTE_FAILED'},{status});
  }
}

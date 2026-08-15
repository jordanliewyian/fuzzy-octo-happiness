import {NextResponse} from 'next/server';
import {getUser} from '@/lib/session';
import {getConnection} from '@/lib/alpaca-oauth';
import {alpacaAccount,AlpacaApiError} from '@/lib/alpaca';

export async function GET(){
  const user=await getUser();
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const connection=await getConnection(user.id);
  if(!connection) return NextResponse.json({error:'Connect your Alpaca account first',code:'ALPACA_NOT_CONNECTED'},{status:409});
  try{return NextResponse.json({account:await alpacaAccount(connection.accessToken,connection.environment)})}
  catch(error){
    console.error('Alpaca account request failed',error);
    const status=error instanceof AlpacaApiError&&error.status===401?401:502;
    return NextResponse.json({error:status===401?'Failed to authenticate with Alpaca account':'Failed to load Alpaca account',code:status===401?'ALPACA_AUTH_FAILED':'ALPACA_ACCOUNT_FAILED'},{status});
  }
}

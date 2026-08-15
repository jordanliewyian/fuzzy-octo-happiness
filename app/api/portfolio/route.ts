import {NextResponse} from 'next/server';
import {getUser} from '@/lib/session';
import {alpacaAccount,isAlpacaAuthError} from '@/lib/alpaca';

export async function GET(){
  if(!await getUser())return NextResponse.json({error:'Unauthorized'},{status:401});
  try{
    return NextResponse.json({account:await alpacaAccount()});
  }catch(error){
    if(isAlpacaAuthError(error)){
      console.error('Alpaca authentication failed while loading account');
      return NextResponse.json({error:'Failed to sign in to Alpaca account',code:'ALPACA_AUTH_FAILED'},{status:502});
    }
    console.error('Alpaca account request failed',error);
    return NextResponse.json({error:'Failed to load Alpaca account',code:'ALPACA_ACCOUNT_UNAVAILABLE'},{status:502});
  }
}

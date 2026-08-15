import {NextResponse} from 'next/server';
import {getUser} from '@/lib/session';
import {alpacaPositions,isAlpacaAuthError} from '@/lib/alpaca';

export async function GET(){
  if(!await getUser())return NextResponse.json({error:'Unauthorized'},{status:401});
  try{
    return NextResponse.json({positions:await alpacaPositions()});
  }catch(error){
    if(isAlpacaAuthError(error)){
      console.error('Alpaca authentication failed while loading positions');
      return NextResponse.json({error:'Failed to sign in to Alpaca account',code:'ALPACA_AUTH_FAILED'},{status:502});
    }
    console.error('Alpaca positions request failed',error);
    return NextResponse.json({error:'Failed to load Alpaca positions',code:'ALPACA_POSITIONS_UNAVAILABLE'},{status:502});
  }
}

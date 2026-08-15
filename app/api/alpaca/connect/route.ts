import {NextResponse} from 'next/server';
import {getUser} from '@/lib/session';
import {buildAuthorizationUrl,createOAuthState,alpacaRedirectUri} from '@/lib/alpaca-oauth';

export async function GET(req:Request){
  const user=await getUser();
  if(!user) return NextResponse.redirect(new URL('/?error=unauthorized',req.url));
  try{
    const state=await createOAuthState(user.id);
    const url=buildAuthorizationUrl(alpacaRedirectUri(new URL(req.url).origin),state);
    return NextResponse.redirect(url);
  }catch(error){
    console.error('Alpaca OAuth start failed',error);
    return NextResponse.redirect(new URL('/?alpaca_error=not_configured',req.url));
  }
}

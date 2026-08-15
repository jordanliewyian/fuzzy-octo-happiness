import {NextResponse} from 'next/server';
import {alpacaRedirectUri,consumeOAuthState,exchangeCode,fetchAlpacaAccount,saveConnection,type AlpacaEnvironment} from '@/lib/alpaca-oauth';

export async function GET(req:Request){
  const url=new URL(req.url);
  const code=url.searchParams.get('code');
  const state=url.searchParams.get('state');
  const error=url.searchParams.get('error');
  if(error) return NextResponse.redirect(new URL('/?alpaca_error=denied',url.origin));
  if(!code||!state) return NextResponse.redirect(new URL('/?alpaca_error=invalid_callback',url.origin));
  try{
    const userId=await consumeOAuthState(state);
    if(!userId) return NextResponse.redirect(new URL('/?alpaca_error=invalid_state',url.origin));
    const redirectUri=alpacaRedirectUri(url.origin);
    const {accessToken,scope}=await exchangeCode(code,redirectUri);
    const environment=(process.env.ALPACA_OAUTH_ENV||'paper') as AlpacaEnvironment;
    const account=await fetchAlpacaAccount(accessToken,environment);
    await saveConnection(userId,accessToken,scope,environment,String(account.id));
    return NextResponse.redirect(new URL('/?alpaca=connected',url.origin));
  }catch(error){
    console.error('Alpaca OAuth callback failed',error);
    return NextResponse.redirect(new URL('/?alpaca_error=connection_failed',url.origin));
  }
}

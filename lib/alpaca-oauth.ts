import {decryptSecret,encryptSecret} from './crypto';
import {sql} from './db';
import {randomToken} from './password';

export type AlpacaEnvironment='paper'|'live';

const authorizeUrl='https://app.alpaca.markets/oauth/authorize';
const tokenUrl='https://api.alpaca.markets/oauth/token';

export function alpacaTradingBase(environment:AlpacaEnvironment){
  return environment==='live'?'https://api.alpaca.markets':'https://paper-api.alpaca.markets';
}

export function alpacaDataBase(){
  return process.env.ALPACA_DATA_URL||'https://data.alpaca.markets';
}

function clientConfig(){
  const clientId=process.env.ALPACA_CLIENT_ID;
  const clientSecret=process.env.ALPACA_CLIENT_SECRET;
  if(!clientId||!clientSecret) throw new Error('Alpaca OAuth is not configured');
  return {clientId,clientSecret};
}

export function alpacaRedirectUri(origin:string){
  return process.env.ALPACA_OAUTH_REDIRECT_URI||`${origin}/api/alpaca/callback`;
}

export function buildAuthorizationUrl(redirectUri:string,state:string){
  const {clientId}=clientConfig();
  const url=new URL(authorizeUrl);
  url.searchParams.set('response_type','code');
  url.searchParams.set('client_id',clientId);
  url.searchParams.set('redirect_uri',redirectUri);
  url.searchParams.set('state',state);
  url.searchParams.set('scope',process.env.ALPACA_OAUTH_SCOPES||'trading data');
  url.searchParams.set('env',process.env.ALPACA_OAUTH_ENV||'paper');
  return url.toString();
}

export async function createOAuthState(userId:string){
  const state=randomToken();
  await sql`insert into alpaca_oauth_states(state,user_id,expires_at) values(${state},${userId},now()+interval '10 minutes')`;
  return state;
}

export async function consumeOAuthState(state:string){
  const rows=await sql`delete from alpaca_oauth_states where state=${state} and expires_at>now() returning user_id`;
  return rows[0]?.user_id as string|undefined;
}

export async function exchangeCode(code:string,redirectUri:string){
  const {clientId,clientSecret}=clientConfig();
  const body=new URLSearchParams({grant_type:'authorization_code',code,client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri});
  const response=await fetch(tokenUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,cache:'no-store'});
  const text=await response.text();
  let payload:any;try{payload=JSON.parse(text)}catch{payload={message:text}}
  if(!response.ok) throw new Error(payload.error_description||payload.message||'Alpaca OAuth token exchange failed');
  if(!payload.access_token) throw new Error('Alpaca OAuth returned no access token');
  return {accessToken:String(payload.access_token),scope:String(payload.scope||'')};
}

export async function fetchAlpacaAccount(accessToken:string,environment:AlpacaEnvironment){
  const response=await fetch(`${alpacaTradingBase(environment)}/v2/account`,{headers:{Authorization:`Bearer ${accessToken}`},cache:'no-store'});
  const text=await response.text();
  let payload:any;try{payload=JSON.parse(text)}catch{payload={message:text}}
  if(!response.ok) throw new Error(payload.message||'Failed to load Alpaca account');
  return payload;
}

export async function saveConnection(userId:string,accessToken:string,scope:string,environment:AlpacaEnvironment,accountId:string){
  const encrypted=encryptSecret(accessToken);
  await sql`insert into alpaca_connections(user_id,account_id,environment,access_token_encrypted,scope) values(${userId},${accountId},${environment},${encrypted},${scope}) on conflict(user_id) do update set account_id=excluded.account_id,environment=excluded.environment,access_token_encrypted=excluded.access_token_encrypted,scope=excluded.scope,updated_at=now()`;
}

export async function getConnection(userId:string){
  const rows=await sql`select account_id,environment,access_token_encrypted,scope from alpaca_connections where user_id=${userId} limit 1`;
  if(!rows[0]) return null;
  return {accountId:String(rows[0].account_id),environment:String(rows[0].environment) as AlpacaEnvironment,accessToken:decryptSecret(String(rows[0].access_token_encrypted)),scope:String(rows[0].scope||'')};
}

export async function disconnect(userId:string){
  await sql`delete from alpaca_connections where user_id=${userId}`;
}

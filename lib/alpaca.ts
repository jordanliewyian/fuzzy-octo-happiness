import {alpacaDataBase,alpacaTradingBase,type AlpacaEnvironment} from './alpaca-oauth';

export class AlpacaApiError extends Error{
  constructor(public status:number,message:string){super(message);this.name='AlpacaApiError'}
}

async function request(url:string,accessToken:string,init:RequestInit={}){
  const r=await fetch(url,{...init,headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json',...(init.headers||{})},cache:'no-store'});
  const text=await r.text();let body:any;try{body=JSON.parse(text)}catch{body={message:text}};
  if(!r.ok) throw new AlpacaApiError(r.status,body.message||body.error||'Alpaca request failed');
  return body;
}

export const alpacaAccount=(accessToken:string,environment:AlpacaEnvironment)=>request(`${alpacaTradingBase(environment)}/v2/account`,accessToken);
export const alpacaPositions=(accessToken:string,environment:AlpacaEnvironment)=>request(`${alpacaTradingBase(environment)}/v2/positions`,accessToken);
export const alpacaOrder=(accessToken:string,environment:AlpacaEnvironment,o:any)=>request(`${alpacaTradingBase(environment)}/v2/orders`,accessToken,{method:'POST',body:JSON.stringify(o)});
export const alpacaQuote=async(accessToken:string,symbol:string)=>{const j=await request(`${alpacaDataBase()}/v2/stocks/${encodeURIComponent(symbol)}/quotes/latest?feed=iex`,accessToken);return {symbol,bid:j.quote?.bp,ask:j.quote?.ap,price:j.quote?.ap||j.quote?.bp}};

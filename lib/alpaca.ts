const base=process.env.ALPACA_BASE_URL||'https://paper-api.alpaca.markets';
const data=process.env.ALPACA_DATA_URL||'https://data.alpaca.markets';
const headers={'APCA-API-KEY-ID':process.env.ALPACA_API_KEY||'','APCA-API-SECRET-KEY':process.env.ALPACA_API_SECRET||''};

export class AlpacaApiError extends Error{
  status:number;
  code?:string;
  constructor(status:number,message:string,code?:string){
    super(message);
    this.name='AlpacaApiError';
    this.status=status;
    this.code=code;
  }
}

export function isAlpacaAuthError(error:unknown):boolean{
  return error instanceof AlpacaApiError && (error.status===401||error.status===403);
}

async function request(url:string,init:RequestInit={}):Promise<any>{
  const r=await fetch(url,{...init,headers:{...headers,...(init.headers||{})},cache:'no-store'});
  const text=await r.text();
  let body:any;
  try{body=JSON.parse(text)}catch{body={message:text}}
  if(!r.ok)throw new AlpacaApiError(r.status,body.message||'Alpaca request failed',body.code);
  return body;
}

export const alpacaAccount=()=>request(`${base}/v2/account`);
export const alpacaPositions=()=>request(`${base}/v2/positions`);
export const alpacaOrder=(o:any)=>request(`${base}/v2/orders`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)});
export const alpacaQuote=async(symbol:string)=>{const j=await request(`${data}/v2/stocks/${encodeURIComponent(symbol)}/quotes/latest?feed=iex`);return {symbol,bid:j.quote?.bp,ask:j.quote?.ap,price:j.quote?.ap||j.quote?.bp}};

const base=process.env.ALPACA_BASE_URL||'https://paper-api.alpaca.markets';const data=process.env.ALPACA_DATA_URL||'https://data.alpaca.markets';const headers={'APCA-API-KEY-ID':process.env.ALPACA_API_KEY||'','APCA-API-SECRET-KEY':process.env.ALPACA_API_SECRET||''}
async function request(url:string,init:RequestInit={}){const r=await fetch(url,{...init,headers:{...headers,...(init.headers||{})},cache:'no-store'});const text=await r.text();let body:any;try{body=JSON.parse(text)}catch{body={message:text}};if(!r.ok)throw new Error(body.message||'Alpaca request failed');return body}
export const alpacaAccount=()=>request(`${base}/v2/account`)
export const alpacaPositions=()=>request(`${base}/v2/positions`)
export const alpacaOrder=(o:any)=>request(`${base}/v2/orders`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)})
export const alpacaQuote=async(symbol:string)=>{const j=await request(`${data}/v2/stocks/${encodeURIComponent(symbol)}/quotes/latest?feed=iex`);return {symbol,bid:j.quote?.bp,ask:j.quote?.ap,price:j.quote?.ap||j.quote?.bp}}

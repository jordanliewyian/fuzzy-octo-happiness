import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getUser} from '@/lib/session';
import {getConnection} from '@/lib/alpaca-oauth';
import {alpacaOrder,AlpacaApiError} from '@/lib/alpaca';

const schema=z.object({symbol:z.string().regex(/^[A-Z.]{1,8}$/),side:z.enum(['buy','sell']),qty:z.number().positive().finite()});

export async function POST(req:Request){
  const user=await getUser();
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
  const connection=await getConnection(user.id);
  if(!connection)return NextResponse.json({error:'Connect your Alpaca account first',code:'ALPACA_NOT_CONNECTED'},{status:409});
  try{
    const b=schema.parse(await req.json());
    const o=await alpacaOrder(connection.accessToken,connection.environment,{symbol:b.symbol,side:b.side,type:'market',time_in_force:'day',qty:String(b.qty)});
    return NextResponse.json({order:o});
  }catch(error:any){
    console.error('Alpaca order failed',error);
    const status=error instanceof AlpacaApiError&&error.status===401?401:400;
    return NextResponse.json({error:status===401?'Failed to authenticate with Alpaca account':error?.message||'Order failed',code:status===401?'ALPACA_AUTH_FAILED':'ALPACA_ORDER_FAILED'},{status});
  }
}

import {NextResponse} from 'next/server';
import {getUser} from '@/lib/session';
import {getConnection} from '@/lib/alpaca-oauth';

export async function GET(){
  const user=await getUser();
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const connection=await getConnection(user.id);
  return NextResponse.json({connected:Boolean(connection),environment:connection?.environment||null,accountId:connection?.accountId||null,scope:connection?.scope||null});
}

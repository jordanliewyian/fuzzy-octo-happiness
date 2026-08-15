import {NextResponse} from 'next/server';
import {getUser} from '@/lib/session';
import {disconnect} from '@/lib/alpaca-oauth';

export async function POST(){
  const user=await getUser();
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  await disconnect(user.id);
  return NextResponse.json({ok:true});
}

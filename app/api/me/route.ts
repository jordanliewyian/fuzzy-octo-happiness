import {NextResponse} from 'next/server';import {getUser} from '@/lib/session';export async function GET(){const user=await getUser();return NextResponse.json({user},{status:user?200:401})}

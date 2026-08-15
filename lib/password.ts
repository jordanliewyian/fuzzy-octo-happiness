import {createHash,randomBytes,scrypt as _scrypt,timingSafeEqual} from 'crypto'
import {promisify} from 'util'
const scrypt=promisify(_scrypt)
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64) as Buffer;return `${salt}:${key.toString('hex')}`}
export async function verifyPassword(password:string,stored:string){const [salt,hex]=stored.split(':');if(!salt||!hex)return false;const key=await scrypt(password,salt,64) as Buffer;return timingSafeEqual(key,Buffer.from(hex,'hex'))}
export function randomToken(){return randomBytes(32).toString('hex')}

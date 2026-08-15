import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';

function key(){
  const raw=process.env.APP_ENCRYPTION_KEY;
  if(!raw) throw new Error('APP_ENCRYPTION_KEY is not configured');
  const value=Buffer.from(raw,'base64');
  if(value.length!==32) throw new Error('APP_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  return value;
}

export function encryptSecret(value:string){
  const iv=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',key(),iv);
  const ciphertext=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  const tag=cipher.getAuthTag();
  return [iv,tag,ciphertext].map(v=>v.toString('base64')).join('.');
}

export function decryptSecret(value:string){
  const parts=value.split('.');
  if(parts.length!==3) throw new Error('Invalid encrypted secret');
  const [iv,tag,ciphertext]=parts.map(v=>Buffer.from(v,'base64'));
  const decipher=createDecipheriv('aes-256-gcm',key(),iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext),decipher.final()]).toString('utf8');
}

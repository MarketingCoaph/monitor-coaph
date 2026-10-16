import postgres from 'postgres';

let client;
export function db(){
  if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurada');
  client ||= postgres(process.env.DATABASE_URL,{ssl:'require',max:1,prepare:false,idle_timeout:10,connect_timeout:15});
  return client;
}

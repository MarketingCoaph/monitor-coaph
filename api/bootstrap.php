<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8'); header('X-Content-Type-Options: nosniff');
$configFile=__DIR__.'/config.php'; if(!file_exists($configFile))$configFile=__DIR__.'/config.example.php'; $CONFIG=require $configFile;
date_default_timezone_set($CONFIG['APP_TIMEZONE']??'America/Sao_Paulo');
function db():PDO {
 global $CONFIG;
 static $pdo;
 if (!$pdo) {
  $driver=$CONFIG['DB_DRIVER']??'mysql';
  if ($driver==='pgsql') {
   $dsn='pgsql:host='.$CONFIG['DB_HOST'].';port='.($CONFIG['DB_PORT']??5432).';dbname='.$CONFIG['DB_NAME'].';sslmode='.($CONFIG['DB_SSLMODE']??'require').';connect_timeout=10';
  } else {
   $dsn='mysql:host='.$CONFIG['DB_HOST'].';dbname='.$CONFIG['DB_NAME'].';charset=utf8mb4';
  }
  $pdo=new PDO($dsn,$CONFIG['DB_USER'],$CONFIG['DB_PASSWORD'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
  if ($driver==='pgsql') $pdo->exec("SET TIME ZONE 'America/Sao_Paulo'; SET search_path TO public");
 }
 return $pdo;
}
function isPostgres():bool { return db()->getAttribute(PDO::ATTR_DRIVER_NAME)==='pgsql'; }
function insertedId(PDO $p,string $table):string|false { return $p->lastInsertId(isPostgres()?$table.'_id_seq':null); }
function respond(mixed $data=null,int $code=200):never{http_response_code($code);echo json_encode(['success'=>$code<400,'data'=>$data],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function fail(string $message,int $code=400):never{http_response_code($code);echo json_encode(['success'=>false,'message'=>$message],JSON_UNESCAPED_UNICODE);exit;}
function body():array{$v=json_decode(file_get_contents('php://input'),true);return is_array($v)?$v:[];} function method():string{return $_SERVER['REQUEST_METHOD']??'GET';} function clean(?string $v):string{return trim(strip_tags((string)$v));}
function requireFields(array $d,array $fields):void{foreach($fields as $f)if(!isset($d[$f])||trim((string)$d[$f])==='')fail("Campo obrigatório: $f");}
set_exception_handler(function(Throwable $e){global $CONFIG;$msg=($CONFIG['APP_ENV']??'production')==='development'?$e->getMessage():'Não foi possível concluir a operação.';fail($msg,500);});

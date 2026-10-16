<?php
require dirname(__DIR__).'/bootstrap.php';
require dirname(__DIR__).'/lib/monitor.php';
global $CONFIG;
if(PHP_SAPI!=='cli'&&(empty($CONFIG['CRON_SECRET'])||!hash_equals((string)$CONFIG['CRON_SECRET'],(string)($_GET['key']??''))))fail('Não autorizado',401);
$p=db();
$sources=$p->query('SELECT * FROM sources WHERE active=1')->fetchAll();
$terms=$p->query('SELECT * FROM search_terms WHERE active=1')->fetchAll();
$entities=$p->query('SELECT * FROM case_entities WHERE active=1')->fetchAll();
$startDate=(string)($p->query("SELECT setting_value FROM settings WHERE setting_key='monitor_start_date'")->fetchColumn()?:date('Y-m-d',strtotime('-7 days')));
$cutoff=strtotime($startDate.' 00:00:00');
$summary=['sources'=>0,'queries'=>0,'found'=>0,'new'=>0,'ignored_before_start'=>0,'errors'=>0];
foreach($sources as$s){
 $isGoogle=str_contains(strtolower(parse_url($s['url'],PHP_URL_HOST)?:''),'news.google.');
 $jobs=$isGoogle?$terms:[['term'=>'','weight'=>0]];
 foreach($jobs as$t){
  $term=(string)$t['term'];$weight=(int)$t['weight'];$found=$new=$rel=$rev=$discard=0;
  try{
   $url=$isGoogle?feedUrlForTerm($s['url'],$term,$startDate):$s['url'];$raw=fetchUrl($url);if($raw===false)throw new RuntimeException('Falha ao baixar feed');
   foreach(parseFeed($raw)as$i){
    $published=strtotime($i['published_at']);if($published!==false&&$published<$cutoff){$summary['ignored_before_start']++;continue;}
    $summary['found']++;$found++;if(!$i['title']||!$i['url'])continue;
    $canonical=normalizeUrl($i['url']);$hash=hash('sha256',mb_strtolower($i['title']).'|'.parse_url($canonical,PHP_URL_HOST));
    $dupe=$p->prepare('SELECT id FROM news WHERE canonical_url=? OR content_hash=? LIMIT 1');$dupe->execute([$canonical,$hash]);if($dupe->fetch())continue;
    $hay=$i['title'].' '.$i['description'];[$score,$status,$reason,$matched]=analyze($hay,$entities,$weight,$term);$domain=parse_url($canonical,PHP_URL_HOST)?:'';
    $st=$p->prepare('INSERT INTO news(title,description,url,canonical_url,source_name,source_domain,published_at,image_url,status,is_new,is_read,category,search_term,content_hash,relevance_score,relevance_status,relevance_reason,analysis_source,matched_entities) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $st->execute([$i['title'],$i['description'],$i['url'],$canonical,$s['name'],$domain,$i['published_at'],$i['image_url'],'active',1,0,'Notícia',$term,$hash,$score,$status,$reason,'metadata',json_encode($matched,JSON_UNESCAPED_UNICODE)]);
    $summary['new']++;$new++;if($status==='related')$rel++;elseif($status==='possibly_related')$rev++;else$discard++;
   }
   $p->prepare('INSERT INTO monitor_logs(source_id,search_term,status,total_results,new_results,related_results,review_results,discarded_results,message) VALUES(?,?,?,?,?,?,?,?,?)')->execute([$s['id'],$term?:null,'success',$found,$new,$rel,$rev,$discard,'Feed processado desde '.$startDate]);$summary['queries']++;
  }catch(Throwable$e){$summary['errors']++;$p->prepare('INSERT INTO monitor_logs(source_id,search_term,status,message) VALUES(?,?,?,?)')->execute([$s['id'],$term?:null,'error',mb_substr($e->getMessage(),0,500)]);}
 }
 $p->prepare('UPDATE sources SET last_checked_at=NOW() WHERE id=?')->execute([$s['id']]);$summary['sources']++;
}
if(PHP_SAPI==='cli'){echo json_encode($summary,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE).PHP_EOL;exit;}
respond($summary);

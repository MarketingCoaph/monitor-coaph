<?php
function normalizeUrl(string $url):string{$p=parse_url($url);if(!$p||empty($p['host']))return $url;$query=[];parse_str($p['query']??'',$query);foreach(['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid']as$k)unset($query[$k]);ksort($query);return strtolower($p['scheme']??'https').'://'.strtolower($p['host']).rtrim($p['path']??'/','/').($query?'?'.http_build_query($query):'');}
function fetchUrl(string $url):string|false{$ch=curl_init($url);curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>true,CURLOPT_TIMEOUT=>20,CURLOPT_CONNECTTIMEOUT=>8,CURLOPT_USERAGENT=>'COAPH News Monitor/1.0',CURLOPT_MAXREDIRS=>4]);$v=curl_exec($ch);$ok=curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);return $ok>=200&&$ok<400?$v:false;}
function parseFeed(string $xml):array{libxml_use_internal_errors(true);$s=simplexml_load_string($xml,'SimpleXMLElement',LIBXML_NOCDATA);if(!$s)return[];$out=[];$nodes=isset($s->channel->item)?$s->channel->item:$s->entry;foreach($nodes as$i){$link=(string)$i->link;if(!$link&&isset($i->link['href']))$link=(string)$i->link['href'];$media=$i->children('media',true);$desc=(string)$i->description?:((string)$i->summary?:(string)$i->content);$date=(string)$i->pubDate?:((string)$i->published?:(string)$i->updated);$out[]=['title'=>trim((string)$i->title),'url'=>trim($link),'description'=>trim(strip_tags($desc)),'published_at'=>date('Y-m-d H:i:s',strtotime($date)?:time()),'image_url'=>(string)($media->content['url']??$media->thumbnail['url']??'')];}return$out;}
function analyze(string $text,array $entities,int $termWeight,string $discoveryTerm=''):array{
 $norm=mb_strtolower(iconv('UTF-8','ASCII//TRANSLIT',$text)?:$text);$matched=[];$entityScore=0;
 $coaph=str_contains($norm,'coaph')||str_contains($norm,'cooperativa de atendimento pre e hospitalar');
 $invest=(bool)preg_match('/investiga|operacao|policia federal|\bpf\b|apuracao|fraude|desvio|mandado|prisao|preso|judicial|justica/',$norm);
 $health=(bool)preg_match('/saude|hospital|medic|cooperativa|recurso publico/',$norm);$person=false;
 foreach($entities as$e){if($e['normalized_name']!==''&&str_contains($norm,$e['normalized_name'])){$matched[]=$e['name'];$entityScore=max($entityScore,(int)$e['relevance_weight']);if($e['type']==='pessoa')$person=true;}}
 $score=$entityScore+(int)round($termWeight/2);if($invest)$score+=15;if($health)$score+=8;if($coaph&&$invest)$score+=30;if($person&&$invest&&$health)$score+=20;if(count(array_unique($matched))>=2)$score+=10;
 // Regra de contenção: mencionar COAPH ou uma pessoa, sem contexto da investigação atual,
 // nunca é suficiente para entrar no feed principal nem na fila de revisão.
 if(!$invest){$score=min(39,$score);$status='unrelated';}
 else{$score=min(100,max(0,$score));$status=$score>=70?'related':($score>=40?'possibly_related':'unrelated');}
 $labels=[];if($coaph)$labels[]='COAPH';if($person)$labels[]='pessoa ligada ao caso';if($invest)$labels[]='contexto investigativo';if($health)$labels[]='setor de saúde';
 $reason=($status==='related'?'Alta relevância: ':($status==='possibly_related'?'Possivelmente relacionada: ':'Baixa relevância: ')).($labels?implode(', ',$labels):'sem combinação contextual suficiente').($discoveryTerm!==''?"; encontrada pelo termo “$discoveryTerm”.":'.');return[$score,$status,$reason,array_values(array_unique($matched))];
}
function feedUrlForTerm(string $url,string $term,string $startDate):string{$p=parse_url($url);if(!$p||!str_contains(strtolower($p['host']??''),'news.google.'))return$url;parse_str($p['query']??'',$q);$q['q']='"'.$term.'" after:'.$startDate;$base=($p['scheme']??'https').'://'.$p['host'].($p['path']??'');return$base.'?'.http_build_query($q);}

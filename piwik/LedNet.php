<?php
namespace Piwik\Plugins\LedNet;

class LedNet extends \Piwik\Plugin {
	public function registerEvents() {
	  return array(
	    'Tracker.Request.getIdSite' => 'trackVisit'
	  );
  }

	/* Notify the LedNet server on every pageview */
	public function trackVisit(&$idSite, $params) {
		if(!empty($params['link'])) return;
		$req = curl_init("http://projects.gatunes.com/lednet/piwik");
		$payload = json_encode(array(
			"id" => $idSite
		));
		curl_setopt($req, CURLOPT_POSTFIELDS, $payload);
		curl_setopt($req, CURLOPT_HTTPHEADER, array(
			'Content-Type: application/json',
			'Content-Length: ' . strlen($payload)
		));
		$result = curl_exec($req);
		curl_close($req);
	}
}

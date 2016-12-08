<?php
namespace Piwik\Plugins\LedNet;

class LedNet extends \Piwik\Plugin {
	const SERVER_URL = 'https://projects.gatunes.com/lednet/';

	public function registerEvents() {
		return array(
			'Tracker.Request.getIdSite' => 'trackVisit'
		);
	}

	public function trackVisit($idSite, $params) {
		if(!empty($params['link']) || !empty($params['e_c']) {
			/* Avoid outlinks & events */
			return;
		}

		/* Notify the LedNet server on every pageview */
		$req = curl_init(self::SERVER_URL . 'piwik');
		$payload = json_encode(array(
			'id' => $idSite
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

<?php
namespace Piwik\Plugins\LedNet;

use Piwik\Container\StaticContainer;

class LedNet extends \Piwik\Plugin {
	public function registerEvents() {
		return array(
			'Tracker.Request.getIdSite' => 'trackVisit'
		);
	}

	public function trackVisit($idSite, $params) {
		$settings = StaticContainer::get('Piwik\Plugins\LedNet\SystemSettings');
		$serverURL = $settings->server->getValue();

		if(is_null($serverURL)) {
			/* Not configured! */
			return;
		}

		if(!empty($params['link']) || !empty($params['e_c'])) {
			/* Avoid outlinks & events */
			return;
		}

		/* Notify the LedNet server on every pageview */
		$req = curl_init($serverURL . 'piwik');
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

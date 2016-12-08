<?php
namespace Piwik\Plugins\LedNet;

use Piwik\Settings\SystemSetting;

class Settings extends \Piwik\Plugin\Settings {
	/** @var SystemSetting */
	public $server;

	protected function init() {
		$this->createServerSetting();
	}

	private function createServerSetting() {
		$this->server	= new SystemSetting('server', 'Server URL');
		$this->server->readableByCurrentUser = true;
		$this->server->uiControlType = static::CONTROL_TEXT;
		$this->addSetting($this->server);
	}
}

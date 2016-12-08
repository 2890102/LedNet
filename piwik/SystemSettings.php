<?php
namespace Piwik\Plugins\LedNet;

use Piwik\Settings\Setting;
use Piwik\Settings\FieldConfig;

class SystemSettings extends \Piwik\Settings\Plugin\SystemSettings {
	/** @var Setting */
	public $server;

	protected function init() {
		$this->server = $this->createServerSetting();
	}

	private function createServerSetting() {
		return $this->makeSetting('server', $default = null, FieldConfig::TYPE_STRING, function (FieldConfig $field) {
			$field->title = 'Server URL';
			$field->uiControl = FieldConfig::UI_CONTROL_TEXT;
		});
	}
}

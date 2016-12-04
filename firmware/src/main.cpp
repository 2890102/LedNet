#include <Arduino.h>
#include <Hash.h>
#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include <FS.h>
#include <Hash.h>
#include <Adafruit_NeoPixel.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <WebSocketsClient.h>

struct {
	String ssid;
	String password;
	bool setup;
} config = {
	"LedNet",
	"",
	false
};

#define LED 0
#define BUTTON 2

Adafruit_NeoPixel led(1, LED, NEO_GRB + NEO_KHZ800);
AsyncWebServer server(80);
WebSocketsClient socket;

void setup() {
	/* Setup LED */
	led.begin();
	led.setPixelColor(0, 0, 0, 0);
	led.show();

	/* Init filesystem */
	SPIFFS.begin();

	/* Read the button initial state */
	pinMode(BUTTON, INPUT_PULLUP);
	if(!SPIFFS.exists("/config") || digitalRead(BUTTON) == LOW) {
		/* Setup config */
		config.ssid += "_" + String(ESP.getChipId());
		config.setup = true;

		/* Scan for the networks */
		WiFi.mode(WIFI_STA);
	  WiFi.disconnect();
		File f = SPIFFS.open("/setup/networks.json", "w");
		int count = WiFi.scanNetworks();
		if(count == 0) {
			f.println("[]");
			f.close();
			return;
		}
		f.print("[");
		for(int i=0; i<count; i++) {
			if(i > 0) f.print(",");
			f.print("[\"");
			f.print(WiFi.SSID(i));
			f.print("\",\"");
			f.print(WiFi.RSSI(i));
			f.print("\"");
			if(WiFi.encryptionType(i) == ENC_TYPE_NONE) f.print(",1");
			f.print("]");
		}
		f.print("]");
		f.close();

		/* Start the AP */
		WiFi.mode(WIFI_AP);
		IPAddress apIP(192, 168, 1, 1);
		WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
		WiFi.softAP(config.ssid.c_str());

		/* Serve the UI */
		server.serveStatic("/", SPIFFS, "/setup/");
		server.on("/setup", HTTP_POST, [](AsyncWebServerRequest* request) {
			int params = request->params();
			for(int i=0;i<params;i++){
	      AsyncWebParameter* p = request->getParam(i);
				if(p->name() == "ssid") config.ssid = p->value();
				else if(p->name() == "password") config.password = p->value();
	    }
			File f = SPIFFS.open("/config", "w");
			f.println(config.ssid);
			f.println(config.password);
			f.close();
			ESP.restart();
		});
		server.onNotFound([](AsyncWebServerRequest *request) {
			request->send(404);
		});
		server.begin();

		/* Announce in the network */
		MDNS.begin("lednet");
	  MDNS.addService("http", "tcp", 80);
	} else {
		/* Read config */
		File f = SPIFFS.open("/config", "r");
		config.ssid = f.readStringUntil('\n');
		config.ssid.remove(config.ssid.length() - 1);
		config.password = f.readStringUntil('\n');
		config.password.remove(config.password.length() - 1);
		f.close();

		/* Connect to the network */
		WiFi.mode(WIFI_STA);
		WiFi.begin(config.ssid.c_str(), config.password.c_str());
		while(WiFi.waitForConnectResult() != WL_CONNECTED) {
			delay(5000);
			ESP.restart();
		}

		/* Connect to the server */
		String url = "/lednet/" + String(ESP.getChipId());
		socket.beginSSL("projects.gatunes.com", 443, url.c_str());
		socket.onEvent([](WStype_t type, uint8_t * payload, size_t length) {
			switch(type) {
				case WStype_BIN:
					if(length == 3) {
						/* Update LED */
						led.setPixelColor(0, payload[0], payload[1], payload[2]);
						led.show();
					}
				break;
				case WStype_DISCONNECTED:
					/* Reset LED */
					led.setPixelColor(0, 0, 0, 0);
					led.show();
				break;
			}
		});
	}
}

void loop() {
	if(config.setup) return;
	socket.loop();

	if(digitalRead(BUTTON) == LOW) {
		led.setPixelColor(0, 0, 0, 0);
		led.show();
	}
}

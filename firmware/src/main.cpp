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

/* Server config */
#define SERVER_HOST "server.gatunes.com"
#define SERVER_PATH "/lednet/"
#define SERVER_PORT 443
#define SERVER_SSL 1

/* Hardware config */
#define BUTTON 2
#define LED 0
#define STEPS 1500

/* Program state */
byte mode = 0;
struct {
	byte r;
	byte g;
	byte b;
} color = {
	0, 0, 0
};
struct {
	String ssid;
	String password;
	bool setup;
} config = {
	"LedNet",
	"",
	false
};

/* APIs */
Adafruit_NeoPixel led(1, LED, NEO_GRB + NEO_KHZ800);
WebSocketsClient socket;
AsyncWebServer* server;

void WiFiSetup() {
	/* Config */
	config.ssid += "_" + String(ESP.getChipId());
	config.setup = true;

	/* Scan for the networks */
	WiFi.mode(WIFI_STA);
	WiFi.disconnect();
	File f = SPIFFS.open("/setup/networks.json", "w");
	int count = WiFi.scanNetworks();
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
	server = new AsyncWebServer(80);
	server->serveStatic("/", SPIFFS, "/setup/");
	server->on("/setup", HTTP_POST, [](AsyncWebServerRequest* request) {
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
		request->send(200, "text/html", "Restarting...<script>location.href=\"/restart\"</script>");
	});
	server->on("/restart", HTTP_GET, [](AsyncWebServerRequest* request) {
		ESP.restart();
	});
	server->onNotFound([](AsyncWebServerRequest *request) {
		request->send(404);
	});
	server->begin();

	/* Announce in the network */
	MDNS.begin("lednet");
	MDNS.addService("http", "tcp", 80);
}

void reset() {
	/* Reset LED */
	mode = color.r = color.g = color.b = 0;
	led.setPixelColor(0, 0, 0, 0);
	led.show();
}

void setup() {
	/* Setup LED */
	led.begin();
	reset();

	/* Init filesystem */
	SPIFFS.begin();

	/* Read the button initial state */
	pinMode(BUTTON, INPUT_PULLUP);
	if(digitalRead(BUTTON) == LOW || !SPIFFS.exists("/config")) {
		/* WiFi setup requested */
		return WiFiSetup();
	}

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
	String url = SERVER_PATH + String(ESP.getChipId());
	#ifdef SERVER_SSL
	socket.beginSSL(SERVER_HOST, SERVER_PORT, url.c_str());
	#else
	socket.begin(SERVER_HOST, SERVER_PORT, url.c_str());
	#endif
	socket.onEvent([](WStype_t type, uint8_t * payload, size_t length) {
		switch(type) {
			case WStype_BIN:
				if(length == 4) {
					/* Update LED */
					color.r = payload[0];
					color.g = payload[1];
					color.b = payload[2];
					mode = payload[3];
					switch(mode) {
						case 0: //ON
							led.setPixelColor(0, color.r, color.g, color.b);
						break;
						case 1: //PULSE
						case 2: //OFF
							led.setPixelColor(0, 0, 0, 0);
						break;
					}
					led.show();
				}
			break;
			case WStype_DISCONNECTED:
				reset();
			break;
		}
	});
}

void loop() {
	if(config.setup) return;
	socket.loop();
	if(digitalRead(BUTTON) == LOW) reset();
	if(mode == 1) { //PULSE
		unsigned long step = millis() % (STEPS * 2);
		if(step > STEPS) step = (STEPS * 2) - step;
		float amount = (float) step / STEPS;
		led.setPixelColor(0, (float) color.r * amount, (float) color.g * amount, (float) color.b * amount);
		led.show();
	}
}

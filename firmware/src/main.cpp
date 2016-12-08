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
#include "config.h"
#include "gamma.h"

/* Program modes */
enum {
	MODE_ON,
	MODE_PULSE,
	MODE_OFF
};

/* Program state */
struct {
	String ssid;
	String password;
	bool setup;
} config = {
	"LedNet",
	"",
	false
};
struct {
	byte state;
	unsigned long debounce;
} button = {
	HIGH,
	0
};
struct {
	byte r;
	byte g;
	byte b;
} color = {
	0, 0, 0
};
byte mode = MODE_ON;
unsigned long lastPing = 0;

/* APIs */
Adafruit_NeoPixel led(1, LED, NEO_GRB + NEO_KHZ800);
WebSocketsClient socket;
AsyncWebServer* server;

/* Wifi setup app */
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
	server->onNotFound([](AsyncWebServerRequest* request) {
		request->send(404);
	});
	server->begin();

	/* Announce in the network */
	MDNS.begin("lednet");
	MDNS.addService("http", "tcp", 80);
}

/* LED update helper */
void Led(byte r, byte g, byte b, bool raw = false) {
	if(mode == MODE_OFF) {
		led.setPixelColor(0, 0, 0, 0);
	} else {
		led.setPixelColor(
			0,
			raw ? r : pgm_read_byte(&gamma8[r]),
			raw ? g : pgm_read_byte(&gamma8[g]),
			raw ? b : pgm_read_byte(&gamma8[b])
		);
	}
	led.show();
}

/* State reset helper */
void Reset() {
	mode = color.r = color.g = color.b = 0;
	Led(0, 0, 0);
}

/* Main Setup */
void setup() {
	/* Setup LED */
	led.begin();
	Reset();

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
	socket.onEvent([](WStype_t type, uint8_t* payload, size_t length) {
		switch(type) {
			case WStype_BIN:
				if(length == 4) {
					/* Update LED */
					color.r = payload[0];
					color.g = payload[1];
					color.b = payload[2];
					mode = payload[3];
					Led(color.r, color.g, color.b);
				}
			break;
			case WStype_DISCONNECTED:
				Reset();
				lastPing = millis();
			break;
		}
	});
}

/* Main loop */
void loop() {
	if(config.setup) return;
	socket.loop();

	unsigned long time = millis();

	/* Ping server every 5 minutes */
	if((time - lastPing) >= 300000) {
		lastPing = time;
		if(!socket.sendPing()) {
			/* Connection error! */
			ESP.restart();
		}
	}

	/* Handle button */
	const byte read = digitalRead(BUTTON);
	if(button.state != read && (time - button.debounce) > 10) {
		button.debounce = time;
		if((button.state = read) == LOW) {
			Reset();
			uint8_t payload[1] = {1};
			socket.sendBIN(payload, 1);
		}
	}

	/* Pulse animation */
	if(mode == MODE_PULSE) {
		int step = time % 2000;
		if(step > 1000) step = 2000 - step;
		double amount = (double) step / 1000;
		Led(
			(double) pgm_read_byte(&gamma8[color.r]) * amount,
			(double) pgm_read_byte(&gamma8[color.g]) * amount,
			(double) pgm_read_byte(&gamma8[color.b]) * amount,
			true
		);
	}
}

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
#define SERVER_HOST "projects.gatunes.com"
#define SERVER_PATH "/lednet/led/"
#define SERVER_PORT 443
#define SERVER_SSL 1

/* Hardware config */
#define BUTTON 2
#define LED 0
#define STEPS 1000

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

/* Program modes */
enum {
	MODE_ON,
	MODE_PULSE,
	MODE_OFF
};

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
	server->onNotFound([](AsyncWebServerRequest *request) {
		request->send(404);
	});
	server->begin();

	/* Announce in the network */
	MDNS.begin("lednet");
	MDNS.addService("http", "tcp", 80);
}

/* Gamma correction lookup table */
const uint8_t PROGMEM gamma8[] = {
	 	0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
	  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,
	  1,  1,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,
	  2,  3,  3,  3,  3,  3,  3,  3,  4,  4,  4,  4,  4,  5,  5,  5,
	  5,  6,  6,  6,  6,  7,  7,  7,  7,  8,  8,  8,  9,  9,  9, 10,
	 10, 10, 11, 11, 11, 12, 12, 13, 13, 13, 14, 14, 15, 15, 16, 16,
	 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 24, 24, 25,
	 25, 26, 27, 27, 28, 29, 29, 30, 31, 32, 32, 33, 34, 35, 35, 36,
	 37, 38, 39, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 50,
	 51, 52, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 66, 67, 68,
	 69, 70, 72, 73, 74, 75, 77, 78, 79, 81, 82, 83, 85, 86, 87, 89,
	 90, 92, 93, 95, 96, 98, 99,101,102,104,105,107,109,110,112,114,
	115,117,119,120,122,124,126,127,129,131,133,135,137,138,140,142,
	144,146,148,150,152,154,156,158,160,162,164,167,169,171,173,175,
	177,180,182,184,186,189,191,193,196,198,200,203,205,208,210,213,
	215,218,220,223,225,228,231,233,236,239,241,244,247,249,252,255
};

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
			break;
		}
	});
}

/* Main loop */
void loop() {
	if(config.setup) return;
	socket.loop();
	if(digitalRead(BUTTON) == LOW) {
		Reset();
		uint8_t payload[4] = {1};
		socket.sendBIN(payload, 1);
	}
	if(mode == MODE_PULSE) {
		unsigned long step = millis() % (STEPS * 2);
		if(step > STEPS) step = (STEPS * 2) - step;
		double amount = (double) step / STEPS;
		Led(
			(double) pgm_read_byte(&gamma8[color.r]) * amount,
			(double) pgm_read_byte(&gamma8[color.g]) * amount,
			(double) pgm_read_byte(&gamma8[color.b]) * amount,
			true
		);
	}
}

export type Lang = "arduino" | "micropython";
export type Board = { id: string; name: string; family: string; mcu: string; lang: Lang; fqbn?: string | undefined };

const a = (id: string, name: string, family: string, mcu: string, fqbn?: string): Board => ({ id, name, family, mcu, lang: "arduino", fqbn });
const m = (id: string, name: string, family: string, mcu: string): Board => ({ id, name, family, mcu, lang: "micropython" });

export const BOARDS: Board[] = [
  m("microbit-v2", "BBC micro:bit V2", "micro:bit", "nRF52833"),
  m("microbit-v1", "BBC micro:bit V1", "micro:bit", "nRF51822"),
  a("uno", "Arduino Uno R3", "Arduino AVR", "ATmega328P", "arduino:avr:uno"),
  a("uno-r4-minima", "Arduino Uno R4 Minima", "Arduino Renesas", "RA4M1", "arduino:renesas_uno:minima"),
  a("uno-r4-wifi", "Arduino Uno R4 WiFi", "Arduino Renesas", "RA4M1 + ESP32-S3", "arduino:renesas_uno:unor4wifi"),
  a("mega", "Arduino Mega 2560", "Arduino AVR", "ATmega2560", "arduino:avr:mega"),
  a("nano", "Arduino Nano", "Arduino AVR", "ATmega328P", "arduino:avr:nano"),
  a("nano-every", "Arduino Nano Every", "Arduino megaAVR", "ATmega4809", "arduino:megaavr:nona4809"),
  a("nano-33-iot", "Arduino Nano 33 IoT", "Arduino SAMD", "SAMD21", "arduino:samd:nano_33_iot"),
  a("nano-33-ble", "Arduino Nano 33 BLE", "Arduino mbed", "nRF52840", "arduino:mbed_nano:nano33ble"),
  a("nano-esp32", "Arduino Nano ESP32", "Arduino ESP32", "ESP32-S3", "arduino:esp32:nano_nora"),
  a("leonardo", "Arduino Leonardo", "Arduino AVR", "ATmega32U4", "arduino:avr:leonardo"),
  a("micro", "Arduino Micro", "Arduino AVR", "ATmega32U4", "arduino:avr:micro"),
  a("pro-mini", "Arduino Pro Mini", "Arduino AVR", "ATmega328P", "arduino:avr:pro"),
  a("due", "Arduino Due", "Arduino SAM", "AT91SAM3X8E", "arduino:sam:arduino_due_x"),
  a("zero", "Arduino Zero", "Arduino SAMD", "SAMD21", "arduino:samd:arduino_zero_native"),
  a("mkr1000", "Arduino MKR WiFi 1010", "Arduino SAMD", "SAMD21", "arduino:samd:mkrwifi1010"),
  a("giga", "Arduino GIGA R1", "Arduino mbed", "STM32H747", "arduino:mbed_giga:giga"),
  a("portenta", "Arduino Portenta H7", "Arduino mbed", "STM32H747", "arduino:mbed_portenta:envie_m7"),
  a("esp32", "ESP32 DevKit V1", "Espressif", "ESP32", "esp32:esp32:esp32"),
  a("esp32-s2", "ESP32-S2 Saola", "Espressif", "ESP32-S2", "esp32:esp32:esp32s2"),
  a("esp32-s3", "ESP32-S3 DevKitC", "Espressif", "ESP32-S3", "esp32:esp32:esp32s3"),
  a("esp32-c3", "ESP32-C3 DevKitM", "Espressif", "ESP32-C3", "esp32:esp32:esp32c3"),
  a("esp32-c6", "ESP32-C6 DevKitC", "Espressif", "ESP32-C6", "esp32:esp32:esp32c6"),
  a("esp32-cam", "ESP32-CAM (AI Thinker)", "Espressif", "ESP32", "esp32:esp32:esp32cam"),
  a("esp8266", "NodeMCU ESP8266", "Espressif", "ESP8266", "esp8266:esp8266:nodemcuv2"),
  a("wemos-d1", "Wemos D1 Mini", "Espressif", "ESP8266", "esp8266:esp8266:d1_mini"),
  m("esp32-mpy", "ESP32 (MicroPython)", "Espressif", "ESP32"),
  m("pico", "Raspberry Pi Pico", "Raspberry Pi", "RP2040"),
  m("pico-w", "Raspberry Pi Pico W", "Raspberry Pi", "RP2040"),
  m("pico-2", "Raspberry Pi Pico 2", "Raspberry Pi", "RP2350"),
  a("pico-arduino", "Raspberry Pi Pico (Arduino)", "Raspberry Pi", "RP2040", "rp2040:rp2040:rpipico"),
  a("bluepill", "STM32 Blue Pill", "STM32", "STM32F103C8", "STMicroelectronics:stm32:GenF1"),
  a("blackpill", "STM32 Black Pill", "STM32", "STM32F411CE", "STMicroelectronics:stm32:GenF4"),
  a("nucleo-f401", "STM32 Nucleo-F401RE", "STM32", "STM32F401RE", "STMicroelectronics:stm32:Nucleo_64"),
  a("nucleo-l476", "STM32 Nucleo-L476RG", "STM32", "STM32L476RG", "STMicroelectronics:stm32:Nucleo_64"),
  a("teensy41", "Teensy 4.1", "PJRC", "i.MX RT1062", "teensy:avr:teensy41"),
  a("teensy40", "Teensy 4.0", "PJRC", "i.MX RT1062", "teensy:avr:teensy40"),
  a("teensy32", "Teensy 3.2", "PJRC", "MK20DX256", "teensy:avr:teensy31"),
  a("digispark", "Digispark ATtiny85", "ATtiny", "ATtiny85", "digistump:avr:digispark-tiny"),
  a("attiny85", "ATtiny85 (bare)", "ATtiny", "ATtiny85", "ATTinyCore:avr:attinyx5"),
  a("atmega8", "ATmega8 (bare)", "Arduino AVR", "ATmega8", "MiniCore:avr:8"),
  m("feather-rp2040", "Adafruit Feather RP2040", "Adafruit", "RP2040"),
  a("feather-m0", "Adafruit Feather M0", "Adafruit", "SAMD21", "adafruit:samd:adafruit_feather_m0"),
  a("feather-m4", "Adafruit Feather M4", "Adafruit", "SAMD51", "adafruit:samd:adafruit_feather_m4"),
  a("itsybitsy-m4", "Adafruit ItsyBitsy M4", "Adafruit", "SAMD51", "adafruit:samd:adafruit_itsybitsy_m4"),
  a("circuit-playground", "Circuit Playground Express", "Adafruit", "SAMD21", "adafruit:samd:adafruit_circuitplayground_m0"),
  a("seeed-xiao", "Seeed XIAO SAMD21", "Seeed", "SAMD21", "Seeeduino:samd:seeed_XIAO_m0"),
  a("seeed-xiao-esp32s3", "Seeed XIAO ESP32-S3", "Seeed", "ESP32-S3", "esp32:esp32:XIAO_ESP32S3"),
  a("nrf52840-dk", "Nordic nRF52840 DK", "Nordic", "nRF52840", "adafruit:nrf52:pca10056"),
  a("msp430", "TI MSP430 LaunchPad", "Texas Instruments", "MSP430G2553", "energia:msp430:MSP-EXP430G2553LP"),
  a("tiva", "TI Tiva C LaunchPad", "Texas Instruments", "TM4C123", "energia:tivac:EK-TM4C123GXL"),
];

export const LIBRARIES = [
  "Servo", "Wire (I2C)", "SPI", "SoftwareSerial", "EEPROM", "LiquidCrystal", "LiquidCrystal_I2C",
  "Adafruit_NeoPixel", "FastLED", "DHT sensor library", "Adafruit_SSD1306", "Adafruit_GFX",
  "Stepper", "AccelStepper", "IRremote", "MFRC522 (RFID)", "TinyGPS++", "OneWire", "DallasTemperature",
  "WiFi", "ESP8266WiFi", "PubSubClient (MQTT)", "ArduinoJson", "HTTPClient", "WebServer", "BLE",
  "Keypad", "RTClib", "SD", "TFT_eSPI", "U8g2", "MPU6050", "Adafruit_BMP280", "HC-SR04 (NewPing)",
  "Blynk", "Firebase ESP32", "microbit (MicroPython)", "machine (MicroPython)", "neopixel (MicroPython)",
  "radio (micro:bit)", "music (micro:bit)", "speech (micro:bit)", "network (MicroPython)",
  "Ethernet", "WiFiNINA", "WiFiS3", "ArduinoBLE", "NimBLE-Arduino", "ESPAsyncWebServer", "AsyncTCP", "WebSockets",
  "ArduinoOTA", "ESPmDNS", "Preferences", "SPIFFS", "LittleFS", "Arduino_JSON", "ThingSpeak", "UniversalTelegramBot",
  "Adafruit_Sensor", "Adafruit_BME280", "Adafruit_BMP085", "Adafruit_MPU6050", "Adafruit_ADXL345", "Adafruit_INA219",
  "Adafruit_PWMServoDriver", "Adafruit_MotorShield", "Adafruit_ST7735", "Adafruit_ILI9341", "Adafruit_SH110X",
  "Adafruit_TCS34725", "Adafruit_VL53L0X", "Adafruit_MCP23017", "Adafruit_ADS1X15", "Adafruit_GPS", "Adafruit_Fingerprint",
  "Adafruit_LEDBackpack", "Adafruit_DotStar", "MAX30105", "MAX6675", "HX711", "BH1750", "SHT31", "DS3231",
  "TM1637Display", "MD_Parola", "MD_MAX72XX", "LedControl", "LCDWIZARD", "TFT_ILI9163C", "MCUFRIEND_kbv", "lvgl",
  "Encoder", "Bounce2", "OneButton", "TimerOne", "TaskScheduler", "FreeRTOS", "ArduinoLowPower", "LowPower",
  "VirtualWire", "RadioHead", "RF24", "LoRa", "Arduino_LSM6DS3", "Arduino_LSM9DS1", "Arduino_APDS9960",
  "Arduino_HTS221", "Arduino_LPS22HB", "TensorFlowLite", "DFRobotDFPlayerMini", "Talkie", "Tone", "ESP32Servo",
  "ESP32-Camera", "Mouse", "Keyboard", "HID-Project", "CapacitiveSensor", "QTRSensors", "PID_v1", "SparkFun_BNO080",
  "Ultrasonic", "Adafruit_CircuitPlayground", "ssd1306 (MicroPython)", "dht (MicroPython)", "urequests (MicroPython)",
  "umqtt (MicroPython)", "bluetooth (MicroPython)", "onewire (MicroPython)", "ds18x20 (MicroPython)",
];

export function starter(b: Board) {
  if (b.family === "micro:bit")
    return `from microbit import *\n\nwhile True:\n    display.scroll("Hi!")\n    if button_a.was_pressed():\n        display.show(Image.HEART)\n    sleep(500)\n`;
  if (b.lang === "micropython")
    return `from machine import Pin\nimport time\n\nled = Pin("LED", Pin.OUT)\n\nwhile True:\n    led.toggle()\n    time.sleep(0.5)\n`;
  return `// ${b.name} (${b.mcu})\nvoid setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  delay(500);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(500);\n}\n`;
}

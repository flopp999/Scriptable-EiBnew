// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: green; icon-glyph: magic;
// License: Personal use only. See LICENSE for details.
// This script was created by Flopp999
// Support me with a coffee https://www.buymeacoffee.com/flopp999 
let version = 0.23
const baseURL = "https://api.checkwatt.se";
let password;
let username;
let rpiSerial;
let meterId;
let batteryCapacityKwh;
let token;
let firstDayStr;
let lastDayStr;
let revenues;
let total;
let widget;
let day;
let date;
let language;
let settings = {}
let langId;
let hour;
let minute;
let translationData;
let currentLang;
let fcrdRevenues;
let savingsRevenues;
let totalRevenues;
let totalSavings;
const fileNameSettings = Script.name() + "_Settings.json";
const fileNameTranslations = Script.name() + "_Translations.json";
const fm = FileManager.iCloud();
const dir = fm.documentsDirectory();
const filePathSettings = fm.joinPath(dir, fileNameSettings);
const filePathTranslations = fm.joinPath(dir, fileNameTranslations);
let height = 1150;
let width = 1300;
let keys = [];

if (!config.runsInWidget){
  await updatecode();
  await readTranslations();
  await readsettings();
  await createVariables();
  //await start();
  await createVariables();
}

if (config.runsInWidget){
 await readsettings();
  if (keys.length < 2 || keys == undefined) {
    let widget = new ListWidget();
    widget.addText("You need to run \"" + Script.name() + "\" in the app");
    Script.setWidget(widget);
    Script.complete();
    return;
  }
}
if (config.runsInWidget){
  await updatecode();
  await createVariables();
}

async function start() {
  const [topType, topDay] = settings.showattop.split(",").map(s => s.trim());
  const [middleType, middleDay] = settings.showatmiddle.split(",").map(s => s.trim());
 // const [bottomType, bottomDay] = settings.showatbottom.split(",").map(s => s.trim());
  let alert = new Alert();
  //let vatText = includevat == 1 ? t("yes") : t("no")
  alert.message = 
    t("changesetup") + "?\n" +
    t("top").charAt(0).toUpperCase() + t("top").slice(1) + ":\n" + t(topType) + (topDay ? ", " + t(topDay) : "") + "\n" +
    t("middle").charAt(0).toUpperCase() + t("middle").slice(1) + ":\n" + t(middleType) + (middleDay ? ", " + t(middleDay) : "")
    //t("bottom").charAt(0).toUpperCase() + t("bottom").slice(1) + ":\n" + t(bottomType) + (bottomDay ? ", " + t(bottomDay) : "") + "\n"
    //t("area") + ": " + area + "\n" +
    //"Extras: " + extras + "\n" +
    //t("withvat") + ": " + vatText + "\n";
  //if (includevat == 1) {
    //alert.message += t("vat") + ": " + vat;
  //}
  alert.addAction(t("yes"));
  alert.addAction(t("no"));
  let index = await alert.presentAlert();
  if (index === 0) {
    settings = await ask();
    fm.writeString(filePathSettings, JSON.stringify(settings, null, 2)); // Pretty print
  }
}

async function updatecode() {
  try {
    const req = new Request("https://github.com/flopp999/Scriptable-EiB/releases/latest/download/Version.txt");
    req.timeoutInterval = 1;
    const serverVersion = await req.loadString()
    if (version < serverVersion) {
      try {
        const req = new Request("https://github.com/flopp999/Scriptable-EiB/releases/latest/download/EiB.js");
        req.timeoutInterval = 1;
        const response = await req.load();
        const status = req.response.statusCode;
        if (status !== 200) {
          throw new Error(`Error: HTTP ${status}`);
        }
        const codeString = response.toRawString();
        fm.writeString(module.filename, codeString);

        const reqTranslations = new Request("https://github.com/flopp999/Scriptable-EiB/releases/latest/download/Translations.json");
        reqTranslations.timeoutInterval = 1;
        const responseTranslations = await reqTranslations.load();
        const statusTranslations = reqTranslations.response.statusCode;
        if (statusTranslations !== 200) {
          throw new Error(`Error: HTTP ${statusTranslations}`);
        }
        const codeStringTranslations = responseTranslations.toRawString();
        fm.writeString(filePathTranslations, codeStringTranslations);
        fm.remove(filePathSettings);
        let updateNotify = new Notification();
        updateNotify.title = Script.name();
        updateNotify.body = "New version installed, " + serverVersion;
        updateNotify.sound = "default";
        await updateNotify.schedule();
      } catch (error) {
        console.error(error);
      }
    }
  } catch (error) {
    console.error("The update failed. Please try again later." + error);
  }
}

async function readsettings() {
  try {
    if (fm.fileExists(filePathSettings)) {
      let raw = fm.readString(filePathSettings);
      settings = JSON.parse(raw);
      langId = settings.language; // 1 = ENG, 2 = DE, 3 = SV
      await readTranslations();
      keys = Object.keys(settings);
      if (keys.length < 2) {
        throw new Error("Settings file is incomplete or corrupted");
        return;
      }
    } else {
      if (config.runsInWidget) {
        return;
      }
      await askForLanguage();
      await readTranslations();
      let alert = new Alert();
      alert.title = "Support";
      alert.message = t("buymeacoffee") + "?";
      alert.addAction(t("noway"));
      alert.addCancelAction(t("ofcourse"));
      let response = await alert.present();
      if (response === -1) {
        Safari.open("https://buymeacoffee.com/flopp999");
      }
      throw new Error("Settings file not found");
    }
  } catch (error) {
    if (config.runsInWidget) {
      return;
    }
    console.warn("Settings file not found or error reading file: " + error.message);
    settings = await ask();
    fm.writeString(filePathSettings, JSON.stringify(settings, null, 2)); // Pretty print
  }
}

async function getDetails() {
  const endpoint = `/controlpanel/CustomerDetail`;
  const url = baseURL + endpoint;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/json"
  };
  const req = new Request(url);
  req.method = "GET";
  req.headers = headers;
  try {
    const revenue = await req.loadJSON();
    if (req.response.statusCode === 200) {
			rpiSerial = revenue["Meter"][0]["RpiSerial"]
			meterId = revenue["Meter"][0]["Id"]
			batteryCapacityKwh = revenue["Meter"][0]["BatteryCapacityKwh"]
      return revenue;
    } else {
      console.error("❌ Fel statuskod:", req.response.statusCode);
    }
  } catch (err) {
    console.error("❌ Fel vid hämtning av revenue:", err);
  }
  return null;
}

async function getStatus() {
  const endpoint = `/site/Statuses?serial=` + rpiSerial;
  const url = baseURL + endpoint;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/json"
  };
  const req = new Request(url);
  req.method = "GET";
  req.headers = headers;
  try {
    const revenue = await req.loadJSON();
    if (req.response.statusCode === 200) {
			if (revenue[0]["Service"][0] == "fcrd") {
				service = "CO"
			} else if (revenue[0]["Service"][0] == "off") {
				service = "Avaktiverad"
			} else if (revenue[0]["Service"][0] == "sc") {
				service = "SC"
			}
			FpUpInKw = revenue[0]["FpUpInKw"]
			FpDownInKw = revenue[0]["FpDownInKw"]
			ChargingMax = revenue[0]["RelatedMeters"][0]["PeakAcKw"]
			DischargingMax = revenue[0]["RelatedMeters"][1]["PeakAcKw"]
      return;
    } else {
      console.error("❌ Fel statuskod:", req.response.statusCode);
    }
  } catch (err) {
    console.error("❌ Fel vid hämtning av revenue:", err);
  }
  return null;
}

// == Login: Basic Auth och hämta JWT ==
async function loginAndGetToken() {
  const credentials = `${username}:${password}`;
  const encoded = Data.fromString(credentials).toBase64String();
  const endpoint = "/user/Login?audience=eib";
  const url = baseURL + endpoint;
  const headers = {
  	"Authorization": `Basic ${encoded}`,
  	"Accept": "application/json",
  	"Content-Type": "application/json",
	};

  const payload = {
    OneTimePassword: ""
  };

  const req = new Request(url);
  req.method = "POST";
  req.headers = headers;
  req.body = JSON.stringify(payload);

  try {
    const res = await req.loadJSON();
		const jwt = res.JwtToken;
    if (!jwt) throw new Error("Inget JWT-token returnerat");
    return jwt;
  } catch (error) {
    console.error("❌ Misslyckades logga in:", error);
    return null;
  }
}
// == Hämta revenue med JWT ==
async function fetchRevenue(jwtToken) {
	  // Dagens datum
	const now = new Date();
	// Första dagen i månaden
	const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
	// Sista dagen i månaden
	const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	// Formatera som YYYY-MM-DD
	firstDayStr = `${firstDay.getFullYear()}-${(firstDay.getMonth() + 1).toString().padStart(2, '0')}-01`;
	lastDayStr = `${lastDay.getFullYear()}-${(lastDay.getMonth() + 1).toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;
	const endpoint = `/ems/revenue?fromDate=${firstDayStr}&toDate=${lastDayStr}`;
	const url = baseURL + endpoint;
	const headers = {
		"Authorization": `Bearer ${jwtToken}`,
	  "Accept": "application/json"
	};
	const req = new Request(url);
	req.method = "GET";
	req.headers = headers;
	try {
	  const revenue = await req.loadJSON();
	  if (req.response.statusCode === 200) {
			// Få ut alla NetRevenue för fcrd
			fcrdRevenues = revenue
		  .filter(item => item.Service === "fcrd")
		  .map(item => item.NetRevenue);
		
			// Få ut alla NetRevenue för savings
			savingsRevenues = revenue
			  .filter(item => item.Service === "savings")
			  .map(item => item.NetRevenue);
			
			log("FCRD: " + fcrdRevenues);
			log("SAVINGS: " + savingsRevenues);
				//revenues = revenue.map(item => item.NetRevenue);
      totalFcrd = fcrdRevenues.reduce((sum, value) => sum + value, 0);
			totalSavings = savingsRevenues.reduce((sum, value) => sum + value, 0);
			
	    return;
	  } else {
	    console.error("❌ Fel statuskod:", req.response.statusCode);
		}
	} catch (err) {
		console.error("❌ Fel vid hämtning av revenue:", err);
	}
	return null;
}

async function createVariables() {
  username = settings.username;
  password = settings.password;
  service = settings.service;
  rpiSerial = settings.rpiserial;
  batteryCapacityKwh = settings.batterycapacitykwh;
  meterId = settings.meterid;
}

async function readTranslations() {
  if (!fm.fileExists(filePathTranslations)) {
    let url = "https://github.com/flopp999/Scriptable-EiB/releases/latest/download/Translations.json";
    let req = new Request(url);
    req.timeoutInterval = 1;
    let content = await req.loadString();
    fm.writeString(filePathTranslations, content);
  }
  try {
    translationData = JSON.parse(fm.readString(filePathTranslations));
    const langMap = {
      1: "en",
      3: "sv"
    };
    currentLang = langMap[langId] || "en"; // fallback to english
  } catch (error) {
    console.error(error);
  }
}

function t(key) {
  const entry = translationData[key];
  if (!entry) return `[${key}]`; // key is missing
  return entry[currentLang] || entry["en"] || `[${key}]`;
}

async function ask() {
  //[settings.area, settings.vat, settings.currency] = await askForArea();
  //settings.status = await askForStatus();
  settings.username = await askForUsername();
  settings.password = await askForPassword();
	settings.details = await getDetails();
  settings.showattop = "graph, thismonth"
  settings.showatmiddle = "table, thismonth"
  settings.graphOption = {"top": "bar"}
  settings.height = 750
  //await askForAllShowPositions();
  //settings.resolution = 60;
  return settings
}

async function askForAllShowPositions() {
  const options = ["graph", "table", "nothing"];
  const days = ["thismonth"];
  const graphTypes = ["bar"];
  const chosenCombinations = [];
  const positions = ["top", "middle"];
  const graphOption = {};
  for (let position of positions) {
    const usedCount = (type) =>
      chosenCombinations.filter(c => c && c.type === type).length;

    const usedGraph = usedCount("graph");
    const usedTable = usedCount("table");

    let filteredOptions = options.filter(type => {
      if (type === "graph" && usedGraph >= 2) return false;
      if (type === "table" && usedTable >= 2) return false;
      if ((usedGraph + usedTable) >= 3 && (type === "graph" || type === "table")) return false;
      return true;
    });

    const alert = new Alert();
    alert.message = `${t("showwhat")} ${t(position)}?`;
    filteredOptions.forEach(o => alert.addAction(t(o)));
    const index = await alert.presentAlert();
    const choice = filteredOptions[index];

    let day = "";
    if (choice === "graph") {
      const graphTypeAlert = new Alert();
      graphTypeAlert.title = t(position).charAt(0).toUpperCase() + t(position).slice(1);
      graphTypeAlert.message = t("choosegraphtype");
      graphTypes.forEach(g => graphTypeAlert.addAction(t(g)));
      const gIndex = await graphTypeAlert.presentAlert();
      const selectedGraphType = graphTypes[gIndex];
      graphOption[position] = selectedGraphType;
    }
    if (choice !== "nothing") {
      const usedDaysForType = chosenCombinations
        .filter(c => c.type === choice)
        .map(c => c.day);
      const availableDays = days.filter(d => !usedDaysForType.includes(d));
      const dayAlert = new Alert();
      dayAlert.title = t(position).charAt(0).toUpperCase() + t(position).slice(1);
      dayAlert.message = t("showday") + "?";
      availableDays.forEach(d => dayAlert.addAction(t(d)));
      const dayIndex = await dayAlert.presentAlert();
      day = availableDays[dayIndex];
    }

    chosenCombinations.push({ position, type: choice, day });
    settings[`showat${position}`] = `${choice}, ${day}`;
  }
  settings.graphOption = graphOption;
  
  fm.writeString(filePathSettings, JSON.stringify(settings, null, 2));
  const totalGraph = chosenCombinations.filter(c => c.type === "graph").length;
  const totalTable = chosenCombinations.filter(c => c.type === "table").length;
  const totalPriceStats = chosenCombinations.filter(c => c.type === "pricestats").length;
  const heightMap = {
    "1-0-0": 1000,
    "0-1-0": 800,
    "0-0-1": 800,
  
    "1-1-0": 750,
    "1-0-1": 1130,
    "0-1-1": 900,
    "2-0-0": 550,
    "0-2-0": 600,
  
    "1-1-1": 730,
    "2-1-0": 380,
    "1-2-0": 540,
    "2-0-1": 470,
    "0-2-1": 580,
    "1-0-2": 1050,
    "0-1-2": 900,
  };
  
  const key = `${totalGraph}-${totalTable}-${totalPriceStats}`;
  settings.height = heightMap[key] ?? 1150;
  return settings;
  }


// Select resolution
async function askForLanguage() {
  let alert = new Alert();
  alert.message = "Language/Språk:";
  alert.addAction("English");
  alert.addAction("Svenska");
  let index = await alert.presentAlert();
  settings.language = [1,3][index];
  fm.writeString(filePathSettings, JSON.stringify(settings, null, 2)); // Pretty print
  langId = settings.language; // 1 = ENG, 2 = DE, 3 = SV
  return [1,3][index];
}

// Select area
async function askForArea() {
  let alert = new Alert();
  alert.message = t("chooseyourelectricityarea") + ":";
  let areas = [
    "AT","BE","BG","DK1","DK2","EE","FI","FR","GER",
    "LT","LV","NL","NO1","NO2","NO3","NO4","NO5",
    "PL","SE1","SE2","SE3","SE4","TEL","SYS"
  ];
  for (let area of areas) {
    alert.addAction(area);
  }
  let index = await alert.presentAlert();
  let area = [
    "AT","BE","BG","DK1","DK2","EE","FI","FR","GER",
    "LT","LV","NL","NO1","NO2","NO3","NO4","NO5",
    "PL","SE1","SE2","SE3","SE4","TEL","SYS"][index];
  let vat = [
    20,  // AT - Austria
    6,   // BE - Belgium
    20,  // BG - Bulgaria
    25,  // DK1 - Denmark (East)
    25,  // DK2 - Denmark (West)
    20,  // EE - Estonia
    24,  // FI - Finland
    20,  // FR - France
    19,  // GER - Germany
    21,  // LT - Lithuania
    21,  // LV - Latvia
    21,  // NL - Netherlands
    25,  // NO1 - Norway
    25,  // NO2 - Norway
    25,  // NO3 - Norway
    25,  // NO4 - Norway
    25,  // NO5 - Norway
    23,  // PL - Poland
    25,  // SE1 - Sweden
    25,  // SE2 - Sweden
    25,  // SE3 - Sweden
    25,  // SE4 - Sweden
    19,   // TEL - Romania
    0    // SYS - System price or not applicable
    ][index];
  let currencies2 = [
    "EUR",  // AT - Austria
    "EUR",
    "BGN",
    "DKK",
    "DKK",
    "EUR",
    "EUR",
    "EUR",
    "EUR",
    "EUR",
    "EUR",
    "EUR",
    "NOK",
    "NOK",
    "NOK",
    "NOK",
    "NOK",
    "PLN",
    "SEK", // SE1 - Sweden
    "SEK", // SE2 - Sweden
    "SEK", // SE3 - Sweden
    "SEK", // SE4 - Sweden
    "RON",
    "EUR"
    ][index];
  return [area, vat, currencies2];
}

// Include VAT?
async function askForStatus() {
  let alert = new Alert();
  alert.message = t("doyouwantstatus") + "?";
  alert.addAction(t("yes"));
  alert.addAction(t("no"));
  let index = await alert.presentAlert();
  return [1,0][index];
}

// Include extra cost?
async function askForUsername() {
  let alert = new Alert();
  alert.title = t("username");
  alert.message = (t("askforusername"));
  alert.addTextField("example@mail.com",settings.username).setEmailAddressKeyboard();
  alert.addAction("OK");
  await alert.present();
  let input = alert.textFieldValue(0);
  username = input
  return input;
}

// Include extra cost?
async function askForPassword() {
  let alert = new Alert();
  alert.title = t("password");
  alert.message = (t("askforpassword"));
  alert.addTextField().setDefaultKeyboard();
  alert.addAction("OK");
  await alert.present();
  let input = alert.textFieldValue(0);
  password = input;
  return input;
}


async function Table(day) {
  //await Datas(day);
  //if (daybefore != day){
	  let left = listwidget.addStack();
	  let whatday = left.addText("Mode: " + service);
	  whatday.textColor = new Color("#ffffff");
	  whatday.font = Font.lightSystemFont(13);
	  left.addSpacer();
	  whatday = left.addText("Capacity: " + String(batteryCapacityKwh) +  "kWh");
	  whatday.textColor = new Color("#ffffff");
	  whatday.font = Font.lightSystemFont(13);
		left = listwidget.addStack();
	  whatday = left.addText("Up: " + String(FpUpInKw) + "kW");
	  whatday.textColor = new Color("#ffffff");
	  whatday.font = Font.lightSystemFont(13);
		left.addSpacer();
	  whatday = left.addText("Down: " + String(FpDownInKw) + "kW");
	  whatday.textColor = new Color("#ffffff");
	  whatday.font = Font.lightSystemFont(13);
		left = listwidget.addStack();
	  whatday = left.addText("Charge: " + String(ChargingMax) + "kW");
	  whatday.textColor = new Color("#ffffff");
	  whatday.font = Font.lightSystemFont(13);
		left.addSpacer();
	  whatday = left.addText("Discharge: " + String(DischargingMax) + "kW");
	  whatday.textColor = new Color("#ffffff");
	  whatday.font = Font.lightSystemFont(13);

  daybefore = day;
  let head = listwidget.addStack()
}

async function Graph(day, graphOption) {
//chart
  await Datas(day);

  if (60 == 60) {
    let graphtoday = "https://quickchart.io/chart?bkg=black&w=1300&h="+settings.height+"&c="
    graphtoday += encodeURI("{\
      data: { \
        labels: ["+daysArray+"],\
        datasets: [\
          {\
            data: ["+fcrdRevenues+"],\
            type: '"+graphOption+"',\
            fill: false,\
            borderColor: getGradientFillHelper('vertical',['rgb(0,255,0)','orange','rgb(255,0,0)']),\
            borderWidth: 20, \
            pointRadius: 0\
          },\
        ]\
      },\
        options:\
          {\
            legend:\
            {\
              display: false\
            },\
            scales:\
            {\
              xAxes: [{\
                offset:true,\
                ticks:{fontSize:30,fontColor:'white'}\
              }],\
              yAxes: [{\
                gridLines: {color:'white'},ticks:{stepSize:10,beginAtZero:true,fontSize:30,fontColor:'white'}\
              }]\
            }\
          }\
    }")
    graphtoday.timeoutInterval = 1;
    const GRAPH = await new Request(graphtoday).loadImage()
    let emptyrow = listwidget.addStack()
    listwidget.addSpacer(5)
    let chart = listwidget.addStack()
    chart.addImage(GRAPH) 
  }
  listwidget.addSpacer(5);
}

async function PriceStats(day) {
  await Datas(day);
  if (daybefore != day){
    let left = listwidget.addStack();
    let whatday = left.addText(date);
    whatday.textColor = new Color("#ffffff");
    whatday.font = Font.lightSystemFont(13);
    left.addSpacer();
    let updatetext = left.addText(t("updated") + updated);
    updatetext.font = Font.lightSystemFont(13);
    updatetext.textColor = new Color("#ffffff");
  }
  daybefore = day;
  if (prices == 0) {
    return;
    }
  let bottom = listwidget.addStack();
  if (day != "tomorrow"){
  
  // now
  let now = bottom.addText(t("now") + " " + Math.round(pricesJSON[hour]));
  now.font = Font.lightSystemFont(11);
  now.textColor = new Color("#00ffff");
  bottom.addSpacer();
    }
  // lowest
  let lowest = bottom.addText(t("lowest") + " " + Math.round(priceLowest));
  lowest.font = Font.lightSystemFont(11);
  lowest.textColor = new Color("#00cf00");
  bottom.addSpacer();
  // average
  let avg = bottom.addText(t("average") + " " + Math.round(priceAvg));
  avg.font = Font.lightSystemFont(11);
  avg.textColor = new Color("#f38");
  bottom.addSpacer();
  // highest
  let highest = bottom.addText(t("highest") + " " + Math.round(priceHighest));
  highest.font = Font.lightSystemFont(11);
  highest.textColor = new Color("#fa60ff");
  listwidget.addSpacer(5);
}

const smallFont = 10;
const mediumFont = 12;
const bigFont = 13.5;
const now = new Date();
// Hämta antalet dagar i innevarande månad
const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
// Skapa array från 1 till antal dagar
const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

// Today date
async function Datas(day) {
  allValues = [];
  Path = fm.joinPath(dir, "EiB_" + day + "Revenue.json");
  DateObj = new Date();
  async function getData() {
    if (day == "tomorrow") {
      DateObj.setDate(DateObj.getDate() + 1);
    }
    const yyyy = DateObj.getFullYear();
    const mm = String(DateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(DateObj.getDate()).padStart(2, '0');
    //const todate = `${yyyy}-${mm}-${dd}`;
    const todate = `2024-04-01`;
    const fromdate = `2024-03-01`;
    const Url = `https://api.checkwatt.se/ems/revenue?fromDate=${fromdate}&toDate=${todate}`;
    const request = new Request(Url);
    request.timeoutInterval = 1;
    let response = (await request.loadJSON());
    const dataJSON = JSON.stringify(response, null ,2);
    fm.writeString(Path, dataJSON);
  }
  if (fm.fileExists(Path)) {
    let modified = fm.modificationDate(Path);
    let now = new Date();
    let hoursDiff = (now - modified) / (1000 * 60 * 60);
    let modifiedDay = modified.getDate();
    let modifiedMonth = modified.getMonth();
    let modifiedYear = modified.getFullYear();
    let yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    let isFromYesterday =
    modifiedDay === yesterday.getDate() &&
    modifiedMonth === yesterday.getMonth() &&
    modifiedYear === yesterday.getFullYear();
    if (hoursDiff > 6 || isFromYesterday) {
      await getData();
    }
  } else {
    await getData();
  }
  hour = DateObj.getHours();
  minute = DateObj.getMinutes();
  let content = fm.readString(Path);
  response = JSON.parse(content);
}

async function renderSection(position) {
  const value = settings[`showat${position}`];
  if (!value || value === "nothing") return;

  const [type, day] = value.split(",").map(s => s.trim());
  const graphOption = settings.graphOption[position]
  switch (type) {
    case "table":
      await Table(day);
      break;
    case "graph":
      await Graph(day, graphOption);
      break;
    case "pricestats":
      await PriceStats(day);
      break;
    default:
  }
}

let listwidget = new ListWidget();

async function createWidget(){
	token = await loginAndGetToken();
	await fetchRevenue(token);
	await getDetails();
	await getStatus();
  //await main(); // get this month data
  listwidget.backgroundColor = new Color("#000000");
  await renderSection("top");
  await renderSection("middle");
  //await renderSection("bottom");  
  let ja = listwidget.addStack()
  let te = ja.addText(String(firstDayStr + " till " + lastDayStr))
  te.font = Font.lightSystemFont(13);
  te.textColor = new Color("#ffffff")
	
	ja = listwidget.addStack()
  te = ja.addText("FCR-D");
  te.font = Font.lightSystemFont(13);
  te.textColor = new Color("#ffffff");
  ja.addSpacer();
	te = ja.addText(String(Math.round(totalFcrd)) + "kr");
  te.font = Font.lightSystemFont(13);
  te.textColor = new Color("#ffffff");
	
  ja = listwidget.addStack()
  te = ja.addText("Savings");
  te.font = Font.lightSystemFont(13);
  te.textColor = new Color("#ffffff");
  ja.addSpacer();
	te = ja.addText(String(Math.round(totalSavings)) + "kr");
  te.font = Font.lightSystemFont(13);
  te.textColor = new Color("#ffffff");

	let moms = listwidget.addStack();
  momstext = moms.addText("v. " + version);
  momstext.font = Font.lightSystemFont(10);
  momstext.textColor = new Color("#ffffff");
  return listwidget
}

widget = await createWidget();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  if (Math.random() < 0.5) {
    let alert = new Alert();
    alert.title = "Support";
    alert.message = t("buymeacoffee") + "?";
    alert.addCancelAction(t("ofcourse"));
    alert.addAction(t("noway"));
    let response = await alert.present();
    if (response === -1) {
      Safari.open("https://buymeacoffee.com/flopp999");
    }
  }
}

widget.presentLarge()
Script.complete();

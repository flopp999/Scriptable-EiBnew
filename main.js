//support me with a coffee
//buymeacoffee.com/flopp999
//Thanks to Max Zeryck for the download-solution
let version = 0.9

const date = new Date();
const yyyy = date.getFullYear();
const mm = String(date.getMonth() + 1).padStart(2, '0'); // month are indexed from 0
const dd = String(date.getDate()).padStart(2, '0');
const formattedDate = `${yyyy}-${mm}-${dd}`;
const hour = date.getHours();
const minute = date.getMinutes();
const url = `https://dataportal-api.nordpoolgroup.com/api/DayAheadPriceIndices?date=${formattedDate}&market=DayAhead&indexNames=SE4&currency=SEK&resolutionInMinutes=15`;
const request = new Request(url);
const hours = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
let response = (await request.loadJSON());
let updated = response.updatedAt
updated = updated.replace(/\.\d+Z$/, '').replace('T', ' ');
const day = response.deliveryDateCET
let prices = response.multiIndexEntries
let allValues = [];

for (let i = 0; i < prices.length; i++) {
  const value = prices[i]["entryPerArea"]["SE4"];
  allValues.push(String(value/10));
}
let pricesJSON = JSON.parse(JSON.stringify(allValues));

//pricesJSON = ["53.7", "89.1", "60.2", "97.9", "70.8", "40.3", "48.6", "81.7", "26.4", "73.5","75.1", "39.7", "62.8", "18.5", "92.6", "33.1", "20.7", "11.4", "55.5", "46.9","85.0", "35.6", "79.2", "90.4", "66.7", "67.3", "28.8", "15.3", "99.6", "64.5","38.9", "57.2", "19.8", "71.6", "84.4", "49.5", "14.7", "63.1", "21.6", "44.2","78.5", "37.4", "17.2", "13.8", "12.6", "45.3", "58.6", "43.8", "16.9", "69.2","24.1", "41.6", "50.8", "36.3", "59.9", "95.4", "42.5", "93.7", "61.4", "27.5","47.7", "31.9", "32.8", "25.2", "83.6", "30.5", "74.2", "22.4", "77.1", "29.6","34.7", "52.1", "56.8", "23.3", "86.3", "65.4", "91.2", "68.4", "94.9", "98.5","76.3", "87.5", "88.7", "51.3", "80.1", "82.2", "72.7", "96.8", "87.0", "10.9","10.1", "10.4", "10.7", "11.9", "12.2", "13.5", "14.1", "15.8", "16.4", "17.7"]
  
const priceLowest = (Math.min(...pricesJSON.map(Number)));
const priceHighest = (Math.max(...pricesJSON.map(Number)));
const priceAvg = (pricesJSON.reduce((sum, val) => sum + Number(val), 0) / pricesJSON.length / 3);

async function createUpdate(){

  let listwidget = new ListWidget();
  listwidget.backgroundColor = new Color("#000000");
  let row = listwidget.addStack()
  row.layoutVertically()
  let left = row.addStack()
  left.layoutHorizontally()
  let whatday = left.addText("New update available")
  whatday.textColor = new Color("#ffffff");
  whatday.font = Font.lightSystemFont(20)
  return listwidget
  }

async function createWidget(){

  let listwidget = new ListWidget();
  listwidget.backgroundColor = new Color("#000000");
  let row = listwidget.addStack()
  row.layoutVertically()
  let left = row.addStack()
  left.layoutHorizontally()
  let whatday = left.addText(day)
  whatday.textColor = new Color("#ffffff");
  whatday.font = Font.lightSystemFont(20)
  let right = left.addStack()
  right.layoutVertically()
  let update = right.addStack()
  update.addSpacer()
  let updatetext = update.addText("uppdaterad "+updated);
  updatetext.font = Font.lightSystemFont(10)
  updatetext.textColor = new Color("#ffffff");
  let moms = right.addStack()
  moms.addSpacer()
  let momstext = moms.addText("ink.moms")
  momstext.font = Font.lightSystemFont(10)
  momstext.textColor = new Color("#ffffff");
  
  let head = listwidget.addStack()
  let stackNames = ["first", "second", "third", "fourth","fifth"];
  let timeStacks = {};
  let priceStacks = {};

  for (let name of stackNames) {
    let timeStack = head.addStack();
    timeStack.layoutVertically();
    head.addSpacer(4);
  
    let priceStack = head.addStack();
    priceStack.layoutVertically();
    if (name !== stackNames[stackNames.length - 1]) {
      head.addSpacer();
    }
    
    timeStacks[name] = timeStack;
    priceStacks[name] = priceStack;
  }

// Loop to fill all stacks
for (let s = 0; s < stackNames.length; s++) {
  let name = stackNames[s];
  let timeStack = timeStacks[name];
  let priceStack = priceStacks[name];

  let hourOffset = 0 + s * 5; // t.ex. 6, 8, 10
  // add time
  for (let i = hourOffset; i < hourOffset + 5; i++) {
    if (i == 24) {continue}
    for (let a = 0; a < 4; a++) {
      let timeText = timeStack.addText(`${i}:${a === 0 ? "00" : a * 15}`);
      timeText.leftAlignText();
      timeText.font = Font.lightSystemFont(12.3);
      if (i === hour && minute >= a * 15 && minute < (a + 1) * 15) {
        timeText.textColor = new Color("#00ffff");
      } else {
        timeText.textColor = new Color("#ffffff");
      }
    }
  }

  // add price
  let priceStart = 0 + s * 20;
  for (let i = priceStart; i < priceStart + 20; i++) {
    if (i==96) {break}
    let priceVal = Math.round(pricesJSON[i] * 1.25);
    let priceText = priceStack.addText(String(priceVal));
    priceText.leftAlignText();
    priceText.font = Font.lightSystemFont(12.3);
    
    if (pricesJSON[i] == priceLowest){
      priceText.textColor = new Color("#00ff00");
    } else if (pricesJSON[i] < priceAvg + priceLowest) {
      priceText.textColor = new Color("#ffff00")
    } else if (pricesJSON[i] == priceHighest){
      priceText.textColor = new Color("#ff00ff");
    } else if (pricesJSON[i] > priceHighest - priceAvg) {
      priceText.textColor =  new Color("#ff0000")
    } else {
      priceText.textColor = new Color("#f38")
    }
  }
}
log("rr")
return listwidget
}

response = 2

if (response == 2) {
  try {
    const req = new Request("https://raw.githubusercontent.com/flopp999/Scriptable-Nordpool/main/version.txt")
    const codeString = await req.loadString()
    if (version < codeString){
      let widget = await createUpdate();
      widget.presentLarge()
    }
    else {
      let widget = await createWidget();
      widget.presentLarge()
    }
  } catch {
    log("The update failed. Please try again later.")
  }
}

Script.complete();
// LINE Messaging API: Channel access token
const CHANNEL_ACCESS_TOKEN=PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_ACCESS_TOKEN");

// LINE user ID
const user_id = PropertiesService.getScriptProperties().getProperty("LINE_BOT_USER_ID");

// 特定のグループでのみbotが使用できるように制限
const GROUPID= PropertiesService.getScriptProperties().getProperty("MY_GROUP_ID_TEST");

// 使用するgmailアカウント
const GMAIL= PropertiesService.getScriptProperties().getProperty("MY_GMAIL_ACCOUNT");

const calender=CalendarApp.getCalendarById(GMAIL);

// 使用するGeminiのAPIキー
const GEMINI_API = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

var today = new Date();

var tommorow = new Date(today);
tommorow.setDate(tommorow.getDate()+1);

// 日程を見やすく調整(ex. 00月00日 00時00分)
function adjustDate(date){
  return (date.getMonth()+1).toString() + "月" + date.getDate() + "日 "+date.getHours().toString().padStart(2,"0")+"時"+date.getMinutes().toString().padStart(2,"0")+"分";
}
// イベントの出力を見やすく調整
function formatEvent(event){
  return (event.getStartTime().getMonth()+1)+"月"+event.getStartTime().getDate()+"日 "+adjustDate(event.getStartTime())+"~"+(event.getEndTime().getMonth()+1)+"月"+event.getEndTime().getDate()+"日 "+adjustDate(event.getEndTime())+" "+event.getTitle();
}
// カレンダーを取得
function getMyCalender(day=new Date(),fowardDay=7){
  day.setFullYear(today.getFullYear());
  var startday=new Date(day);
  var endday=new Date(startday);
  endday.setDate(endday.getDate()+fowardDay);
  var events=calender.getEvents(startday,endday);
  var events_arr=[];
  events.forEach(event => events_arr.push(event));
  return events_arr;
}

function myDebug(){
  Logger.log(notifyEventsInWeek());
}

// 全角文字を半角文字に変換
function em2half(str){
  return str.replace(/[０-９]/g,function(s){
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
  });
}

// カレンダー登録処理
function resisterCalender(json){
  /*  登録フォーマット
  *   登録
  *   MM月DD日HH時MM分
  *   Title
  *   (Description)
  *.  20241225JSON形式に改変
  *   
  {
    "name": "register",
    "date": {
        "start-date":{
          "day": "YYYY/MM/DD",
          "time": "HH/MM/SS",
        },
        "end-date":{
          "day": "YYYY/MM/DD",
          "time": "HH/MM/SS",
        },
      },
    "title": "CalenderTitle",
  }
  */
  var startday = new Date(`${json['date']['start-date'].day} ${json['date']['start-date'].time}`);
  var endday = new Date(`${json['date']['end-date'].day} ${json['date']['end-date'].time}`);
  var title = json.title;
  var message;
  try{
    var event = calender.createEvent(title,startday,endday);
    //message += "登録しました。";
    //message +="\n\n";
    //message+=formatEvent(event);
    message = generateFlexMessageToConfirmEvent(event);
  }catch(err){
    message += "問題が生じました。";
    message += err.toString();
  }
  return message;
}

// カレンダー削除処理
function removeCalender(cmd){
  /*  削除フォーマット
  *   削除
  *   MM月DD日
  *   Id
  */
  /*
  * TODO
  * ・削除処理ではIDを使って削除するイベントを指定するが、そのIDをどのように表示するか？そもそもlineユーザ側にIDを表示させるのか
  * ・ユーザ追加後の最初のメッセージやrootからの修正などでのメッセージ
  */
  var day = em2half(cmd[1]);
  var splited_day = day.split(/[^(0-9)]/);
  if(!splited_day[splited_day.length-1]){
    splited_day.pop();
  }
  var format_day = splited_day.join("/");

  var events = getMyCalender(new Date(format_day),1);
  var events_size = events.length;
  if(1<=parseInt(cmd[2])&&parseInt(cmd[2])<=events_size){
    events[parseInt(cmd[2])-1].deleteEvent();
    return "予定が削除されました。";
  }
  else{
    return "その予定は存在しません。";
  }
}
// カレンダー表示機能
function printCalender(cmd){
  /*  表示フォーマット
  *   表示
  *   (MM月DD日)
  */
  var message="";
  if(cmd.length==1){
    var events = getMyCalender();
    var events_arr =[];
    events.forEach(event => events_arr.push(formatEvent(event)));
    message = events_arr.join("\n");
    if(!message){
      message = "直近一週間の予定はありません。";
    }
  }
  else{
    var day = em2half(cmd[1]);
    var splited_day = day.split(/[^(0-9)]/);
    if(!splited_day[splited_day.length-1]){
      splited_day.pop();
    }
    var format_day = splited_day.join("/");

    var events = getMyCalender(new Date(format_day),1);
    var events_arr =[];
    events.forEach(event => events_arr.push(formatEvent(event)));
    message = events_arr.join("\n");
    if(!message){
      message = cmd[1] + "に予定はありません。";
    }
  }
  return message;
}

// 要求された内容をスプレッドシートに追記していく
function requiredFunction(cmd){
  return "要望を受け付けました。\nご協力ありがとうございます。";
}

// デバッグ用の関数
function debugMode(json,receivedmessage){
  receivedmessage.shift();
  var groupid=json.events[0].source.groupId;
  var message="To Root Message:\n";
  switch(receivedmessage[0]){
    case "getgroupid":
      message += "This group id is "+groupid;
      break;
    case "print":
      message += printCalender(receivedmessage);
      break;
    case "resister":
      message += resisterCalender(receivedmessage);
      break;
    case "remove":
      message += removeCalender(receivedmessage);
      break;
    case "require":
      message += requiredFunction(receivedmessage);
      break;
    case "todayevents":
      notifyEventsInDay();
      message += "Notify Today Events";
      break;
    case "weekevents":
      notifyEventsInWeek();
      message += "Notify Week Events";
      break;
    default:
      message += "None";
      break;
  }
  return message;
}


function doPost(e) {
  var json=JSON.parse(e.postData.contents);
  var replytoken= json.events[0].replyToken;
  if (typeof replytoken === 'undefined') {
    return;
  }
  var line_messaging_url = 'https://api.line.me/v2/bot/message/reply';
  var groupid=json.events[0].source.groupId;
  if(groupid != GROUPID){
    // 一旦余計なapi呼び出し生まないために，テストグループ以外は実行しないようにする
    return
  }
  var event_type = json.events[0].type;
  if(event_type == "postback"){
    // イベントidを取得してそのイベントを削除する．
    var event_id = json.events[0].postback.data;
    var event = calender.getEventById(event_id);
    event.deleteEvent();
    return;
  }
  var receivedmessage=json.events[0].message.text;
  const prompt = `文を以下に従うように分析して出力してください．
1. メッセージ内容から，ユーザがカレンダーに内容を追加して欲しい意図を含む文であるかどうかを判定する．
例えば，「XX月XX日にXXにいく予定を追加」といったものはユーザがカレンダーに日程を追加して欲しい意図を含んでいると判断できる．
しかし，「XX月XX日にXXにいく予定あったよね？」といったものはユーザがカレンダーに日程を追加して欲しいのではなく，
他のユーザに日程の有無を聞いているだけであるためそういった意図は含んでいないと判断できる．
もし追加して欲しい意図を含む内容ではないと判定すれば，
{
  "name": "undefind"
}
を返して終了する．
もし追加して欲しい意図を含む内容であると判定すれば2.に進む．
2. メッセージ内容から「予定の開始日」,「予定の開始時間」，「予定の終了日」，「予定の終了時間」，「予定内容」を抽出する．
ここで現在の日付は「${today.getFullYear()}/${today.getMonth()+1}/${today.getDate()}」であり，
現在時刻は「${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}」であるとする．
"明日"や"今日"という現在の日付に近しい日付を指す単語が含まれている場合は，現在の日付を基準にして特定の日付に変更して解釈すること．
ただし，「予定の開始日」「予定の終了日」は，現在の日付を基準にして最も未来の日付になるように調整すること．
例えば，現在の日付が「2024/12/31」であり予定の開始日が「1/1」である場合には，来年の予定であると判定できるため，
予定の開始日を「2025/01/01」と修正する．
ただし，現在の日付が「2024/12/30」であり予定の開始日が「12/31」である場合には，今年の予定の可能性が高いと判定できるため，
予定の開始日を「2024/12/31」と設定し修正してはいけない．
もし「予定の開始時間」がなければ"00:00:00"として扱う．
もし「予定の終了日」がなければ「予定の開始日」と同じ日として扱う．
もし「予定の終了時間」がなければ"23:59:59"として扱う．

3.に進む
3. 
{
    "name": "register",
    "date": {
      "start-date":{
        "day": "予定の開始日",
        "time": "予定の開始時間",
      },
      "end-date": {
        "day": "予定の終了日",
        "time": "予定の終了時間",
      },
    },
    "title": "予定内容",
}
上の形式に沿って出力すること．この際，一切の改行を行わなくて良い．
それ以外の出力は行わず，余計な情報の付与も必要ない．
また，「予定の開始日」「予定の終了日」は"YYYY/MM/DD"に合うようにすること．
「予定の開始時間」「予定の終了時間」は"HH:MM:SS"に合うようにすること．`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API}`
        , payload = {
            'contents': [
              {
                'parts': [{
                  'text': receivedmessage
                }],
                "role": "user"
              }
            ],
            "systemInstruction":{
                'parts':[{
                  'text': prompt
                }],
                "role": "model"
            },
          },
  options = {
            'method': 'post',
            'contentType': 'application/json',
            'payload': JSON.stringify(payload)
          };

  var res = UrlFetchApp.fetch(url, options);
  var res_json = JSON.parse(res.getContentText());
  var response_json_text = res_json.candidates[0].content.parts[0].text;
  response_json_text = response_json_text.toString().replace(/json/g,'').replace(/\`\`\`/g,''); // コードブロックの出力を置き換え
  
  var message;
  var response_json_parsed = JSON.parse(response_json_text)
  //message += response_json_text;
  
  //console.log(JSON.stringify(resJson));
  //message += JSON.stringify(response_json_parsed);
  if(response_json_parsed.name == "debug"){
    message = debugMode(json,receivedmessage);
  }
  else if(groupid!=GROUPID){
    message = "このグループで使用することはできません。";
  }
  else{
    switch(response_json_parsed.name){
      case "register":
          message = resisterCalender(response_json_parsed);
          break;
      case "削除":
          message = removeCalender(receivedmessage);
          break;
      case "表示":
          message = printCalender(receivedmessage);
          break;
      case "要望":
          message = requiredFunction(receivedmessage);
          break;
      default:
          message = "適切なコマンドを入力してください。";
          break;
          //return;
    }
  }
  var line_messaging_payload = JSON.stringify({
      'replyToken': replytoken,
      'messages': [{
          'type': "flex",
          'altText': "FlexMessageが表示できません．",
          'contents': message,
      },
      ],
    });
  UrlFetchApp.fetch(line_messaging_url, {
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN,
    },
    'method': 'post',
    'payload': line_messaging_payload,
  });
}


// トリガーにより毎日実行する関数(但し、予定がないと表示されない)
function notifyEventsInDay(){
  var message = "おはようございます。\n本日の予定は以下のようになっています。\n";
  message += "---------------------------\n";
  var events_today = getMyCalender(today,1);
  var events_today_arr =[];
  events_today.forEach(event => events_today_arr.push(formatEvent(event)));
  message += events_today_arr.join("\n");
  message += "\n";
  message += "---------------------------\n\n";

  
  // 予定がない場合
  if(events_today_arr.length==0){
    return 0;
  }


  var url = 'https://api.line.me/v2/bot/message/push';

  var payload = {
    to: GROUPID,
    messages: [
      { type: 'text', text: message }
    ]
  };

  var params = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload)
  };

  UrlFetchApp.fetch(url, params);
}

// トリガーにより毎週日曜日に実行する関数
function notifyEventsInWeek(){
  var message = "おはようございます。\n今週の予定は、以下のようになっています。\n"
  message += "---------------------------\n";
  var events_week = getMyCalender(tommorow,7-1);
  var events_week_arr =[];
  events_week.forEach(event => events_week_arr.push(formatEvent(event)));
  message += events_week_arr.join("\n");
  message += "\n";
  message += "---------------------------";


  // 予定がない場合、何も表示しない
  if(events_week_arr.length==0){
    return 0;
  }

  var url = 'https://api.line.me/v2/bot/message/push';

  var payload = {
    to: GROUPID,
    messages: [
      { type: 'text', text: message }
    ]
  };

  var params = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload)
  };

  UrlFetchApp.fetch(url, params);
}

function debugBySpreadSheet(url,debug_str){
  const spreadsheet = SpreadsheetApp.openByUrl(url);
  const sheet = spreadsheet.getActiveSheet();
  var cell = sheet.getRange("A1");
  cell.setValue(debug_str);
}
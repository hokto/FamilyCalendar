// LINE Messaging API: Channel access token
const CHANNEL_ACCESS_TOKEN=PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_ACCESS_TOKEN");

// LINE user ID
const LINE_BOT_USER_ID = PropertiesService.getScriptProperties().getProperty("LINE_BOT_USER_ID");

// LINE Messaging API: Reply
const LINE_MESSAGING_REPLY_URL =  PropertiesService.getScriptProperties().getProperty("LINE_MESSAGING_REPLY_URL");

// LINE Messaging API: Post
const LINE_MESSAGING_POST_URL = PropertiesService.getScriptProperties().getProperty("LINE_MESSAGING_POST_URL");

// 特定のグループでのみbotが使用できるように制限
const GROUP_ID= PropertiesService.getScriptProperties().getProperty("MY_GROUP_ID_TEST");

// 使用するgmailアカウント
const MY_GMAIL_ACCOUNT= PropertiesService.getScriptProperties().getProperty("MY_GMAIL_ACCOUNT");

const calender=CalendarApp.getCalendarById(MY_GMAIL_ACCOUNT);

// 使用するGeminiのAPIキー
const GEMINI_API = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

// GEMINI-1.5-flashにプロンプトを投げるurl
const GEMINI_FLASH_URL = PropertiesService.getScriptProperties().getProperty("GEMINI_FLASH_URL");

// エラーログを記録するためのシートurl
const ERROR_LOG_SHEET_URL = PropertiesService.getScriptProperties().getProperty("ERROR_LOG_SHEET_URL");

var today = new Date();

var tommorow = new Date(today);
tommorow.setDate(tommorow.getDate()+1);

// 日程を見やすく調整(ex. 00月00日 00時00分)
function adjustDate(date){
  return (date.getMonth()+1).toString() + "月" + date.getDate() + "日 "+date.getHours().toString().padStart(2,"0")+"時"+date.getMinutes().toString().padStart(2,"0")+"分";
}
// イベントの出力を見やすく調整
function formatEvent(event){
  return adjustDate(event.getStartTime())+"~"+adjustDate(event.getEndTime())+" "+event.getTitle();
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

// 全角文字を半角文字に変換
function em2half(str){
  return str.replace(/[０-９]/g,function(s){
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
  });
}

// カレンダー登録処理
function addEvent(json,replytoken){
  /*  登録フォーマット
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
  try{
    var event = calender.createEvent(title,startday,endday);
    var message = generateFlexMessageToConfirmEvent(event);
    return JSON.stringify({
        'replyToken': replytoken,
        'messages': [{
            'type': "flex",
            'altText': "CalendarFlexMessage",
            'contents': message,
        },
        ],
      });
  }catch(error){
    logErrorBySpreadSheet("addEventError",`Error occured by addEvent. ${error}`);
    return JSON.stringify({
      'replyToken': replytoken,
      'messages': [{
        'type' : 'text',
        'text' : "エラーが発生しました．もう一度試してください．",
      },
    ]
    });
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

// カレンダー表示処理（Gemini解析結果から日付範囲を受け取って表示）
function displayEvents(json, replytoken){
  var startday = new Date(json['date']['start-date']);
  var endday = new Date(json['date']['end-date']);
  endday.setDate(endday.getDate() + 1); // 終了日当日を含む
  try{
    var events = calender.getEvents(startday, endday);
    if(events.length === 0){
      return JSON.stringify({
        'replyToken': replytoken,
        'messages': [{'type': 'text', 'text': "その期間に予定はありません。"}]
      });
    }
    var contents = generateFlexMessageToDisplayEvents(events);
    return JSON.stringify({
      'replyToken': replytoken,
      'messages': [{'type': 'flex', 'altText': '予定一覧', 'contents': contents}]
    });
  }catch(error){
    logErrorBySpreadSheet("displayEventsError", `Error occured by displayEvents. ${error}`);
    return JSON.stringify({
      'replyToken': replytoken,
      'messages': [{'type': 'text', 'text': "予定の取得に失敗しました．もう一度試してください．"}]
    });
  }
}

function deleteEventById(event_id){
  var event = calender.getEventById(event_id);
  var handle_delete_message;
  try{
    event.deleteEvent();
    handle_delete_message = "このイベントを削除しました．"
  }
  catch(error){
    logErrorBySpreadSheet("deleteEventError",`Error occured by deleteEventById. ${error}`);
    handle_delete_message = "イベントの削除に失敗しました．"
  }
  return handle_delete_message;
}
// 削除対象のイベントを検索し，確認用FlexMessageを返す
function searchAndConfirmDelete(json, replytoken){
  var startday = new Date(json['date']['start-date']);
  var endday = new Date(json['date']['end-date']);
  endday.setDate(endday.getDate() + 1);
  try{
    var events = calender.getEvents(startday, endday);
    if(json.title){
      events = events.filter(e => e.getTitle().includes(json.title));
    }
    if(events.length === 0){
      return JSON.stringify({
        'replyToken': replytoken,
        'messages': [{'type': 'text', 'text': "該当する予定が見つかりませんでした。"}]
      });
    }
    var flex_contents = events.map(e => generateFlexMessageToConfirmEvent(e));
    var contents = flex_contents.length === 1
      ? flex_contents[0]
      : {'type': 'carousel', 'contents': flex_contents};
    return JSON.stringify({
      'replyToken': replytoken,
      'messages': [{'type': 'flex', 'altText': '削除する予定の確認', 'contents': contents}]
    });
  }catch(error){
    logErrorBySpreadSheet("searchAndConfirmDeleteError", `Error occured by searchAndConfirmDelete. ${error}`);
    return JSON.stringify({
      'replyToken': replytoken,
      'messages': [{'type': 'text', 'text': "予定の検索に失敗しました．もう一度試してください．"}]
    });
  }
}

// イベント削除ボタンのイベントハンドリング
function handleDeleteButtonClick(postback_data,replytoken){
    // イベントidを取得してそのイベントを削除する．
    var event_id = postback_data.data;
    var message = deleteEventById(event_id);
    return JSON.stringify({
      'replyToken': replytoken,
      'messages':[
        {
          'type' : 'text',
          'text' : message,
        },
      ]
    });
}

// メッセージから命令内容を検出する
function detectCalendarCommandByMessage(received_message){
    const prompt_to_gemini = `あなたはカレンダー操作アシスタントです。メッセージを分析し，JSON形式のみで回答してください。改行・コードブロックは不要です。

現在日時: ${today.getFullYear()}/${today.getMonth()+1}/${today.getDate()} ${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}

## 操作の種類
- register: 予定を追加・登録したい意図
- display: 予定を確認・見たい意図
- delete: 予定を削除・取り消したい意図
- unknown: カレンダー操作の意図が読み取れない

## 出力フォーマット

unknown の場合:
{"name":"unknown"}

register の場合（日付は現在日時を基準に最も近い未来の日付に調整すること。開始時間不明→"00:00:00"，終了日不明→開始日と同日，終了時間不明→開始の1時間後）:
{"name":"register","date":{"start-date":{"day":"YYYY/MM/DD","time":"HH:MM:SS"},"end-date":{"day":"YYYY/MM/DD","time":"HH:MM:SS"}},"title":"予定内容"}

display の場合（日付範囲不明なら今日から7日後）:
{"name":"display","date":{"start-date":"YYYY/MM/DD","end-date":"YYYY/MM/DD"}}

delete の場合（日付範囲不明なら今日から7日後，タイトルヒントなければ空文字）:
{"name":"delete","date":{"start-date":"YYYY/MM/DD","end-date":"YYYY/MM/DD"},"title":"タイトルのヒント"}`;

    const url = `${GEMINI_FLASH_URL}?key=${GEMINI_API}`
          , payload = {
              'contents': [
                {
                  'parts': [{
                    'text': received_message
                  }],
                  "role": "user"
                }
              ],
              "systemInstruction":{
                  'parts':[{
                    'text': prompt_to_gemini
                  }],
                  "role": "model"
              },
            },
    options = {
              'method': 'post',
              'contentType': 'application/json',
              'payload': JSON.stringify(payload)
            };

    var detected_result = UrlFetchApp.fetch(url, options);
    var detected_result_json = JSON.parse(detected_result.getContentText());
    var response_json_text = detected_result_json.candidates[0].content.parts[0].text;
    response_json_text = response_json_text.toString().replace(/json/g,'').replace(/\`\`\`/g,''); // コードブロックの出力を置き換え
    
    return JSON.parse(response_json_text)
}

// 日付・時間・相対日付・カレンダー表示意図のパターンを検出するプリフィルタ
function containsDatePattern(text) {
  const normalized = em2half(text); // 全角数字を半角に統一
  const patterns = [
    /\d{1,2}[\/\-]\d{1,2}/,                                          // 4/1, 4-1
    /\d{1,2}月\d{1,2}日/,                                            // 4月1日
    /今日|明日|明後日/,                                                // 今日, 明日
    /今週|来週|再来週/,                                                // 来週
    /月曜|火曜|水曜|木曜|金曜|土曜|日曜/,                              // 曜日
    /\d{1,2}時/,                                                      // 15時
    /予定.{0,10}(見|確認|教え|見せ)|(見|確認|教え|見せ).{0,10}予定|スケジュール/, // 表示意図
  ];
  return patterns.some(p => p.test(normalized));
}

function doPost(e) {
  var json=JSON.parse(e.postData.contents);
  var replytoken= json.events[0].replyToken;
  if (typeof replytoken === 'undefined') {
    return;
  }
  var group_id=json.events[0].source.groupId;
  if(group_id != GROUP_ID){
    // 一旦余計なapi呼び出し生まないために，決めたグループ以外は実行しないようにする
    return;
  }
  var event_type = json.events[0].type;
  var line_messaging_payload;
  if(event_type == "postback"){
    line_messaging_payload = handleDeleteButtonClick(json.events[0].postback,replytoken);
  }
  else{
    var received_message=json.events[0].message.text;
    // 日付パターンがなければカレンダー操作ではないと判断し，Gemini APIを呼ばずに終了
    if(!containsDatePattern(received_message)){
      return;
    }
    var parsed_response_json = detectCalendarCommandByMessage(received_message);
    switch(parsed_response_json.name){
      case "register":
        line_messaging_payload = addEvent(parsed_response_json,replytoken);
        break;
      case "display":
        line_messaging_payload = displayEvents(parsed_response_json,replytoken);
        break;
      case "delete":
        line_messaging_payload = searchAndConfirmDelete(parsed_response_json,replytoken);
        break;
      default:
        return; // unknown: カレンダー操作ではないと判断し返答しない
    }
  }
  UrlFetchApp.fetch(LINE_MESSAGING_REPLY_URL, {
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

  var payload = {
    to: GROUP_ID,
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

  UrlFetchApp.fetch(LINE_MESSAGING_POST_URL, params);
}

function logErrorBySpreadSheet(log_error_kind,log_error_message){
  const spreadsheet = SpreadsheetApp.openByUrl(ERROR_LOG_SHEET_URL);
  const sheet = spreadsheet.getActiveSheet();
  var insert_log_row = sheet.getLastRow() + 1; // データがある次の行を参照
  var log_occur_time_cell = sheet.getRange(insert_log_row,1);
  log_occur_time_cell.setValue((new Date()).toString()); // 現在の時刻を記入
  var log_error_kind_cell = sheet.getRange(insert_log_row,2);
  log_error_kind_cell.setValue(log_error_kind); // エラーの種類を記録
  var log_error_message_cell = sheet.getRange(insert_log_row,3);
  log_error_message_cell.setValue(log_error_message); // エラー内容を記録
}

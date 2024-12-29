// イベントをもとに，タイトル・カレンダー・イベント時間・確認ボタンを持つflexmessageを生成
function generateFlexMessageToConfirmEvent(event) {
  const title_of_flex_message = generateFlexMessageWithTitle(event);
  const calender_of_flex_message = generateFlexMessageWithCalender(event);
  const event_time_of_flex_message = generateFlexMessageWithEventTime(event);
  const confirm_button_of_flex_messsage = generateFlexMessageWithConfirmButton(event);
  const separator_component = {
    type: "separator",
    margin: "lg",
  };
  const flex_message = {
    type: "bubble",
    body:{
      type: "box",
      layout: "vertical",
      contents:[
        title_of_flex_message,
        separator_component,
        calender_of_flex_message,
        separator_component,
        event_time_of_flex_message,
        separator_component,
        confirm_button_of_flex_messsage
      ]
    }
  };

  return flex_message;
}

// イベントのタイトルを表記する
function generateFlexMessageWithTitle(event){
  const event_title = event.getTitle();
  var title_component = {
    type: "box",
    layout: "horizontal",
    contents:[
      {
        type: "text",
        text: event_title,
        weight: "bold",
        size: "lg",
        align: "center",
      }
    ]
  };
  return title_component;
}

// イベントの開始・終了日にちに合うようにカレンダーを生成(ただし，現段階では月は跨がないものとする)
function generateFlexMessageWithCalender(event){
  const start_time = event.getStartTime();
  const end_time = event.getEndTime();
  const year = start_time.getFullYear();
  const month = start_time.getMonth() + 1;
  const start_date = start_time.getDate();
  const end_date = end_time.getDate();
  const days_in_month = new Date(year,month,0).getDate(); // year,monthの日にちを取得
  const first_day_of_week = new Date(year,month-1,1).getDay(); // 1日の曜日を取得

  var calender_component = {
    type: "box",
    layout: "vertical",
    contents: []
  };
  // カレンダータイトル
  calender_component.contents.push({
    type:"text",
    text: `${year}年 ${month}月`,
    weight: "bold",
    size: "lg",
    align: "center",
    margin: "md",
  });

  // 曜日ヘッダー
  const week_days = ["日","月","火","水","木","金","土"];
  const week_header = {
    type: "box",
    layout: "horizontal",
    contents: week_days.map(day =>({
      type: "text",
      text: day,
      align: "center",
      weight: "bold",
      size: "sm",
    }))
  };
  calender_component.contents.push(week_header);
  // 区切り
  const separator_component_for_calender = {
    type: "separator",
    margin: "sm",
  };  
  calender_component.contents.push(separator_component_for_calender);

  // カレンダーの日付部分
  var day_cnt = 1;
  while(day_cnt <= days_in_month){
    var week_row = {
      type: "box",
      layout: "horizontal",
      contents: [],
    };
    for(var i=0;i<7;i++){
      // カレンダーに日付表記がない領域
      if ((day_cnt == 1 && i < first_day_of_week) || day_cnt > days_in_month){
        week_row.contents.push({
          type: "text",
          text: " ",
          align: "center",
          size: "sm",
        });
      }
      else{
        week_row.contents.push({
          type: "text",
          text: day_cnt.toString(),
          align: "center",
          size: "sm",
        });
        day_cnt ++;
      }
    }
    calender_component.contents.push(week_row);
  }
  return calender_component;
}

// イベントの開始時間，終了時間を表記する
function generateFlexMessageWithEventTime(event){
  const event_time_formatted = formatEvent(event);
  var event_time_component = {
    type: "box",
    layout: "horizontal",
    contents: [
      {
        type: "text",
        text: event_time_formatted,
        size: "md",
        align: "center",
      }
    ],
    margin: "sm"
  };
  return event_time_component;
}

// 間違っていた時の削除ボタンを用意する
// 削除ボタンを押したときは，返されるidによって削除対象のイベントを特定できるようにする．
function generateFlexMessageWithConfirmButton(event){
  const event_id = event.getId(); // イベント特有のidを取得
  const confirm_button_component = {
    type: "button",
    action: {
      type: "postback",
      label: "削除",
      data: event_id,
    },
    color: "#FF0000",
    style: "primary",
  }
  return confirm_button_component;
}

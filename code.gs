function doGet() {
  //var html_file = HtmlService.createHtmlOutputFromFile("index.html");
  var html_file = HtmlService.createTemplateFromFile("index.html").evaluate();
  return html_file.setTitle('gmail送信予約');
}

function getContent(filename) {
  var content= HtmlService.createTemplateFromFile(filename).getRawContent();
  return content;
}

function Reserve(url, dateData){
  var sheet = SpreadsheetApp.openByUrl(url).getActiveSheet();
  
　if(sheet != null){      
   /* 現在のシートを削除 */
    sheet.getRange(2, 1, sheet.getLastRow() + 1, 5).clearContent(); //A2からE最終行+1　の範囲のセルデータ削除

    /* 存在しているトリガーすべてを削除（シート上には見えてないトリガーもあるので） */
    var trigger = ScriptApp.getProjectTriggers();
    for (var i = 0; i < trigger.length; i++) {
        if (trigger[i].getHandlerFunction() === "Send" || trigger[i].getHandlerFunction() === "Reply") {
            ScriptApp.deleteTrigger(trigger[i]);
        }
    }

   sheet.getRange("A1").setValue('test');
   
    /* スプレッドシートにGmailの下書きをインポート */
    var draft = GmailApp.getDraftMessages();
    if (draft.length > 0) {
        var rows = [];
          
        /*for (var i = 0; i < draft.length; i++) { //下書きを新しいものから順に読み込む
            if (draft[i].getTo() !== "") {
                rows.push([draft[i].getId(), draft[i].getTo(), draft[i].getSubject(), "", ""]);
            }
        }*/
      
        for (var i = draft.length - 1, j = 0; i >= 0; i--, j++) { //下書きを古いものから順に読み込む バックアップから日時を取得
            if (draft[i].getTo() !== "") {
              //rows.push([draft[i].getId(), draft[i].getTo(), draft[i].getSubject(), dateData.year+'/'+dateData.month+'/'+dateData.day+' '+dateData.hour+':'+dateData.minute+':00', ""]);
              rows.push([draft[i].getId(), draft[i].getTo(), draft[i].getSubject(), dateData[j] + ':00', ""]);
            }
        }
        sheet.getRange(2, 1, rows.length, 5).setValues(rows);
    }
   
    var data = sheet.getDataRange().getValues();
    var time = new Date().getTime();
    var code = [];
  
    for (var row in data) {
        if (row != 0) {
            var schedule = data[row][3];
            var subject = data[row][2];
           
            if (schedule !== "") {
                if (schedule.getTime() > time) {
                  if(/Re:/.test(subject) == false){
                      ScriptApp.newTrigger("Send")
                          .timeBased()
                          .at(schedule)
                          .inTimezone(SpreadsheetApp.openByUrl(url).getSpreadsheetTimeZone())
                          .create();
                      code.push("送信予約済");
                    }
                  else if(/Re:/.test(subject) == true){
                       ScriptApp.newTrigger("Reply")
                          .timeBased()
                          .at(schedule)
                          .inTimezone(SpreadsheetApp.openByUrl(url).getSpreadsheetTimeZone())
                          .create();
                      code.push("返信予約済");
                  }
                  else {
                      code.push("例外：scheduleかtimeかsubjectがおかしい"); 
                  }
                  
                } else {
                    code.push("昔には送れません");
                }
            } else {
                code.push("予約なし");
            }
        }
    }
   
    for (var i = 0; i < code.length; i++) {
        sheet.getRange("E" + (i + 2)).setValue(code[i]);
    }
   
   
　}

}

function Send() {
    var url = "https://docs.google.com/spreadsheets/d/xxxxxxxxxxxxxxxxxxx/edit#gid=0";
    var sheet = SpreadsheetApp.openByUrl(url).getActiveSheet();
    var data = sheet.getDataRange().getValues();
    var time = new Date().getTime();
    for (var row = 1; row < data.length; row++) {
        if (data[row][4] == "送信予約済") {
            var schedule = data[row][3];
            if ((schedule != "") && (schedule.getTime() <= time)) {
                var message = GmailApp.getMessageById(data[row][0]);
                var body = message.getBody();
                var options = {
                    cc: message.getCc(),
                    bcc: message.getBcc(),
                    htmlBody: body,
                    replyTo: message.getReplyTo(),
                    attachments: message.getAttachments(),
                    from: message.getFrom()
                }

                /* Send a copy of the draft message and move it to Gmail trash */
                GmailApp.sendEmail(message.getTo(), message.getSubject(), body, options);
                message.moveToTrash();
                sheet.getRange("E" + (row + 1)).setValue("送信完了");
            }
        }
    }
}

function Reply() {
    var url = "https://docs.google.com/spreadsheets/d/xxxxxxxxxxxxxxxxxxx/edit#gid=0";
    var sheet = SpreadsheetApp.openByUrl(url).getActiveSheet();
    var data = sheet.getDataRange().getValues();
    var time = new Date().getTime();
    for (var row = 1; row < data.length; row++) {
        if (data[row][4] == "返信予約済") {
            var schedule = data[row][3];
            if ((schedule != "") && (schedule.getTime() <= time)) {
                var message = GmailApp.getMessageById(data[row][0]);
                var body = message.getBody();
                var options = {
                    htmlBody: body,
                    //To: message.getTo(),
                    attachments: message.getAttachments(),
                    from: message.getFrom()
                }

                message.reply(body, options);
                message.moveToTrash();
                sheet.getRange("E" + (row + 1)).setValue("送信完了");
            }
        }
    }
}
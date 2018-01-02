var request = require('request');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

let FACEBOOK_VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;
let FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
let FACEBOOK_SEND_MESSAGE_URL = 'https://graph.facebook.com/v2.6/me/messages?access_token=' + FACEBOOK_PAGE_ACCESS_TOKEN;
let WIKIPEDIA_API_URL = 'https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=';


//your routes here
app.get('/', function (req, res) {
    res.send("Hello World, I am an FB bot.")
});

app.get('/webhook/', function(req, res) {
  if (req.query['hub.verify_token'] === FACEBOOK_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge'])
        return;
    }
    res.send('Error, wrong token')
});

app.post('/webhook/', function(req, res) {
  console.log(JSON.stringify(req.body));
  if (req.body.object === 'page') {
    if (req.body.entry) {
      req.body.entry.forEach(function(entry) {
        if (entry.messaging) {
          entry.messaging.forEach(function(messagingObject) {
              var senderId = messagingObject.sender.id;
              if (messagingObject.message) {
                if (!messagingObject.message.is_echo) {
                  //Assuming that everything sent to this bot is a movie name.
                  var searchTerm = messagingObject.message.text;
                  getWikiDefinition(senderId, searchTerm);
                }
              } else if (messagingObject.postback) {
                console.log('Received Postback message from ' + senderId);
              }
          });
        } else {
          console.log('Error: No messaging key found');
        }
      });
    } else {
      console.log('Error: No entry key found');
    }
  } else {
    console.log('Error: Not a page object');
  }
  // res.jsonp();
  res.sendStatus(200);
})

function sendUIMessageToUser(senderId, elementList) {
  request({
    url: FACEBOOK_SEND_MESSAGE_URL,
    method: 'POST',
    json: {
      recipient: {
        id: senderId
      },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: elementList
          }
        }
      }
    }
  }, function(error, response, body) {
        if (error) {
          console.log('Error sending UI message to user: ' + error.toString());
        } else if (response.body.error){
          console.log('Error sending UI message to user: ' + JSON.stringify(response.body.error));
        }
  });
}

function sendMessageToUser(senderId, message) {
  request({
    url: FACEBOOK_SEND_MESSAGE_URL,
    method: 'POST',
    json: {
      recipient: {
        id: senderId
      },
      message: {
        text: message
      }
    }
  }, function(error, response, body) {
        if (error) {
          console.log('Error sending message to user: ' + error);
        } else if (response.body.error){
          console.log('Error sending message to user: ' + response.body.error);
        }
  });
}

function showTypingIndicatorToUser(senderId, isTyping) {
  var senderAction = isTyping ? 'typing_on' : 'typing_off';
  request({
    url: FACEBOOK_SEND_MESSAGE_URL,
    method: 'POST',
    json: {
      recipient: {
        id: senderId
      },
      sender_action: senderAction
    }
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending typing indicator to user: ' + error);
    } else if (response.body.error){
      console.log('Error sending typing indicator to user: ' + response.body.error);
    }
  });
}


function getWikiDefinition(senderId, searchTerm) {
  showTypingIndicatorToUser(senderId, true);
  let restUrl = WIKIPEDIA_API_URL + searchTerm;
  request.get(restUrl, (err, response, body) => {
    if (!err && response.statusCode == 200) {
      let json = JSON.parse(body);
      console.log(json);
      // let fahr = Math.round(json.main.temp);
      // let cels = Math.round((fahr - 32) * 5/9);
      let head = 'This is what i found in wikipedia for ' + json[1][0] + ' : ';
      let des =  json[2][0];
      let msg=head+'\n\n'+des;
      showTypingIndicatorToUser(senderId, true);
      sendMessageToUser(senderId, msg);
      showTypingIndicatorToUser(senderId, false);
    } else {
      let errorMessage = 'Could not find any information on search Term: ' + searchTerm + ' .';
      showTypingIndicatorToUser(senderId, true);
      sendMessageToUser(senderId, errorMessage);
      showTypingIndicatorToUser(senderId, false);
    }
  })
}

app.listen(8080, function () {
  console.log('Example app listening on port 8080!');
});

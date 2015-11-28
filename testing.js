var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
   res.sendFile(__dirname + '/index.html');
 // res.sendFile(__dirname + '/plzDoJudge.html');
});
app.get('/global.js', function(req, res){
   res.sendFile(__dirname + '/global.js');
 // res.sendFile(__dirname + '/plzDoJudge.html');
});


var users = [];
var bullets= [];
var nextUserNum = 1;
io.on('connection', function(socket){

  nextUserNum++;
  var user = { id: nextUserNum, key: Math.random() * 1000000, location: {x:0,y:0}, locationToward:{x:0,y:0}}
  users.push(user);

  socket.emit('user handshake', user);

  console.log('a user connected: ' + user.id + " with key " + user.key);

  socket.on('disconnect', function(){
	//users.remove(user);
  	for(var i=0;i<users.length;i++ ){
  		if(users[i] == user) {
  			users.splice(i,i+1);
  			break;
  		}
  	}
    console.log('user disconnected');
  });
  socket.on('bullet', function(angle) {
        
  });
  socket.on('location', function(location) {
	    user.locationToward = location;
	    console.log('location' + user.locationToward.x + " " + user.locationToward.y);
  });
  socket.on('chat message', function(msg){
      console.log('message: ' + msg + " -- from: " + user.id);
	io.emit('chat message', "id: " + user.id +  msg );
  });

  socket.on('ping', function() {
      socket.emit('pong');
  });
});

//Global data sender
setInterval(function(){
	var allPlayers = [];
	console.log(users.length);

  //User movement ---------------------------------------------------------->
	for(var i=0;i<users.length;i++) {
		  var u = users[i];
		  //Find angle
		  var changeX = u.locationToward.x - u.location.x ;
	    var changeY = u.locationToward.y - u.location.y;
		if(changeX == 0 && changeY == 0) {

		} else {
		var m = 7;
			if(Math.pow((Math.pow(changeX,2) + Math.pow(changeY,2)),.5) < 7) {
				m = Math.pow((Math.pow(changeX,2) + Math.pow(changeY,2)),.5);
			}

			var mag = m / Math.pow((Math.pow(changeX,2) + Math.pow(changeY,2)),.5);
			u.location.x += changeX * mag;
			u.location.y += changeY * mag;
		  }
		//var angle = Math.atan(changeY/changeX) * 180 / 3.1415926;
		//if(changeX < 0 && changeY >= 0) {
		//	angle = 180 + angle;
		//} else if(changeX < 0 && changeY < 0) {
		//	angle = 180 - angle;
		//}

		//else if (angle < 0) {
		//	angle = 360 - angle;
		//}
		//magnitude is 12

		var player = { id:u.id, location:u.location };
		console.log("HI " + u.location.x + " " + u.location.y);
		allPlayers.push(player);
	}
	

	io.emit('data', allPlayers);
}, 1000/30); //Fps sending

http.listen(80, function(){
  console.log('listening on *:80');
});

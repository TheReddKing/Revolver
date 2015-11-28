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
  var user = { id: nextUserNum, key: Math.random() * 1000000, location: {x:0,y:0}, locationToward:{x:0,y:0},angle:0,canShoot:true}
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
     if(user.canShoot) {
    	var spacing = 40;
    	var x=Math.cos(user.angle)*spacing + user.location.x;
    	var y=Math.sin(user.angle)*spacing + user.location.y;
        var bullet = {id:user.id, location:{x:x, y:y},angle:user.angle+(Math.PI/2)};
    	console.log(x + " " + y + "DELAY " + (user.angle-angle));
        user.canShoot = false;
        setTimeout(function() {
            user.canShoot = true;
        },500);
    	bullets.push(bullet);
     }
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

function collides(a,b)
{
    var distance_squared = ( ((a.location.x - b.location.x) * (a.location.x - b.location.x)) +
                            ((a.location.y - b.location.y) * (a.location.y - b.location.y)));

    var radii_squared = (20 + 10) * (20 + 10);
    if (distance_squared < radii_squared) {
        return true;
    } else {
        return false;
    }
}

//Global data sender
setInterval(function(){
	var allPlayers = [];
	var allBullets = [];
	// console.log(users.length);

	for(var b =bullets.length-1;b>=0;b--)
	{
	    for(var u = users.length-1;u>=0;u--)
		{
		    if(collides(users[u],bullets[b]))
			{
			    if(bullets[u].id!=users[u].id){
				    console.log("COLLISION");
          		    bullets.splice(b,b+1);
                    break;
				}
                
			}
		}
	}

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
		u.angle += Math.PI/180 * 8;
		var player = { id:u.id, location:u.location,angle:u.angle,shoot:u.canShoot};
		// console.log("HI " + u.location.x + " " + u.location.y + " " + u.angle);
		allPlayers.push(player);
	}
	for(var i=0;i<bullets.length;i++)
	{
	    var b=bullets[i];
		b.location.x+=Math.cos(b.angle) * 10;
		b.location.y+=Math.sin(b.angle) * 10;
		allBullets.push({location:b.location,id:b.id});
	}

	io.emit('data', allPlayers,allBullets);
}, 1000/30); //Fps sending

http.listen(80, function(){
  console.log('listening on *:80');
});

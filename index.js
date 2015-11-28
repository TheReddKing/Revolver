var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
   res.sendFile(__dirname + '/index.html');
 // res.sendFile(__dirname + '/plzDoJudge.html');
});
app.get('/global.js', function(req, res){
   res.sendFile(__dirname + '/global.js');
});
app.get('/css.css', function(req, res){
   res.sendFile(__dirname + '/css.css');
});


var users = [];
var bullets= [];
var nextUserNum = 1;
var bulletWrapper =  function(){
    this.bullet;
    this.bulletNext;
    this.init = function(bullet) {
        this.bullet = bullet;
    },
    this.addNextBullet = function(bulletNext) {
        this.bulletNext = bulletNext;
    },
    this.nextBullet = function() {
        return bulletNext;
    }
}
var bulletController = {
    moreBullets: null,
    moreBulletsEnd : null, //Of wrapper bulletWrapper
    bullets : [],

    init:function(){
	},
    addBullet:function(bullet) {
        var wrapper = new bulletWrapper();
        wrapper.init(bullet);
        if(moreBullets == null) {
            moreBullets = wrapper;
            moreBulletsEnd = wrapper;
        } else {
            moreBulletsEnd.addNextBullet(wrapper);
        }
    }
};
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
        var bullet = {id:user.id, location:{x:x, y:y},angle:user.angle+(Math.PI/2),isExistant:true};
    	console.log(x + " " + y + "DELAY " + (user.angle-angle));
        user.canShoot = false;
        setTimeout(function() {
            user.canShoot = true;  //Reload Time
        },1000);
    	bullets.push(bullet);
     }
  });
  socket.on('requestUsers', function(){
      var localusers = [];
      for(var i =0;i<users.length;i++) {
          localusers.push({id:users[i].id});
      }
      io.emit('requestUsers', localusers);
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

function collides(a,b,ar,br)
{
    var distance_squared = ( ((a.location.x - b.location.x) * (a.location.x - b.location.x)) +
                            ((a.location.y - b.location.y) * (a.location.y - b.location.y)));

    var radii_squared = (ar + br) * (ar + br);
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
		    if(collides(users[u],bullets[b],20,10))
			{
			    if(bullets[b].id !=users[u].id)
				{
				    console.log("COLLISION");
          		    bullets.splice(b,b+1);
                    break;
				}

			}
		}
	}

	for(var b =bullets.length-1;b>0;b--)
	{
		for(var b2 = b-1;b2>=0;b2--)
		{

		    if(collides(bullets[b],bullets[b2],10,10))
			{
			    console.log("BULLET ON BULLET COLLISION");
				bullets.splice(b,b+1);
				bullets.splice(b2,b2+1);
				break;
			}
		}
		if(b > bullets.length) {
		    b--;
		}
	}
    for(var b =bullets.length-1;b>=0;b--)
	{
	    if(bullets[b].location.x<-20||bullets[b].location.x>1020||bullets[b].location.y<-20||bullets[b].location.y>620)
		{
		    bullets.splice(b,b+1);
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
        if(!b.isExistant)
            continue;

		b.location.x+=Math.cos(b.angle) * 15;//bullet speed
		b.location.y+=Math.sin(b.angle) * 15;
		allBullets.push({location:b.location,id:b.id});
	}

	io.emit('data', allPlayers,allBullets);
}, 1000/30); //Fps sending

http.listen(80, function(){
  console.log('listening on *:80');
});

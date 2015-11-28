var app = require('express')();

var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
   res.sendFile(__dirname + '/index.html');
 // res.sendFile(__dirname + '/plzDoJudge.html');
});

app.get('/login', function(req, res){
   res.sendFile(__dirname + '/HomeScreen.html');
});
app.get('/loginPOST', function(req, res){
  res.writeHead(200, "OK", {'Content-Type': 'text/html'});
  res.write('<html><head><title>Hello Noder!</title></head><body>');
  res.write('<h1>Welcome Noder, who are you?</h1>');
  res.write('<form enctype="application/x-www-form-urlencoded" action="/formhandler" method="post">');
  res.write('Name: <input type="text" name="username" value="John Doe" /><br />');
  res.write('Age: <input type="text" name="userage" value="99" /><br />');
  res.write('<input type="submit" />');
  res.write('</form></body></html');
  res.end();
});
app.get('/global.js', function(req, res){
   res.sendFile(__dirname + '/global.js');
});
app.get('/css.css', function(req, res){
   res.sendFile(__dirname + '/css.css');
});

require("./login.js");

//Game


var users = [];
var nextUserNum = 1;

io.on('connection', function(socket){

  nextUserNum++;
  var user = { id: nextUserNum, key: Math.random() * 1000000, location: {x:0,y:0}, locationToward:{x:0,y:0},angle:0,canShoot:true, bullets:new Array(20), rightClick:false}
  users.push(user);

  socket.emit('user handshake', user);

  console.log('a user connected: ' + user.id + " with key " + user.key);
  socket.on('rightclick', function(clicked){
    //(>^_^)>rightclick feature. Hella cool! <(^_^<)
	user.rightClick=clicked;
  });
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
  function makeBullet(angle) {
	  if(user.canShoot) {
			var spacing = 40;
			var x=Math.cos(user.angle)*spacing + user.location.x;
			var y=Math.sin(user.angle)*spacing + user.location.y;
			var bullet = {id:user.id, location:{x:x, y:y},angle:user.angle+(Math.PI/2),isExistant:true};
			console.log(x + " " + y + "DELAY " + (user.angle-angle));
			user.canShoot = false;
			setTimeout(function() {
				user.canShoot = true;  //Reload Time
				//makeBullet(angle); ONLY FOR DEBUGGING DON'T TOUCH, PREDCIOUS COSDE. MY PRESCIOUSSS
			},1000);
      for(var i=0;i<user.bullets.length;i++) {
        if(user.bullets[i] == null || user.bullets[i].isExistant == false) {
          user.bullets[i] = bullet;
        }
      }
			//Let's see if I can remove bullets
			// for(var a =user.bullets.length-1;a>=0;a--) {
			//     if(!user.bullets[a].isExistant) {
			//         user.bullets.splice(a,a+1);
			//     }
			// }
		 }
  }
  socket.on('bullet', function(angle) {
	makeBullet(angle);
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
    // console.log(ar + " " + br);
    var distance = Math.sqrt(((a.location.x - b.location.x) * (a.location.x - b.location.x)) +
                            ((a.location.y - b.location.y) * (a.location.y - b.location.y)));

    var radii = (ar + br);
    if (distance < radii) {
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
    for(var p=0;p<users.length;p++) {
        var bullets = users[p].bullets;
    	for(var b =bullets.length-1;b>=0;b--)
    	{

            if(bullets[b] == null)
              continue;

              if(!bullets[b].isExistant)
                continue;
    	    for(var u = users.length-1;u>=0;u--)
    		{
    		    if(collides(users[u],bullets[b],20,10))
    			{
    			    if(bullets[b].id != users[u].id)
    				{
    				    console.log("COLLISION");
                        bullets[b].isExistant = false;
              		    // bullets.splice(b,b+1);
                        break;
    				}

    			}
    		}
    	}
    }
    //First users bullets
    for(var p=0;p<users.length;p++) {
        var bullets = users[p].bullets;
    	for(var b =bullets.length-1;b>=0;b--)
    	{
          if(bullets[b] == null)
            continue;
            if(!bullets[b].isExistant)
                continue;
			var broken = false;
            //Second player's bullets
            for(var p2=p+1;p2<users.length;p2++) {
                var bullets2 = users[p2].bullets;

        		for(var b2 = bullets2.length -1;b2>=0;b2--)
        		{
                if(bullets2[b2] == null)
                  continue;
        		    if(collides(bullets[b],bullets2[b2],10,10))
        			{
        			    console.log("BULLET ON BULLET COLLISION");
                        bullets[b].isExistant = false;
                        bullets2[b2].isExistant = false;
        				// bullets.splice(b,b+1);
        				// bullets2.splice(b2,b2+1);
						broken = true;
        				break;
        			}
        		}
				if(broken) {
					break;
				}
            }
    	}
    }

    for(var p=0;p<users.length;p++) {
        var bullets = users[p].bullets;
        for(var b =bullets.length-1;b>=0;b--)
    	{

            if(bullets[b] == null)
              continue;

            if(!bullets[b].isExistant)
              continue;
    	    if(bullets[b].location.x<-20||bullets[b].location.x>1020||bullets[b].location.y<-20||bullets[b].location.y>620)
    		{
                console.log("BYE BYE");
                bullets[b].isExistant = false;
    		    // bullets.splice(b,b+1);
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
		if(u.rightClick){
		    u.angle += Math.PI/180*2;
		}
		else{
		    u.angle += Math.PI/180 *8;
		}
		var player = { id:u.id, location:u.location,angle:u.angle,shoot:u.canShoot};
		// console.log("HI " + u.location.x + " " + u.location.y + " " + u.angle);
		allPlayers.push(player);
	}

    for(var p=0;p<users.length;p++) {
        var bullets = users[p].bullets;
    	for(var i=0;i<bullets.length;i++)
    	{
    	    var b=bullets[i];
              if(b == null)
                continue;
            if(!b.isExistant)
                continue;

    		b.location.x+=Math.cos(b.angle) * 1;//bullet speed
    		b.location.y+=Math.sin(b.angle) * 1;
    		allBullets.push({location:b.location,id:b.id});
    	}
    }
	io.emit('data', allPlayers,allBullets);
}, 1000/30); //Fps sending

http.listen(80, function(){
  console.log('listening on *:80');
});

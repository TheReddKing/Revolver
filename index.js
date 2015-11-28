app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

app.get('/', function(req, res){

   res.sendFile(__dirname + '/index.html');
   // res.sendFile(__dirname + '/HomeScreen.html');
 // res.sendFile(__dirname + '/plzDoJudge.html');
});
app.get('/login',function(req, res){

  res.sendFile(__dirname + '/HomeScreen.html');
 // res.sendFile(__dirname + '/plzDoJudge.html');
});
app.post('/', function(req, res){
   res.sendFile(__dirname + '/index.html');
});
app.get('/endgame', function(req, res) {
  res.sendFile(__dirname + "/endgame.html");
})

app.get('/global.js', function(req, res){
   res.sendFile(__dirname + '/global.js');
});
app.get('/css.css', function(req, res){
   res.sendFile(__dirname + '/css.css');
});

require("./login.js");

//Game
var GT =  { PantKing:0, RoundKill:1 };
var game = {
  type: GT.PantKing,
  isPlaying: true,
  timeTillNext: 10,
  timeInterval: null,
  gameTime:0,
  totalPoints:20
};
var users = [];
var nextUserNum = 1;
var terrainlocations = {
   x1: Math.round(Math.random()* 1000),
   y1: Math.round(Math.random()* 600),
}
io.on('connection', function(socket){

  nextUserNum++;
  var user = { id: nextUserNum,
   nickname: "Anoyomous",
   key: Math.round(Math.random() * 1000000),
   location: {x:0,y:0},
   locationToward:{x:0,y:0},
   isOn: true,
   angle:0,canShoot:true,
   bullets:new Array(20),
   points:0,
   pointTime:0,
   rightClick:false,
   pants:false,
   }

   var didpush = false;
   socket.emit('user handshake', user);
   socket.on('alias', function(name){
    if(/[a-zA-Z0-9]/.test( name) && name.length <= 16 && !didpush) {
      user.nickname = name;
      users.push(user);
	  gamepresets();
      didpush = true;
    }
	// if(name == "faguette")
	// {
	//   user.reloadtime = 0;
	// }
	// else{
	//   user.reloadtime = 1000;
	// }
  });
  console.log('a user connected: ' + user.id + " with key " + user.key);
  socket.on('rightclick', function(clicked){
    //(>^_^)>rightclick feature. Hella cool! <(^_^<)
	 user.rightClick=clicked;
  });
  socket.on('disconnect', function(){
    game.totalPoints += user.points;
	//users.remove(user);
  	// for(var i=0;i<users.length;i++ ){
  	// 	if(users[i] == user) {
  	// 		users.splice(i,i+1);
  	// 		break;
  	// 	}
  	// }
    console.log('user disconnected');
  });

  function makeBullet(angle) {
      
	  if(user.canShoot) {
			var spacing = 40;
			var x=Math.cos(user.angle)*spacing + user.location.x;
			var y=Math.sin(user.angle)*spacing + user.location.y;
			var bullet = {location:{x:x, y:y},angle:user.angle+(Math.PI/2),isExistant:true};
			// console.log(x + " " + y + "DELAY " + (user.angle-angle));
			user.canShoot = false;
			
			setTimeout(function() {
				user.canShoot = true;  //Reload Time
				//makeBullet(angle); //ONLY FOR DEBUGGING DON'T TOUCH, PREDCIOUS COSDE. MY PRESCIOUSSS
			},1000);
      for(var i=0;i<user.bullets.length;i++) {
        if(user.bullets[i] == null || user.bullets[i].isExistant == false) {
          user.bullets[i] = bullet;
          break;
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
    // var localusers = [];

    // for(var i =0;i<users.length;i++) {
    //     localusers.push({id:users[i].id,nickname:users[i].nickname, points:users[i].points,pointTime:users[i].pointTime});
    // }
    // io.emit('requestUsers', localusers);
  });
  socket.on('location', function(location) {
    if(location.x > 1000)
      location.x = 1000;
    if(location.x < 0) {
      location.x = 0;
    }
    if(location.y > 600) {
      location.y = 600;
    }
    if(location.y < 0) {
      location.y =0;
    }
	    user.locationToward = location;
	    // console.log('location' + user.locationToward.x + " " + user.locationToward.y);
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
//1 second updater
setInterval(function(){
    if(users.length == 0) {
        return;
    }
    game.pointTime += 1;
    var localusers = [];
    for(var i =0;i<users.length;i++) {
        localusers.push({id:users[i].id,nickname:users[i].nickname, points:users[i].points,pointTime:users[i].pointTime});
    }
    localusers.sort(function (a, b){
      return ((a.points < b.points) ? 1 : ((a.points > b.points) ? -1 : 0));
    });
    if(localusers.length > 1) {
      if(localusers[0].points == localusers[1].points) {

      } else {
        for(var i=0;i<users.length;i++ ){
          if(users[i].id == localusers[0].id) {
            users[i].pointTime+=1;
            localusers[0].pointTime += 1;
            break;
          }
        }
      }
    }
    if(localusers[0].pointTime == 30) {
      io.emit('endgame',localusers[0]);
    }
    io.emit('requestUsers', localusers);
}, 1000); //Fps sending
function gamepresets() {
  var allTerrain = [];
  for(var i = 0;i<2;i++)
  {
      var terrain = {location:{x:terrainlocations.x1,y:terrainlocations.y1}};
      allTerrain.push(terrain);
  }

  socket.emit("gamepresets",game,allTerrain);
}
//Global data sender
//If no games are playing, stop the interval +++++++++++++++++++++++++++++++++
var gameInterval = setInterval(function(){
  if(!game.isPlaying) {
    break;
  }
	var allPlayers = [];
	var allBullets = [];
  var allCollisions= [];
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
    			  if(users[p].id != users[u].id)
    				{
    				    console.log("COLLISION");
                bullets[b].isExistant = false;
                var ptChange = Math.round(users[u].points*0.1 + 1);
                if(game.totalPoints > 0) {

                  users[p].points += 1;
                  game.totalPoints -= 1;
                }
                if(users[u].points > 0) {
                  users[p].points += ptChange;
                  users[u].points -= ptChange;
                }
				
                  var collision = {location:{x:bullets[b].location.x,y:bullets[b].location.y}, id:users[p].id, isBoB:false};  ////////////////collision
                  allCollisions.push(collision);
                io.emit('actionHappened', users[p].nickname + " shot " + users[u].nickname);
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
						var collision = {location:{x:bullets[b].location.x,y:bullets[b].location.y}, id:users[p].id, isBoB:true};  ////////////////collision
						allCollisions.push(collision);
						collision = {location:{x:bullets2[b2].location.x,y:bullets2[b2].location.y}, id:users[p2].id, isBoB:false};  ////////////////collision
						allCollisions.push(collision);
        				// bullets.splice(b,b+1);
        				// bullets2.splice(b2,b2+1);
            bullets[b] = null;
            bullets2[b2] = null;
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
		//magnitude is 12
		if(u.rightClick){
		    u.angle += Math.PI/180*2;
		}
		else{
		    u.angle += Math.PI/180*8;
		}
		var player = { id:u.id, location:u.location,angle:u.angle,shoot:u.canShoot,nickname:u.nickname};
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

    		b.location.x+=Math.cos(b.angle) * 20;//bullet speed
    		b.location.y+=Math.sin(b.angle) * 20;
    		allBullets.push({location:b.location,id:users[p].id});
    	}
    }
	io.emit('data',allPlayers,allBullets,allCollisions);
}, 1000/30); //Fps sending

http.listen(80, function(){
  console.log('listening on *:80');
});

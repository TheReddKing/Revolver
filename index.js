app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});
app.get('/login', function(req, res) {
    res.sendFile(__dirname + '/HomeScreen.html');
});
app.post('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});
app.get('/endgame', function(req, res) {
    res.sendFile(__dirname + "/endgame.html");
})
app.get('/pregame', function(req, res) {
    res.sendFile(__dirname + "/pregame.html");
})
app.get('/kappa.png', function(req,res) {
    res.sendFile(__dirname + "/kappa.png");
})
app.get('/betterLOGO.png', function(req,res) {
    res.sendFile(__dirname + "/betterLOGO.png");
})
app.get('/bestestLOGO.png', function(req,res) {
    res.sendFile(__dirname + "/bestestLOGO.png");
})
app.get('/littleLOGO.png', function(req,res) {
    res.sendFile(__dirname + "/littleLOGO.png");
})
app.get('/global.js', function(req, res) {
    res.sendFile(__dirname + '/global.js');
});
app.get('/css.css', function(req, res) {
    res.sendFile(__dirname + '/css.css');
});

app.get('/assets/popup.js', function(req, res) {
    res.sendFile(__dirname + '/assets/popups/jquery.popupoverlay.js');
});

//Game
var GT = {
    PantKing: 0,
    RoundKill: 1
};
var GS = {
    NoUsers: 0,
    Playing: 1,
    Waiting: 2,
    Waiting4Two: 3
}; //GameState
var lobby = {
    startTime: new Date(),
    games: new Array(20),
    privategames: new Array(40) //Unimplemented
}



//global settings
GLOBAL_PANTKING_TIMEWIN = 30;
GLOBAL_TIMEINBETWEEN = 4;
GLOBAL_TOTALPOINTSINGAME = 14;

GLOBAL_GAME_OCELETDISTANCE = 35;
GLOBAL_GAME_SIZETERRAIN = 50;
GLOBAL_GAME_SIZEPLAYER = 18;
// GLOBAL_PANTKING_TIMEWIN = 30;
GLOBAL_TIMEINBETWEEN = 1;
GLOBAL_MAXUSERS = 8;

//Lets get the game lobby done guys
//First init all games

for (var v = 0; v < lobby.games.length; v++) {
    var game = {
        roomNumber: v,
        type: GT.PantKing,
        isPlaying: false,
        state: GS.NoUsers,
        timeTillNext: 10,
        timeInterval: null,
        gameTime: 0,
        totalPoints: GLOBAL_TOTALPOINTSINGAME,
        users: new Array(GLOBAL_MAXUSERS),
        bots: new Array(6),
        specialStuff: null,
        allTerrain: [],
    };
    lobby.games[v] = game;
}



var allUsers = [];
var nextUserNum = 1;

function getGame(roomNumber) {
    return lobby.games[roomNumber];
}

function getDistilledGame(roomNumber) {
    //NEED TO GET RID OF USERS
    var actualGame = lobby.games[roomNumber];
    var psuedogame = {
        roomNumber: actualGame.roomNumber,
        type: actualGame.type,
        timeTillNext: actualGame.timeTillNext
    }
    // console.log(psuedogame);
    return psuedogame;
}

function gameLobby(gameID) {
    var game = getGame(gameID);
    // console.log(game);

    clearInterval(game.timeInterval);
    game.timeInterval = setInterval(function() {
        if (lenRealUsers(getGame(gameID).users) == 0 || game.state == GS.NoUsers) {
            clearInterval(game.timeInterval);
        }
        if (game.state == GS.Playing) {
            clearInterval(game.timeInterval);
            // console.log("Your right, lets start the game");
            gamepresets(game.roomNumber);
            return;
        }
        emitToGame(game.roomNumber, 'gamelobby', 1, getDistilledGame(game.roomNumber));
    }, 1000);
}

function gameInBetween(gameID) {
    console.log("GAME: " + gameID+ " -- IS INBETWEEEN");
    var game = getGame(gameID); //hi
    //This is where I reset everything gameRelated
    game.gameTime = 0;
    game.type = Math.round(Math.random() * 2) == 1 ? GT.PantKing : GT.RoundKill;
    game.totalPoints = GLOBAL_TOTALPOINTSINGAME;
    game.isPlaying = false;
    game.state = GS.Waiting;

    //Remove all gamers who have disconnected.
    for (var v = 0; v < game.users.length; v++) {
        var u = game.users[v];
        if (u != null) {
            if (u.gameStatus < 0) { //Disconnected
                game.users[v] = null;
            } else {
                u.location = {
                    x: 0,
                    y: 0
                };
                u.locationToward = {
                    x: 0,
                    y: 0
                };
                u.angle = 0;
                u.canShoot = true;
                u.bullets = new Array(20);
                u.points = 0;
                u.pointTime = 0;
                u.rightClick = false;
            }
        }
    }
    if (lenRealUsers(game.users) == 0) {
        game.state = GS.NoUsers;
        return;
    }
    if (len(game.users) == 1) {
        game.state = GS.Waiting4Two;
        gameLobby(game.roomNumber);
        return;
    }

    game.timeTillNext = GLOBAL_TIMEINBETWEEN;
    clearInterval(game.timeInterval);
    game.timeInterval = setInterval(function() {
        if (game.timeTillNext == 0) {
            //Setup everything
            clearInterval(game.timeInterval);
            gamepresets(game.roomNumber);
            return;
        }
        if (lenRealUsers(game.users) == 0) {
            //Everyone disappeared
            clearInterval(game.timeInterval);
            game.users = new Array(GLOBAL_MAXUSERS);
            game.state = GS.NoUsers;
            console.log("Timer CLEARED");
        }
        emitToGame(game.roomNumber, 'gamepreupdate', 1, getDistilledGame(game.roomNumber));
        game.timeTillNext -= 1;
    }, 1000);

}

function gameAddUser(user, game) {

    //So now lets create a game lobby
    for (var v = 0; v < game.users.length; v++) {
        if (game.users[v] != null) {
            if(game.users[v].nickname == user.nickname) {
                return 2;
            }
        }
    }

    ////////////////////////////////////////////
    var didAdd = false;
    for (var v = 0; v < game.users.length; v++) {
        if (game.users[v] == null) {
            game.users[v] = user;
            didAdd = true;
            break;
        }
    }
    if(!didAdd) {
        //WOW -- CAN I JOIN a bot!!
        didAdd = false;
        for (var v = 0; v < game.users.length; v++) {
            if (game.users[v].isBot) {
                game.totalPoints += game.users[v].points;
                game.users[v].points = 0;
                game.users[v] = user;
                didAdd = true;
                break;
            }
        }
        if(!didAdd) {
          return 1;
        }
    }
    if (game.state == GS.Playing) {
        //Game is on let's add the terrain for the non-believers
        console.log(game.allTerrain);
        user.emit(game.roomNumber, "gamepresets", 2, getDistilledGame(game.roomNumber), game.allTerrain);
    }

    if (game.state == GS.Waiting4Two) {
        //Lets play
        game.state = GS.Playing;
        game.isPlaying = true;
    } else if (game.state == GS.NoUsers) {
        //if room 1-5
        if(game.roomNumber < 5) {
            //Init bots ---------------------------------------------------------------------------------
            console.log("GAME: " + game.roomNumber + " -- CREATING BOTS");
            nextUserNum++;
            debugger;
            // game.bots[0] = user;
            for(var v=1;v<game.bots.length;v++) {
                var user = {
                    id: nextUserNum,
                    nickname: "^BOT " + v,
                    key: Math.round(Math.random() * 1000000),
                    location: {
                        x: 0,
                        y: 0
                    },
                    locationToward: {
                        x: 0,
                        y: 0
                    },
                    gameStatus: game.roomNumber,
                    angle: 0,
                    canShoot: true,
                    bullets: new Array(20),
                    points: 0,
                    pointTime: 0,
                    rightClick: false,
                    isBot: true,
                    emit: function(){}
                };
                game.bots[v] = user;
                for (var v = 0; v < game.users.length; v++) {
                    if (game.users[v] == null) {
                        game.users[v] = user;
                        break;
                    }
                }
                nextUserNum++;
            }
            gameLobby(game.roomNumber); //Let's wait for 2
            game.state = GS.Playing;
        } else {
            game.state = GS.Waiting4Two;
            gameLobby(game.roomNumber); //Let's wait for 2
        }
    }
    console.log("GAME: " + game.roomNumber + " USER JOINED");
    emitToGame(game.roomNumber, 'actionHappened', 1, user.nickname + " joined the GAME");
    return 0;
}
function lenRealUsers(array) {
    var length = 0;
    for (var v = 0; v < array.length; v++) {
        if (array[v] != null && array[v].isBot == false)
            length += 1;
    }
    return length;
}
function len(array) {
    var length = 0;
    for (var v = 0; v < array.length; v++) {
        if (array[v] != null)
            length += 1;
    }
    return length;
}

io.on('connection', function(socket) {


    function emit(roomNumber, emitString, argSize) {
        switch (argSize) {
            case 1:
                socket.emit(emitString, arguments[3]);
                break;
            case 2:
                socket.emit(emitString, arguments[3], arguments[4]);
                break;
            case 3:
                socket.emit(emitString, arguments[3], arguments[4], arguments[5]);
                break;
            default:
                socket.emit(emitString);
        }
    }

    nextUserNum++;
    var user = {
        id: nextUserNum,
        nickname: "Anoyomous",
        key: Math.round(Math.random() * 1000000),
        location: {
            x: 0,
            y: 0
        },
        locationToward: {
            x: 0,
            y: 0
        },
        gameStatus: -1337,
        angle: 0,
        canShoot: true,
        bullets: new Array(20),
        points: 0,
        pointTime: 0,
        rightClick: false,
        isBot: false,
        emit: emit
    };

    var game;
    allUsers.push(user);
    var didpush = false;
    socket.emit('user handshake', user.id, user.key);
    socket.on('logincomplete', function(alias, roomNumber) {
        if(!/^([0-9])+$/.test(roomNumber) || roomNumber > 20) {
            socket.emit("logincomplete",false,"Room Number is a number between 1-20");
            return;
        }
        if( roomNumber < 1) {
            roomNumber = 1;
        }
        if(alias.length > 16) {
            socket.emit("logincomplete",false,"Username has to be less than 16 characters");
            return;
        }
        if (!/^([a-zA-Z_ 0-9])+$/.test(alias)) {
            socket.emit("logincomplete",false,"Plz, ASCII usernames only (a-z, _,A-Z,0-9)");
            return;
        }
        if (/^([a-zA-Z_ 0-9])+$/.test(alias) && alias.length <= 16 && !didpush && /^([0-9])+$/.test(roomNumber)) {
            user.nickname = alias;
            user.gameStatus = roomNumber - 1;
            //ADD MEE PLZ
            game = getGame(roomNumber - 1);
            var ret = gameAddUser(user, game);
            if(ret == 1) { //Game is full
                socket.emit("logincomplete",false,"The Game is currently Full");
            } else if(ret == 0) { //game YES
                socket.emit("logincomplete",true,"You have start");
                didpush = true;
            } else if(ret == 2) {
                socket.emit("logincomplete",false,"Duplicate Username, plz change");
            }
        }
    });
    console.log('a user connected: ' + user.id + " with key " + user.key);
    socket.on('rightclick', function(clicked) {
        //(>^_^)>rightclick feature. Hella cool! <(^_^<)
        user.rightClick = clicked;
    });
    socket.on('disconnect', function() {
        //Game variable now incorrect
        if (user.gameStatus >= 0) {
            // user.gameStatus += 1; //GAME STATUS IS NOW -1 BEFORE FLIPPING SIGNS
            // user.gameStatus *= -1;
            // Bottom code doens't work like that
            //Just remove the user :|
            for(var vvvv=0;vvvv<game.users.length;vvvv++ ){
                if(game.users[vvvv] == user) {
                    game.users[vvvv] = null; //Just plain remove him
                }
            }
            console.log("GAME: "+ game.roomNumber + " -- USER DISCONNECT");
            emitToGame(game.roomNumber, 'actionHappened', 1, user.nickname + " disconnected");

            if (game != null) {
                if (len(game.users) == 1) {
                  game.state = GS.Waiting4Two;
                  game.isPlaying = false;
                  gameLobby(game.roomNumber);
                  console.log("GAME: " + game.roomNumber + " -- WAITING FOR TWO");
                  return;
                }
                if (lenRealUsers(game.users) == 0) {
                  game.state = GS.NoUsers;
                  game.users = new Array(GLOBAL_MAXUSERS);
                  game.isPlaying = false;
                  console.log("GAME: " + game.roomNumber + " -- GAME STOPPED");
                  return;
                }

                game.totalPoints += user.points; //Bring back the points && bots....
                for(var v=0;v<game.bots.length;v++) {
                    var asdf = false;
                    if(game.bots[v] == null) {
                        continue;
                    }
                    ///ERORRRR
                    //heck if exists
                    for (var v = 0; v < game.users.length; v++) {
                        if (game.users[v] == null) {
                            game.users[v] = game.bots[v];
                            game.bots[v].location = {x:0,y:0};
                            asdf = true;
                            break;
                        }
                    }
                    if(asdf) {
                        continue;
                    } else {
                        break;
                    }
                }
            }
        } else {
            console.log("HACKER--- DUPLICATE DISCONNECT");
        }
        // console.log('user disconnected');
    });


    socket.on('bullet', function(angle) {
        makeBullet(angle,user);
    });
    socket.on('requestUsers', function() {
        // var localusers = [];

        // for(var i =0;i<users.length;i++) {
        //     localusers.push({id:users[i].id,nickname:users[i].nickname, points:users[i].points,pointTime:users[i].pointTime});
        // }
        // io.emit('requestUsers', localusers);
    });
    socket.on('location', function(location) {
        if (location.x > 800)
            location.x = 800;
        if (location.x < 0) {
            location.x = 0;
        }
        if (location.y > 600) {
            location.y = 600;
        }
        if (location.y < 0) {
            location.y = 0;
        }



        user.locationToward = location;
        // console.log('location' + user.locationToward.x + " " + user.locationToward.y);
    });
    socket.on('ping', function() {
        socket.emit('pong');
    });
});
function makeBullet(angle,user) {

    if (user.canShoot) {
        var spacing = GLOBAL_GAME_OCELETDISTANCE;
        var x = Math.cos(user.angle) * spacing + user.location.x;
        var y = Math.sin(user.angle) * spacing + user.location.y;
        var bullet = {
            location: {
                x: x,
                y: y
            },
            angle: user.angle + (Math.PI / 2),
            isExistant: true
        };
        // console.log(x + " " + y + "DELAY " + (user.angle-angle));
        user.canShoot = false;

        setTimeout(function() {
            user.canShoot = true; //Reload Time
            //makeBullet(angle); //ONLY FOR DEBUGGING DON'T TOUCH, PREDCIOUS COSDE. MY PRESCIOUSSS
        }, 1000);
        for (var i = 0; i < user.bullets.length; i++) {
            if (user.bullets[i] == null || user.bullets[i].isExistant == false) {
                user.bullets[i] = bullet;
                break;
            }
        }
    }
}

function collides(a, b, ar, br) {
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

function emitToGame(roomNumber, emitString, argSize) {
    var this_game = getGame(roomNumber);
    // console.log("EMITTING " + roomNumber + " " + len(this_game.users));
    for (var i = 0; i < this_game.users.length; i++) {
        if (this_game.users[i] == null || this_game.users[i].gameStatus < 0)
            continue;
        this_game.users[i].emit(roomNumber, emitString, argSize, arguments[3], arguments[4], arguments[5]);
    }
}
function getUsersSortedByScore(game) {
    var users = game.users;
    game.pointTime += 1;
    var localusers = [];
    for (var i = 0; i < users.length; i++) {

        if (users[i] == null || users[i].gameStatus < 0) // not connected or not
            continue;
        localusers.push({
            id: users[i].id,
            nickname: users[i].nickname,
            points: users[i].points,
            pointTime: users[i].pointTime
        });
    }

    localusers.sort(function(a, b) {
        return ((a.points < b.points) ? 1 : ((a.points > b.points) ? -1 : 0));
    });
    return localusers;
}
//1 second updater
setInterval(function() {
    for (var gameID = 0; gameID < lobby.games.length; gameID++) {
        var game = getGame(gameID);
        var users = game.users;
        var isTie = false;
        if (!game.isPlaying) {
            continue;
        }
        localusers = getUsersSortedByScore(game);
        if (localusers.length == 0) {
            return;
        }
        if (localusers.length > 1) {
            if (localusers[0].points == localusers[1].points) {
                //there is tie
                isTie = true;
            } else {
                for (var i = 0; i < users.length; i++) {
                    if (users[i] == null)
                        continue;
                    if (users[i].id == localusers[0].id) {
                        users[i].pointTime += 1;
                        localusers[0].pointTime += 1;
                        break;
                    }
                }
            }
        }
        if (localusers[0].pointTime == GLOBAL_PANTKING_TIMEWIN) {
            emitToGame(game.roomNumber, 'endgame', 1, localusers[0]);
            gameInBetween(gameID);
        }
        emitToGame(game.roomNumber, 'updateusers', 2, localusers,isTie);
        // gamepresets(game.roomNumber);
    }

}, 1000); //Fps sending
//Before game starts
function gamepresets(roomNumber) {
    console.log("GAME: " + roomNumber + " -- IS SETTING UP");
    var game = getGame(roomNumber);
    game.state = GS.Playing;
    game.isPlaying = true;
    var allTerrain = [];
    var totalPlayers = len(game.users);
    for (var v = 0; v < game.users.length; v++) {
        var u = game.users[v];
        if(u == null)
            continue;
        var degree = Math.PI/180.0*(90 + 360.0/(totalPlayers)*v);
        u.location = {x:(400 + 350*Math.cos(degree)),y:(300 - 280*Math.sin(degree))};
        u.locationToward = {x:(400 + 350*Math.cos(degree)),y:(300 - 280*Math.sin(degree))};
        // console.log(u.location);
    }
    for (var i = 0; i < 2; i++) {

        var degree = Math.random()*Math.PI*2;
        var distance = (Math.random()*200);

        var terrain = {
            location: {
                x: distance*Math.cos(degree) + 400,
                y: -distance*Math.sin(degree) + 300
            }
        };
        allTerrain.push(terrain);
    }
    game.allTerrain = allTerrain;
    emitToGame(game.roomNumber, "gamepresets", 2, getDistilledGame(roomNumber), allTerrain); //UNSAFE passes all user variables
}
//Global data sender
//If no games are playing, stop the interval +++++++++++++++++++++++++++++++++
var gameInterval = setInterval(function() {

    for (var gameID = 0; gameID < lobby.games.length; gameID++) {
        var game = getGame(gameID);
        var users = game.users;
        if (!game.isPlaying) {
            continue;
        }
        var allPlayers = [];
        var allBullets = [];
        var allCollisions = [];
        // console.log(users.length);


        //users and bullet
        for (var p = 0; p < users.length; p++) {
            if (users[p] == null)
                continue;
            var bullets = users[p].bullets;
            for (var b = bullets.length - 1; b >= 0; b--) {
                if (bullets[b] == null)
                    continue;

                if (!bullets[b].isExistant)
                    continue;
                for (var u = users.length - 1; u >= 0; u--) {

                    if (users[u] == null)
                        continue;
                    if (collides(users[u], bullets[b], 18, 8)) {
                        if (users[p].id != users[u].id) {
                            // console.log("USER has been hit");
                            var ptChange = Math.round(users[u].points * 0.1 + 1);
                            if (game.totalPoints > 0) {

                                users[p].points += 1;
                                game.totalPoints -= 1;
                            }
                            if (users[u].points > 0) {
                                users[p].points += ptChange;
                                users[u].points -= ptChange;
                            }

                            var collision = {
                                location: {
                                    x: bullets[b].location.x,
                                    y: bullets[b].location.y
                                },
                                id: users[p].id,
                                isBoB: false
                            }; ////////////////collision
                            allCollisions.push(collision);
                            emitToGame(gameID, 'actionHappened', 1, users[p].nickname + " shot " + users[u].nickname);
                            // bullets.splice(b,b+1);
                            bullets[b] = null;
                            break;
                        }

                    }
                }
            }
        }
        //First users bullets and bullet collision
        for (var p = 0; p < users.length; p++) {

            if (users[p] == null)
                continue;
            var bullets = users[p].bullets;
            for (var b = bullets.length - 1; b >= 0; b--) {
                if (bullets[b] == null)
                    continue;
                if (!bullets[b].isExistant)
                    continue;
                var broken = false;
                //Second player's bullets
                for (var p2 = p + 1; p2 < users.length; p2++) {
                    if (users[p2] == null)
                        continue;
                    var bullets2 = users[p2].bullets;

                    for (var b2 = bullets2.length - 1; b2 >= 0; b2--) {
                        if (bullets2[b2] == null)
                            continue;
                        if (collides(bullets[b], bullets2[b2], 8, 8)) {
                            // console.log("BULLET ON BULLET COLLISION");
                            var collision = {
                                location: {
                                    x: bullets[b].location.x,
                                    y: bullets[b].location.y
                                },
                                id: users[p].id,
                                isBoB: true
                            }; ////////////////collision
                            allCollisions.push(collision);
                            collision = {
                                location: {
                                    x: bullets2[b2].location.x,
                                    y: bullets2[b2].location.y
                                },
                                id: users[p2].id,
                                isBoB: false
                            }; ////////////////collision
                            allCollisions.push(collision);
                            // bullets.splice(b,b+1);
                            // bullets2.splice(b2,b2+1);
                            bullets[b] = null;
                            bullets2[b2] = null;
                            broken = true;
                            break;
                        }
                    }
                    if (broken) {
                        break;
                    }
                }
            }
        }

        for (var p = 0; p < users.length; p++) {
            if (users[p] == null)
                continue;
            var bullets = users[p].bullets;
            for (var b = bullets.length - 1; b >= 0; b--) {

                if (bullets[b] == null)
                    continue;

                if (!bullets[b].isExistant)
                    continue;
                if (bullets[b].location.x < -20 || bullets[b].location.x > 1020 || bullets[b].location.y < -20 || bullets[b].location.y > 620) {
                    // console.log("Bullet Collided with WALL");
                    bullets[b] = null;
                }
            }
        }
        //User movement ---------------------------------------------------------->
        for (var i = 0; i < users.length; i++) {
            var u = users[i];
            debugger;
            if (u == null)
                continue;
            if (u.gameStatus < 0) {
                continue;
            }
            //Find angle
            var changeX = u.locationToward.x - u.location.x;
            var changeY = u.locationToward.y - u.location.y;
            if (changeX == 0 && changeY == 0) {

            } else {
                var m = 7;
                if (Math.pow((Math.pow(changeX, 2) + Math.pow(changeY, 2)), .5) < 7) {
                    m = Math.pow((Math.pow(changeX, 2) + Math.pow(changeY, 2)), .5);
                }

                var mag = m / Math.pow((Math.pow(changeX, 2) + Math.pow(changeY, 2)), .5);
                u.location.x += changeX * mag;
                u.location.y += changeY * mag;
                //Collision for terrain

				//terrain navigation
				for(var t=0;t<game.allTerrain.length;t++){
					if(collides(u,game.allTerrain[t],18,50))
					{
                        //IF IT COLLIDES

                        u.location.x -= changeX * mag;
                        u.location.y -= changeY * mag;
                        //BACKTRACK
                        var dx = -game.allTerrain[t].location.x + u.location.x;
                        var dy = -game.allTerrain[t].location.y + u.location.y;
                        var angle = Math.atan(dy/dx);
                        if(dx < 0) {
                            angle = Math.PI + angle;
                        }
                        if(angle < 0) {
                            angle += Math.PI*2;
                        }

                        dx = -game.allTerrain[t].location.x + u.locationToward.x;
                        dy = -game.allTerrain[t].location.y + u.locationToward.y;
                        var angle2 = Math.atan(dy/dx);
                        if(dx < 0) {
                            angle2 = Math.PI + angle2;
                        }
                        if(angle2 < 0) {
                            angle2 += Math.PI*2;
                        }
                        // console.log("CURRENT ANGLE " + parseFloat(angle).toFixed(2) + " " + parseFloat(angle2).toFixed(2));
                        if((angle2 > angle && angle2 - angle <= Math.PI)  || (angle2+Math.PI*2 > angle && angle2+Math.PI*2 - angle <= Math.PI)) {
                            //ADDING
                            angle += m*1.0/(GLOBAL_GAME_SIZETERRAIN + GLOBAL_GAME_SIZEPLAYER);
                        }
                        else {
                            angle -= m*1.0/(GLOBAL_GAME_SIZETERRAIN + GLOBAL_GAME_SIZEPLAYER);
                        }
                        u.location.x = Math.cos(angle)*(GLOBAL_GAME_SIZETERRAIN + GLOBAL_GAME_SIZEPLAYER) + game.allTerrain[t].location.x;
                        u.location.y = Math.sin(angle)*(GLOBAL_GAME_SIZETERRAIN + GLOBAL_GAME_SIZEPLAYER) + game.allTerrain[t].location.y;
                        // var angle = Math.atan(changeY/changeX);
                        // if(Math.abs(angle) > Math.PI/4) {
                        //     angle = Math.PI/2 - angle;
                        // } else  {
                        //     angle = Math.PI/2 + angle;
                        // }
                        // // if(angle > Math.PI/4) {
                        // //     angle = Math.PI/2 - angle;
                        // // } else if (angle > 0) {
                        // //     angle = Math.PI/2 + angle;
                        // // } else if (angle > -Math.PI/4) {
                        // //     angle = Math.PI + angle;
                        // // } else {
                        // //     angle = Math.PI - angle;
                        // // }

                        // u.location.x += m * Math.cos(angle);
                        // u.location.y += m * Math.sin(angle);
						// var slope = (u.location.y-game.allTerrain[t].location.y)/(u.location.x-game.allTerrain[t].location.x);

						// var changex = Math.sqrt(4/(1+(slope*slope)));

						// if(u.location.x<game.allTerrain[t].location.x)
						// {
						// 	//console.log("user hit from other side");
						// 	changex = -Math.sqrt(4/(1+(slope*slope)));
						// }
						// var changey = slope*changex;//this stuff moves the user back 2 units
      //                   u.location.x += changex;
      //                   u.location.y += changey;
					}
				}
            }
            //magnitude is 12
            if (u.rightClick) {
                u.angle += Math.PI / 180 * 3;
            } else {
                u.angle += Math.PI / 180 * 8;
            }
            var player = {
                id: u.id,
                location: u.location,
                angle: u.angle,
                shoot: u.canShoot,
                nickname: u.nickname
            };
            // console.log("HI " + u.location.x + " " + u.location.y + " " + u.angle);
            allPlayers.push(player);
        }
        //terrain and bullets
        for (var p = 0; p < users.length; p++) {

            if (users[p] == null)
                continue;
            var bullets = users[p].bullets;
            for (var i = 0; i < bullets.length; i++) {
                bullets[i];
                if (bullets[i] == null)
                    continue;
                for (var t = 0; t < game.allTerrain.length; t++) {
                    if (collides(bullets[i], game.allTerrain[t], 8, 50)) {
                        // console.log("Bullet hit Terrain");
                        var collision = {
                            location: {
                                x: bullets[i].location.x,
                                y: bullets[i].location.y
                            },
                            id: users[p].id,
                            isBoB: false
                        }; ////////////////collision
                        allCollisions.push(collision);
                        bullets[i] = null;
                        break;
                    }
                }

            }
        }
        //moving bullet
        for (var p = 0; p < users.length; p++) {

            if (users[p] == null)
                continue;
            var bullets = users[p].bullets;
            for (var i = 0; i < bullets.length; i++) {
                var b = bullets[i];
                if (b == null)
                    continue;
                if (!b.isExistant)
                    continue;

                b.location.x += Math.cos(b.angle) * 17; //bullet speed
                b.location.y += Math.sin(b.angle) * 17;
                allBullets.push({
                    location: b.location,
                    id: users[p].id
                });
            }
        }

        // for (var i = 0; i < game.bots.length; i++) {
        //     var u = game.bots[i];

        //     if (u == null)
        //         continue;

        //     //Literraly follows first player
        //     // u.locationToward = game.users[0].locationToward;

        //     if(Math.random() * 400 < 25) {
        //         u.locationToward = {x:Math.random()*800,y:Math.random()*600};
        //     }

        //     var spacing = GLOBAL_GAME_OCELETDISTANCE;
        //     var x = Math.cos(u.angle) * spacing + u.location.x;
        //     var y = Math.sin(u.angle) * spacing + u.location.y;
        //     for (var p = 0; p < users.length; p++) {
        //         if(users[p] == null)
        //             continue;
        //         var changeX = users[p].location.x - x;
        //         var changeY = users[p].location.y - y;
        //         var angle = Math.atan(changeY/changeX); // iN RADIANS
        //         if(changeX < 0) {
        //             angle = Math.PI + angle;
        //         }
        //         var abs = Math.abs(u.angle - angle) % (Math.PI * 2);
        //         if(abs < 0.2) {
        //             if(Math.random() * 100 < 50) {
        //                 makeBullet(u.angle,u);
        //             }
        //         }
        //     }
        // }



        emitToGame(gameID, 'data', 3, allPlayers, allBullets, allCollisions);
    }
}, 1000 / 30); //Fps sending

setInterval(function() {
    //AI MOVING CODE
    for (var gameID = 0; gameID < lobby.games.length; gameID++) {
        var game = getGame(gameID);
        var users = game.users;
        if (!game.isPlaying) {
            continue;
        }
        var localusers = getUsersSortedByScore(game);
        var a1;
        var a2;
        for(var i = 0; i < users.length;i++) {
            if(users[i] == null)
                continue;
            if(localusers.length > 0 && users[i].id == localusers[0].id) {
                a1 = users[i].location;
            } else if(localusers.length > 1 &&  users[i].id == localusers[1].id) {
                a2 = users[i].location;
            }
        }
        for (var i = 0; i < game.bots.length; i++) {
            var u = game.bots[i];

            if (u == null)
                continue;

            // u.locationToward = game.users[0].locationToward;
            //BOTS DON"T MOVE
            var random = Math.random() * 400;
            if(random < 60) {
                u.locationToward = {x:Math.random()*800,y:Math.random()*600};
            } else if( random > 300) {
                //Change the location slightly
                u.locationToward = {x:Math.min(800,Math.max(0,u.locationToward.x + Math.random() * 50 - 25)),
                                    y:Math.min(600,Math.max(0,u.locationToward.y + Math.random() * 50 - 25))};
            } else if(random > 290) {
                if (localusers.length > 1) {
                    if (localusers[0].points == localusers[1].points && Math.random() * 5 > 2) {
                        u.locationToward = a1;
                    } else {
                        u.locationToward = a2;
                    }
                }
            }
            random = Math.random() * 100;
            if(random < 5) {
                u.rightClick = true;
            } else if(random > 80) {
                u.rightClick = false;
            }

            var spacing = GLOBAL_GAME_OCELETDISTANCE;
            var x = Math.cos(u.angle) * spacing + u.location.x;
            var y = Math.sin(u.angle) * spacing + u.location.y;

            for (var p = 0; p < users.length; p++) {
                if(users[p] == null || users[p].id == u.id)
                    continue;
                var changeX = users[p].location.x - x;
                var changeY = users[p].location.y - y;
                var angle = Math.atan(changeY/changeX); // iN RADIANS
                if(changeX < 0) {
                    angle = Math.PI + angle;
                }
                var abs = Math.abs(u.angle - angle + Math.PI/2) % (Math.PI * 2);
                if(abs < 0.2) {
                    if(users[p].points > 0 && Math.random() * 100 < 95) {
                        makeBullet(u.angle,u);
                        break;
                    }
                }
            }
        }
    }

}, 50);
http.listen((process.env.PORT || 5000), function() {
    console.log('listening on *:' + (process.env.PORT || 5000));
});

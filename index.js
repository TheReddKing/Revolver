app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser')
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));

app.get('/', function(req, res) {

    res.sendFile(__dirname + '/index.html');
    // res.sendFile(__dirname + '/HomeScreen.html');
    // res.sendFile(__dirname + '/plzDoJudge.html');
});
app.get('/login', function(req, res) {

    res.sendFile(__dirname + '/HomeScreen.html');
    // res.sendFile(__dirname + '/plzDoJudge.html');
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

app.get('/global.js', function(req, res) {
    res.sendFile(__dirname + '/global.js');
});
app.get('/css.css', function(req, res) {
    res.sendFile(__dirname + '/css.css');
});

require("./login.js");

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
        totalPoints: 20,
        users: new Array(8),
        specialStuff: null,
        allTerrain: [],
    };
    lobby.games[v] = game;
}



//global settings
GLOBAL_PANTKING_TIMEWIN = 5;
GLOBAL_TIMEINBETWEEN = 2;


var allUsers = [];
var nextUserNum = 1;

function getGame(roomNumber) {
    return lobby.games[roomNumber];
}

function getDistilledGame(roomNumber) {
    //NEED TO GET RID OF USERS
    return lobby.games[roomNumber];
}

function gameLobby(gameID) {
    var game = getGame(gameID);
    console.log(game);
    game.timeInterval = setInterval(function() {
        if (len(getGame(gameID).users) == 0 || game.state == GS.NoUsers) {
            clearInterval(game.timeInterval);
        }
        if (game.state == GS.Playing) {
            clearInterval(game.timeInterval);
            gamepresets(game.roomNumber);
            return;
        }
        emitToGame(game.roomNumber, 'gamelobby', 1, game);
    }, 1000);
}

function gameInBetween(gameID) {
    var game = getGame(gameID); //hi
    //This is where I reset everything gameRelated
    game.gameTime = 0;
    game.type = Math.round(Math.random() * 2) == 1 ? GT.PantKing : GT.RoundKill;
    game.totalPoints = 20;
    game.isPlaying = false;
    game.state = GS.Waiting;

    //Remove all gamers who have disconnected.
    for (var v = 0; v < game.users.length; v++) {
        var u = game.users[v];
        if (u != null) {
            if (u.gameStatus < 0) { //Disconnected
                game.users[v] = null;
                console.log("DIE YOU SON OF A GUN");
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
                console.log("LUCKILY YOUR MENTAL. RIP");
            }
        }
    }
    if (len(game.users) == 0) {
        game.state = GS.NoUsers;
        return;
    }
    if (len(game.users) == 1) {
        game.state = GS.Waiting4Two;
        gameLobby(game.roomNumber);
        return;
    }

    game.timeTillNext = GLOBAL_TIMEINBETWEEN;
    game.timeInterval = setInterval(function() {
        if (game.timeTillNext == 0) {
            //Setup everything
            clearInterval(game.timeInterval);
            gamepresets(game.roomNumber);
            return;
        }
        if (len(game.users) == 0) {
            //Everyone disappeared
            clearInterval(game.timeInterval);
            game.state = GS.NoUsers;
            console.log("Timer CLEARED");
        }
        emitToGame(game.roomNumber, 'gamepreupdate', 1, game);
        game.timeTillNext -= 1;
    }, 1000);

}

function gameAddUser(user, game) {
    if (game.state == GS.Waiting4Two) {
        //Lets play
        game.state = GS.Playing;
        game.isPlaying = true;
    } else if (game.state == GS.NoUsers) {
        game.state = GS.Waiting4Two;
        gameLobby(game.roomNumber); //Let's wait for 2
    }
    //So now lets create a game lobby
    for (var v = 0; v < game.users.length; v++) {
        if (game.users[v] == null) {
            game.users[v] = user;
            break;
        }
    }
    if (game.state == GS.Playing) {
        //Game is on let's add the terrain for the non-believers
        user.emit(game.roomNumber, "gamepresets", 2, getDistilledGame(game.roomNumber), game.allTerrain);
    }
    console.log("Game ADDED USER " + game.roomNumber + " NOW STATUS " + game.state);

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
        gameStatus: 0,
        angle: 0,
        canShoot: true,
        bullets: new Array(20),
        points: 0,
        pointTime: 0,
        rightClick: false,
        emit: emit
    };

    var game;
    allUsers.push(user);
    var didpush = false;
    socket.emit('user handshake', user.id, user.key);
    socket.on('logincomplete', function(alias, roomNumber) {


        if (/[a-zA-Z0-9]/.test(alias) && alias.length <= 16 && !didpush) {
            user.nickname = alias;
            user.gameStatus = roomNumber - 1;
            //ADD MEE PLZ
            game = getGame(roomNumber - 1);
            gameAddUser(user, game);

            didpush = true;
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
            user.gameStatus += 1; //GAME STATUS IS NOW -1 BEFORE FLIPPING SIGNS
            user.gameStatus *= -1;
            console.log("DISCONNECT -- NOW YOUR GAME IS " + user.gameStatus);
            if (game != null)
                game.totalPoints += user.points;
        } else {
            console.log("HACKER--- DUPLICATE DISCONNECT");
        }
        console.log('user disconnected');
    });

    function makeBullet(angle) {

        if (user.canShoot) {
            var spacing = 35;
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
    socket.on('bullet', function(angle) {
        makeBullet(angle);
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
        // //terrain navigation
        // if(game != null) {
        //   for(var t=0;t<game.allTerrain.length;t++){
        //     if(collides(user,game.allTerrain[t],18,50))
        //     {
        //       console.log("user entered sharia zone");
        //       return;
        //     }
        //   }
        // }


        user.locationToward = location;
        // console.log('location' + user.locationToward.x + " " + user.locationToward.y);
    });
    socket.on('ping', function() {
        socket.emit('pong');
    });
});

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
//1 second updater
setInterval(function() {
    for (var gameID = 0; gameID < lobby.games.length; gameID++) {
        var game = getGame(gameID);
        if (!game.isPlaying) {
            return;
        }
        var users = game.users;
        game.pointTime += 1;
        var localusers = [];
        for (var i = 0; i < users.length; i++) {

            if (users[i] == null)
                continue;
            localusers.push({
                id: users[i].id,
                nickname: users[i].nickname,
                points: users[i].points,
                pointTime: users[i].pointTime
            });
        }
        if (localusers.length == 0) {
            return;
        }
        localusers.sort(function(a, b) {
            return ((a.points < b.points) ? 1 : ((a.points > b.points) ? -1 : 0));
        });
        if (localusers.length > 1) {
            if (localusers[0].points == localusers[1].points) {

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
        emitToGame(game.roomNumber, 'updateusers', 1, localusers);
    }

}, 1000); //Fps sending
//Before game starts
function gamepresets(roomNumber) {
    console.log("SETUP");
    var game = getGame(roomNumber);
    game.isPlaying = true;
    var allTerrain = [];

    for (var i = 0; i < 2; i++) {
        var terrain = {
            location: {
                x: Math.round(Math.random() * 600) + 75,
                y: Math.round(Math.random() * 400) + 100
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
            return;
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
                            console.log("COLLISION");
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
                            console.log("BULLET ON BULLET COLLISION");
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
                    console.log("BYE BYE");
                    bullets[b] = null;
                }
            }
        }
        //User movement ---------------------------------------------------------->
        for (var i = 0; i < users.length; i++) {
            var u = users[i];

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

                for (var t = 0; t < game.allTerrain.length; t++) {
                    if (collides(u, game.allTerrain[t], 18, 50)) {
                        u.location.x -= changeX * mag;
                        u.location.y -= changeY * mag;
                    }
                }
            }
            //magnitude is 12
            if (u.rightClick) {
                u.angle += Math.PI / 180 * 2;
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
                        console.log("Bullet hit Terrain");
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
        //

        emitToGame(gameID, 'data', 3, allPlayers, allBullets, allCollisions);
    }
}, 1000 / 30); //Fps sending

http.listen(80, function() {
    console.log('listening on *:80');
});

window.requestAnimFrame = (function() {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();



var Revolver = {

    canvas: null,
    ctx: null,
    ocelot: null,

    init: function() {
        //  Revolver.canvas=document.getElementById("canvas");
        // Revolver.ctx=Revolver.canvas.getContext("2d");
        // Revolver.canvas.width=document.body.clientWidth;
        // Revolver.canvas.height=1000;
        Revolver.canvas = document.getElementById("canvasface");
        Revolver.ctx = Revolver.canvas.getContext("2d");
        Revolver.canvas.oncontextmenu = function() {
            return false;
        }
        
        //Override function



        // Revolver.loop();
    },

    // update:function(){
    // ocelot.update();
    // },
    // render:function(){
    // Revolver.Draw.clear();
    // ocelot.render();
    // },

    // updateEverything:function(){

    // //  requestAnimFrame( Revolver.loop );
    // Revolver.update();
    // Revolver.render();
    // },

};

Revolver.collides = function(a, b) {


};
Revolver.Draw = {
    clear: function() {
        // console.log("cleared");
        Revolver.ctx.clearRect(0, 0, Revolver.canvas.width, Revolver.canvas.height);
    },


    rect: function(x, y, w, h, col) {
        Revolver.ctx.fillStyle = col;
        Revolver.ctx.fillRect(x, y, w, h);
    },

    circle: function(x, y, r, col) {
        Revolver.ctx.fillStyle = col;
        Revolver.ctx.beginPath();
        Revolver.ctx.arc(x, y, r, 0, Math.PI * 2, true);
        Revolver.ctx.closePath();
        Revolver.ctx.fill();
    },


    text: function(string, x, y, size, col) {
        Revolver.ctx.font = 'bold ' + size + 'px Monospace';
        Revolver.ctx.fillStyle = col;
        Revolver.ctx.fillText(string, x, y);
    }

};
Revolver.Character = function() {
    this.x = 0;
    this.y = 0;
    this.id = 0;
    this.r = 18;
    this.ocelot = new Revolver.Ocelot();
    this.isSpecial = false;
    this.name = "";

    this.pants = false;
    this.pantHeight = 0;
    this.init = function(id, x, y, angle, canShoot, name) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.name = name;
        this.ocelot.init(this);
        this.ocelot.update(angle, canShoot, this.isSpecial);
        this.render();
    }
    this.imSpecial = function() {
        this.isSpecial = true;
    }
    this.update = function(x, y, angle, canShoot, name) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.ocelot.update(angle, canShoot, this.isSpecial);
        this.render();
    }
    this.render = function() {

        Revolver.Draw.circle(this.x, this.y, this.r, this.isSpecial ? "#003300" : "#008800");
        Revolver.Draw.text(this.name, this.x, this.y - 30, 15, "#2b3dc2");
        Revolver.ctx.textAlign = "center";
        if (this.pants) {
            Revolver.Draw.rect(this.x - 18, this.y, 36, 18, "#FFD700");
        }
        // var img = document.getElementById("kappa" + id);
        // var x = allPlayers[i].location.x - img.width/2;
        // var y = allPlayers[i].location.y - img.height/2;
        // cvs.drawImage(img,x,y);
    };
};

Revolver.Ocelot = function() {
    this.r = 8;
    this.type = 'ocelot';
    this.spacing = 35;
    this.angle = 0; //change by pi/180
    this.speed = 10;
    this.character;
    this.canShoot = true;
    this.isSpecial = false;
    this.init = function(cha) {
        this.character = cha;
        this.render();
    }
    this.update = function(angle, canShoot, isSpecial) {
        this.isSpecial = isSpecial;
        this.angle = angle;
        if (!this.canShoot && canShoot) {
            this.r = 0;
        } else if (this.r < 8) {
            this.r += 1.5;
        }
        this.canShoot = canShoot;
        this.x = Math.cos(this.angle) * this.spacing + this.character.x;
        this.y = Math.sin(this.angle) * this.spacing + this.character.y;

        // this.angle=this.angle+(this.speed*(Math.PI/180));
        if (this.angle > 2 * Math.PI) {
            this.angle = 0;
        }
        this.render();
    };
    this.render = function() {

        if (this.canShoot) {
            Revolver.Draw.circle(this.x, this.y, this.r, this.isSpecial ? "#663399" : "#66FF99");

        }

    };
};
Revolver.Bullet = function(x, y, isSelf) {
    this.r = 8;

    if (isSelf) {

        color = "#663399"
    } else {
        color = "#66FF99"
    }
    Revolver.Draw.circle(x, y, this.r, color);
};
Revolver.Terrain = function(x, y) {
    this.r = 50;
    this.x = x;
    this.y = y;
    this.update = function() {}
    this.render = function() {
        Revolver.Draw.circle(this.x, this.y, this.r, "#87421F");
    }


}
Revolver.Collision = function(x, y, isSpecial, isBoB) {
    this.x = x;
    this.y = y;
    this.newx = 0;
    this.newy = 0;
    this.finishedRender = false;
    this.isSpecial = isSpecial;
    this.isBoB = isBoB;
    this.update = function() {
        this.newx += 3;
        this.newy += 3;
    };
    this.render = function() {
        if (this.isBoB) {
            Revolver.Draw.circle(this.x + this.newx, this.y, 4, this.isSpecial ? "#663399" : "#66FF99");
            Revolver.Draw.circle(this.x - this.newx, this.y, 4, this.isSpecial ? "#663399" : "#66FF99");
            Revolver.Draw.circle(this.x, this.y + this.newy, 4, this.isSpecial ? "#663399" : "#66FF99");
            Revolver.Draw.circle(this.x, this.y - this.newy, 4, this.isSpecial ? "#663399" : "#66FF99");

        } else {
            Revolver.Draw.circle(this.x + this.newx, this.y + this.newy, 4, this.isSpecial ? "#663399" : "#66FF99");
            Revolver.Draw.circle(this.x - this.newx, this.y - this.newy, 4, this.isSpecial ? "#663399" : "#66FF99");
            Revolver.Draw.circle(this.x - this.newx, this.y + this.newy, 4, this.isSpecial ? "#663399" : "#66FF99");
            Revolver.Draw.circle(this.x + this.newx, this.y - this.newy, 4, this.isSpecial ? "#663399" : "#66FF99");
        }
    };
    this.wearedone = function(object) {
        object.finishedRender = true;
    }
    setTimeout(this.wearedone, 200, this);
}

Revolver.action = function() {
    $('#canvasface').mousedown(function(event) {
        switch (event.which) {
            case 1:

                socket.emit('bullet', 0);
                console.log("left clickk");
                break;
            case 2:
                console.log('Middle Mouse button pressed.');
                break;
            case 3:
                console.log('Right Mouse button pressed.');
                socket.emit('rightclick', true);
                break;
            default:
                alert("You're mouse isn't welcome on this server. We don't serve yer kind here. GETOUTGETOUTGETOUTGETOUTGETOUTGETOUTGETOUTGETOUTGETOUT");
                break;
        }
    });
    $('#canvasface').mouseup(function(event) {
        switch (event.which) {
            case 1:

                console.log("left clickk released");
                break;
            case 2:
                console.log('Middle Mouse button releades.');
                break;
            case 3:
                console.log('Right Mouse button released.');
                socket.emit('rightclick', false);
                break;
            default:
                alert("You're mouse isn't welcome on this server. We don't serve yer kind here. GETOUTGETOUTGETOUTGETOUTGETOUTGETOUTGETOUTGETOUTGETOUT");
                break;
        }
    });
}
window.addEventListener('load', Revolver.action, false);
window.addEventListener('mousedown', function(e) {
    e.preventDefault();
}, false);

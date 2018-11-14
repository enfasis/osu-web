window.osuTexture = {
    'cursor': PIXI.Texture.fromImage('assets/cursor.png'),
    'score': PIXI.Texture.fromImage('assets/hitcircleoverlay.png'),
    'bg': PIXI.Texture.fromImage('assets/bg.png'),
};
window.hitSound = new Howl({
    src: ['assets/normal-hitnormal.wav'],
    volume: 0.3,
});
window.menuSound = new Howl({
    src: ['assets/lavida.mp3']
});
window.gameSound = null;

window.AudioContext = window.AudioContext || window.webkitAudioContext;
window.analyser = Howler.ctx.createAnalyser();
Howler.masterGain.connect(analyser);
window.analyser.fftSize = 256;
window.bufferLength = window.analyser.frequencyBinCount;
window.dataArray = new Uint8Array(window.bufferLength);
var TIMECONSTANT = 1000;
var APPEAR = TIMECONSTANT;
var FADE = TIMECONSTANT;
var OFFSET = -0.1*TIMECONSTANT;
var CIRCLESIZE = 0;
var game = {
    canvas: null,
    cursor: null,
    bg: null,
    renderer: null,
    stage: null,
    state: null,
    level: null,
    difficulties:[],
    loaded: false,
    scenes: {},
    mouseX: 0,
    mouseY: 0,
    click: false,
    lastHit: 0,
    hit: 0,
    timestamp: 0,
    songStartTime: 0,
    lastFrameTime: -1,
    finished: false,
    score: {
        nbClicks: 0,
        goodClicks: 0,
        points: 0
    },
    addScenes: function (names) {
        names.forEach(value=> {
            this.scenes[value] = new PIXI.Container();
            this.stage.addChild(this.scenes[value]);
        });
    },
    startScene: function (thisScene) {
        for (var index in this.scenes) this.scenes[index].visible = thisScene == index ? true : false;
    },
    startCursor: function () {
        this.cursor = new PIXI.Sprite(window.osuTexture["cursor"]);
        this.cursor.anchor.set(0.5);
        this.cursor.scale.set(0.5);
        this.stage.addChild(game.cursor);
    },
};

PIXI.Sprite.prototype.bringToFront = function () {
    if (this.parent) {
        var parent = this.parent;
        parent.removeChild(this);
        parent.addChild(this);
    }
}

window.addEventListener("mousemove", function (e) {
    game.mouseX = e.clientX;
    game.mouseY = e.clientY;
});

window.addEventListener("keydown", function (e) {
    if (e.keyCode === 70 || e.keyCode === 68 // fd
        || e.keyCode === 90 || e.keyCode === 88 // zx
        ) {
        hitSound.play();
        var objects = game.difficulties[game.level].hitObjects;        
        var futuremost = 0;
        var current = game.lastHit;
        var songTime = game.timestamp - game.songStartTime;  
        while(current < objects.length && futuremost < songTime-OFFSET-2*FADE-2*APPEAR){
            futuremost = objects[current].time;
            current++;
        }
        game.lastHit = current-1;
        var time =  songTime - game.difficulties[game.level].hitObjects[game.lastHit].time;
        var isInX = Math.abs(game.mouseX - game.scenes["start"].getChildAt(game.lastHit).x)<=CIRCLESIZE*128?true:false;
        var isInY = Math.abs(game.mouseY - game.scenes["start"].getChildAt(game.lastHit).y)<=CIRCLESIZE*128?true:false;
        console.log(time + " " + game.hit + " " + game.lastHit +" " +isInX +" "+ isInY);        
        if(time > (FADE+APPEAR) &&isInX && isInY) game.score["goodClicks"]++;
        game.click = true;
    }
});
window.addEventListener("keyup", function (e) {
    if (e.keyCode === 27 && game.isready) { // escape        
        game.isready = false;        
        game.state = menu;
        game.startScene("menu");  
        game.scenes["select"].visible = true;
        document.getElementById("drop_zone").style.display = "block";   
    }
});
window.addEventListener("keyup", function (e) {
    if (e.keyCode === 70 || e.keyCode === 68 // fd
        || e.keyCode === 90 || e.keyCode === 88 // zx
        ) {
        game.click = false;
    }
});

function updateHit(diff){
    diff = Math.abs(diff);
    var a = 0;
    if(diff<=APPEAR+FADE){
        if (diff<=APPEAR) a = 1;
        else a =1-(diff-APPEAR)/FADE;
    }
    return a;
}

function updateHitObjects(songTime) {
    var objects = game.difficulties[game.level].hitObjects;
    var current = game.hit;
    var futuremost = 0;    
    while(current < objects.length && futuremost < songTime+10*TIMECONSTANT){
        futuremost = objects[current].time;
        current++;
    }
    for(var i = game.hit; i<current; i++){        
        game.scenes["start"].getChildAt(i).alpha = updateHit(songTime-objects[i].time-OFFSET);         
    }    
}


function playback(){    
    var songTime = game.timestamp - game.songStartTime;
    var current = game.difficulties[game.level].hitObjects[game.hit].time;
    updateHitObjects(songTime);
    if (current <= songTime - 5*TIMECONSTANT) game.hit++;
    if(game.hit == game.difficulties[game.level].hitObjects.length) {
        game.isready = false;        
        game.hit= 0;        
        game.state = menu;
        game.startScene("menu");        
        game.scenes["start"].removeChildren;
        game.scenes["select"].visible = true;
        document.getElementById("drop_zone").style.display = "block";
    };
    game.scenes["stats"].getChildAt(0).text = game.score["goodClicks"];
 }

function loadMenu(){    
    game.bg = new PIXI.Sprite(window.osuTexture["bg"]);    
    game.bg.anchor.set(0.5);
    game.bg.scale.set(2);
    game.bg.alpha= 0.2;
    game.scenes["menu"].addChild(game.bg);
    var graphic = new PIXI.Graphics();
    var windowWidth = window.innerWidth / window.bufferLength;   
    graphic.lineStyle(0);
    graphic.beginFill(0xFFFFFF, 1);
    graphic.drawRect(0, 0, windowWidth*0.5,windowWidth*0.5);
    graphic.endFill();
    var squareTexture =  game.renderer.generateTexture(graphic);    
    for (var i = 1; i < 0.25*window.bufferLength; i++){
        var square = new PIXI.Sprite(squareTexture);           
        square.x = window.innerWidth/2 + i * windowWidth  - 0.25*window.bufferLength*0.5*windowWidth;
        square.y = window.innerHeight/2;
        square.anchor.set(0.5);
        square.alpha = 0.8;
        game.scenes["menu"].addChild(square);
    }
    game.scenes["menu"].addChild(square);

}

function menu() {    
    game.scenes["menu"].getChildAt(0).x = window.innerWidth/2 -game.mouseX/15;
    game.scenes["menu"].getChildAt(0).y = window.innerHeight/2-game.mouseY/15;
    for (var i = 1; i < 0.25*window.bufferLength; i++){
        game.scenes["menu"].getChildAt(i).height = (7*(window.dataArray[i]/256))**3;
    }  
    game.scenes["menu"].getChildAt(0).scale.set(1.7+(dataArray[0]+dataArray[1]+dataArray[2])/(6*256));
    if (game.isready) {        
        game.startScene("start");
        game.scenes["stats"].visible = true;
        game.state = playback;
    }
}

function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);
    game.cursor.x = game.mouseX;
    game.cursor.y = game.mouseY;
    game.cursor.bringToFront();
    game.timestamp = timestamp;
    game.state();
    game.renderer.render(game.stage);
    window.analyser.getByteFrequencyData(window.dataArray);
}


function setup() {
    game.renderer = new PIXI.WebGLRenderer(window.innerWidth, window.innerHeight, { backgroundColor: 0x000000 });
    document.body.appendChild(game.renderer.view);
    game.stage = new PIXI.Container();
    game.addScenes(["menu","select", "start", "stats"]);
    game.state = menu;
    game.startCursor();        
    game.startScene("menu");
    loadMenu();
    menuSound.play();
    gameLoop();
}

setup();
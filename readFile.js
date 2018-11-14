var drop_zone = document.getElementById("drop_zone");
drop_zone.addEventListener('dragenter', dragNOP, false);
drop_zone.addEventListener('dragleave', dragNOP, false);
drop_zone.addEventListener('dragover', dragNOP, false);
drop_zone.addEventListener('drop', handleDragDrop, false);

var HIT_TYPE_CIRCLE = 1,
        HIT_TYPE_SLIDER = 2,
        HIT_TYPE_NEWCOMBO = 4,
        HIT_TYPE_SPINNER = 8;


window.difficulties = [];

function decode(file) {
    var lines = file.replace("\r","").split("\n");
    var difficulty = {
        general     : {},
        metadata    : {},
        difficulty  : {},
        colors      : [],
        events      : [],
        timingPoints: [],
        hitObjects  : [],
    };
    var section = null;
    var combo = 0, index = 0;
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line === "") continue;
        if (line.indexOf("//") === 0) continue;
        if (line.indexOf("[") === 0) {
            //console.log("Section " + line);
            section = line;
            continue;
        }
        switch (section) {
            case "[General]":
                var key = line.substr(0, line.indexOf(":"));
                var value = line.substr(line.indexOf(":") + 1).trim();
                if (isNaN(value)) {
                    difficulty.general[key] = value;
                } else {
                    difficulty.general[key] = (+value);
                }
                break;
            case "[Metadata]":
                var key = line.substr(0, line.indexOf(":"));
                var value = line.substr(line.indexOf(":") + 1).trim();
                if (isNaN(value)) {
                    difficulty.metadata[key] = value;
                } else {
                    difficulty.metadata[key] = (+value);
                }
                break;
            case "[Events]":
                difficulty.events.push(line.split(","));
                break;
            case "[Difficulty]":
                var parts = line.split(":");
                var value = parts[1].trim();
                if (isNaN(value)) {
                    difficulty.difficulty[parts[0]] = value;
                } else {
                    difficulty.difficulty[parts[0]] = (+value);
                }
                break;
            case "[TimingPoints]":
                var parts = line.split(",");
                var t = {
                    offset: +parts[0],
                    millisecondsPerBeat: +parts[1],
                    meter: +parts[2],
                    sampleType: +parts[3],
                    sampleSet: +parts[4],
                    volume: +parts[5],
                    inherited: +parts[6],
                    kaiMode: +parts[7]
                };
                if (t.millisecondsPerBeat < 0) {
                    t.inherited = 1;
                }
                difficulty.timingPoints.push(t);
                break;
            case "[Colours]":
                var parts = line.split(":");
                var value = parts[1].trim();
                difficulty.colors.push(value.split(','));
                break;
            case "[HitObjects]":
                var parts = line.split(",");
                var hit = {
                    x: (+parts[0]) / 512,
                    y: (+parts[1]) / 384,
                    time: +parts[2],
                    type: +parts[3],
                    hitSound: +parts[4],
                };
                // Handle combos
                if ((hit.type & HIT_TYPE_NEWCOMBO) > 0) {
                    combo++;
                    index = 0;
                }
                hit.combo = combo;
                hit.index = index++;

                // Decode specific hit object type
                if ((hit.type & HIT_TYPE_CIRCLE) > 0) {
                    hit.type = "circle";
                    if (parts.length > 5) {
                        hit.addition = parts[5].split(":");
                    }
                } else if ((hit.type & HIT_TYPE_SLIDER) > 0) {
                    hit.type = "slider";
                    var sliderKeys = parts[5].split("|");
                    hit.sliderType = sliderKeys[0];
                    hit.keyframes = [];
                    for (var j = 1; j < sliderKeys.length; j++) {
                        var p = sliderKeys[j].split(":");
                        hit.keyframes.push({ x: (+p[0]) / 512, y: (+p[1]) / 384 });
                    }
                    hit.repeat = +parts[6];
                    hit.pixelLength = +parts[7];
                    if (parts.length > 8) {
                        hit.edgeHitSound = +parts[8];
                    }
                } else if ((hit.type & HIT_TYPE_SPINNER) > 0) {
                    hit.type = "spinner";
                } else {
                    console.log("Attempted to decode unknown hit object type " + hit.type + ": " + line);
                }
               difficulty.hitObjects.push(hit);
        }
    }    
    game.difficulties.push(difficulty);    
}

function selectLevel(level) {           
    game.hit= 0;        
    game.lastHit= 0;
    game.score["goodClicks"] = 0;      
    game.scenes["start"].removeChildren();        
    game.scenes["stats"].removeChildren();
    var hitObjects = game.difficulties[level].hitObjects;
    var sY = window.innerHeight*0.9;
    var ssY = window.innerHeight*0.05;
    var sX = sY * 4 / 3;
    var ssX = (window.innerWidth - sX)/2;
    CIRCLESIZE = 0.9+1/game.difficulties[level].difficulty["CircleSize"];
    APPEAR =1*TIMECONSTANT/game.difficulties[level].difficulty["ApproachRate"];
    FADE =0.8*TIMECONSTANT/game.difficulties[level].difficulty["ApproachRate"];
    for (var i = 0; i < hitObjects.length; i++) {
        var hit = new PIXI.Sprite(window.osuTexture["score"]);
        hit.anchor.set(0.5);
        hit.scale.set(CIRCLESIZE);
        hit.y = hitObjects[i].y * sY + ssY;
        hit.x = hitObjects[i].x * sX + ssX;     
        hit.alpha = 0;
        hit.visible = true;
        game.scenes["start"].addChild(hit);
    }
    var countingText = new PIXI.Text('0', {
        fontWeight: 'bold',
        fontStyle: 'italic',
        fontSize: 60,
        fontFamily: 'Arial',
        fill: '#ffffff',
        align: 'left',
    });
    countingText.anchor.set(0);
    countingText.x=0;
    countingText.y=0;    
    game.scenes["stats"].addChild(countingText);
    game.scenes["stats"].getChildAt(0).text = game.score["goodClicks"];
    game.level = level;
    game.songStartTime = game.timestamp;
    window.gameSound.pause();
    window.gameSound.seek(0);
    window.gameSound.play();
    document.getElementById("drop_zone").style.display = "none";
    game.isready = true;
}

function dragNOP(e) {
    e.stopPropagation();
    e.preventDefault();
}

var levels = 0;
var checkLevels = [];

var check = function() {
    if (checkLevels[levels] === true) {
        document.getElementById("name").innerText = game.difficulties[0].metadata["Title"];
        for(var i = 0 ; i<levels; i++){                       
            document.getElementById("list").innerHTML += '<p onclick="selectLevel('+i+')">'+game.difficulties[i].metadata["Version"]+'</p>';
        }
        game.scenes["select"].visible = true;
        return;
    }
    setTimeout(check, 1000);
}
check();

function handleDragDrop(e) {
    dragNOP(e);
        if(game.difficulties.length>0){
            game.difficulties = [];
        }
    console.log("cargando");
    var files = e.dataTransfer.files;    
    for (var i = 0; i < files.length; i++) {
        if (files[i].name.indexOf(".mp3") !== -1) {
            if (window.gameSound) continue;
            window.gameSound = new Howl({
                src: [URL.createObjectURL(files[i])],
                format: 'mp3'
            });
            window.gameSound.on('end', function () {
                window.gameSound.fade(0, 1, 3000);
                window.gameSound.seek(2*window.gameSound._duration/3);
                window.gameSound.play();
            });
            window.gameSound.once('load', function () {
                window.gameSound.play();
                window.menuSound.pause();
            });
        } else if (files[i].name.indexOf(".osu") !== -1) {
            var reader = new FileReader();
            reader.onload = function (e) {
                decode(e.target.result);
                checkLevels[levels] = true;
            };
            reader.readAsText(files[i], "UTF-8");
            levels++;
        }
    }        
}
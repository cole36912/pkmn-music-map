


//define classes for GPC
var PolyDefault = gpcas.geometry.PolyDefault ;
var ArrayList = gpcas.util.ArrayList;
var PolySimple = gpcas.geometry.PolySimple;
var Clip = gpcas.geometry.Clip;
var OperationType = gpcas.geometry.OperationType;
var LmtTable = gpcas.geometry.LmtTable;
var ScanBeamTreeEntries = gpcas.geometry.ScanBeamTreeEntries;
var EdgeTable = gpcas.geometry.EdgeTable;
var EdgeNode = gpcas.geometry.EdgeNode;
var ScanBeamTree = gpcas.geometry.ScanBeamTree;
var Rectangle = gpcas.geometry.Rectangle;
var BundleState = gpcas.geometry.BundleState;
var LmtNode = gpcas.geometry.LmtNode;
var TopPolygonNode = gpcas.geometry.TopPolygonNode;
var AetTree = gpcas.geometry.AetTree;
var HState = gpcas.geometry.HState;
var VertexType = gpcas.geometry.VertexType;
var VertexNode = gpcas.geometry.VertexNode;
var PolygonNode = gpcas.geometry.PolygonNode;
var ItNodeTable = gpcas.geometry.ItNodeTable;
var StNode = gpcas.geometry.StNode;
var ItNode = gpcas.geometry.ItNode;

/**
 *
 * @typedef {
 *     {
 *         x: number,
 *         y: number,
 *         width: number,
 *         height: number
 *     }
 * } Rectangle
 *
 * @typedef {
 *     Array<{
 *         x: number,
 *         y: number
 *     }>
 * } Polygon
 *
 * @typedef {
 *     {
 *         id: string
 *         name: string
 *         rects: Array<Rectangle>,
 *         music: string
 *     }
 * } Location
 *
 * @typedef {
 *     {
 *         id: string,
 *         type: string,
 *         coord_multiplier: number,
 *         locations: Array<Location>,
 *         src: string,
 *         width: number,
 *         height: number,
 *         parts: Array<{
 *             map: string,
 *             x: number,
 *             y: number,
 *             start_x: number,
 *             start_y: number
 *         }>,
 *         fix_corners: boolean
 *     }
 * } MapItem
 *
 * @typedef {
 *     {
 *         name: string,
 *         maps: Array<string>
 *     }
 * } PageItem
 *
 * @typedef {
 *     {
 *          generations: Array<PageItem>,
 *          regions: Array<PageItem>,
 *          games: Array<PageItem>,
 *          maps: Array<MapItem>,
 *          proxy_url: string
 *     }
 * } Data
 *
 * @typedef {
 *     {
 *         x: number,
 *         y: number,
 *         length: number,
 *         axis: boolean,
 *         rect: number
 *         side: number
 *     }
 * } Side
 */

/**
 * @returns {Array<Polygon>}
 * @param rects {Array<Rectangle>}
 *
 */
function rects_to_polys(rects){
    function createPoly(/*Rectangle*/rect) {
        const res = new PolyDefault();
        res.addPoint(new Point(rect.x, rect.y));
        res.addPoint(new Point(rect.x + rect.width, rect.y));
        res.addPoint(new Point(rect.x + rect.width, rect.y + rect.height));
        res.addPoint(new Point(rect.x, rect.y + rect.height));
        return res;
    }
    let poly = createPoly(rects[0]);
    for(let i = 1; i < rects.length; i++)
        poly = poly.union(createPoly(rects[i]));
    let polys = [];
    for(let i = 0; i < poly.getNumInnerPoly(); i++){
        let sub_poly = poly.getInnerPoly(i);
        let part = [];
        for(let j = 0; j < sub_poly.getNumPoints(); j++)
            part.push({
                x: sub_poly.getX(j),
                y: sub_poly.getY(j)
            });
        polys.push(part);
    }
    return polys;
    /**@returns {boolean}*/ function overlap(/*Side*/ s1, /*Side*/ s2){
        return s1.axis === s2.axis &&
            ( s1.axis
                ? s1.y === s2.y && s1.x + s1.length > s2.x + (s1.x > s2.x) * s2.length
                : s1.x === s2.x && s1.y + s1.length > s2.y + (s1.y > s2.y) * s2.length
            );
    }
    /**@type {Array<Side>}*/ let sides = [];
    for(let i = 0; i < rects.length; i++)
        for(let side = 0; side < 4; side++)
            sides.push({
                x: rects[i].x + (side === 3) * rects[i].width,
                y: rects[i].y + (side === 2) * rects[i].height,
                length: side % 2 === 0 ? rects[i].width : rects[i].height,
                axis: side % 2 === 1,
                rect: i,
                side: side
            });
}


function get_raw(url){
    /**@type {XMLHttpRequest}*/ const request = new XMLHttpRequest();
    request.open("GET", url, false);
    request.send(null);
    return request.responseText
}

/**@type {Data}*/ const data = JSON.parse(get_raw("assets/data.json"));

function append_url(url){
    return data.proxy_url + url;
}

function get(url){
    return get_raw(append_url(url));
}

/**@type {Number}*/ const scale = 4;
/**@type {String}*/ const no_ref = "javascript:void(0)";
let paused = true;

/**@type {Map<String, MapItem>}*/ let maps = new Map();
/**@type {Map<String, {div: HTMLDivElement, is_active: Boolean, active_location: String}>}*/ let block_containers = new Map();
/**@type {Map<String, Array<String>>}*/ let compositions = new Map();
for(let i = 0; i < data.maps.length; i++) {
    maps.set(data.maps[i].id, data.maps[i]);
    let block_container = {
        div: document.createElement("div"),
        is_active: false,
        active_location: ""
    };
    block_container.div = document.createElement("div");
    block_container.div.style.position = "absolute";
    block_container.div.style.left = "0px";
    block_container.div.style.top = "0px";
    block_containers.set(data.maps[i].id, block_container);
    compositions.set(data.maps[i].id, []);
}
for(let map of data.maps){
    if(map.type === "composition"){
        for(let part of map.parts){
            compositions.get(map.id).push(part.map);
            compositions.get(part.map).push(map.id);
        }
    }
}

/**@type {Map<String, String>}*/ let games = new Map();

/**@type {Map<String, Array<String>>}*/ let pages = new Map();
for(let i = 0; i < data.generations.length; i++)
    pages.set(data.generations[i].name, data.generations[i].maps);
for(let i = 0; i < data.regions.length; i++)
    pages.set(data.regions[i].name, data.regions[i].maps);
for(let i = 0; i < data.games.length; i++) {
    pages.set(data.games[i].name, data.games[i].maps);
    for(let j = 0; j < data.games[i].maps.length; j++)
        games.set(data.games[i].maps[j], data.games[i].name);
}

/**@returns {HTMLImageElement}*/ function get_map_image(/*String*/ map_name){
    /**@type {MapItem}*/ let map = maps.get(map_name);
    /**@type {HTMLImageElement}*/ let image = new Image();
    image.setAttribute("crossOrigin", "anonymous");
    if(map.type === "basic"){
        image.src = append_url(map.src);
    }
    else if(map.type === "composition"){
        /**@type {HTMLCanvasElement}*/ let canvas = document.createElement("canvas");
        /**@type {CanvasRenderingContext2D}*/ let ctx = canvas.getContext("2d");
        canvas.width = map.width;
        canvas.height = map.height;
        /**@type {Array<Boolean>}*/ let drawn = [];
        function add_image(){
            if(drawn.every((/*Boolean*/ x) => x)) {
                if(map.fix_corners){
                    ctx.putImageData(ctx.getImageData(1, 0, 1, 1), 0, 0);
                    ctx.putImageData(ctx.getImageData(canvas.width - 2, 0, 1, 1), canvas.width - 1, 0);
                    ctx.putImageData(ctx.getImageData(1, canvas.height - 1, 1, 1), 0, canvas.height - 1);
                    ctx.putImageData(ctx.getImageData(canvas.width - 2, canvas.height - 1, 1, 1), canvas.width - 1, canvas.height - 1);
                }
                image.src = canvas.toDataURL("image/png");
            }
        }
        for(let i  = 0; i < map.parts.length; i++){
            drawn.push(false);
            if(map.parts[i].start_x === 0 && map.parts[i].start_x === 0) {
                get_map_image(map.parts[i].map).addEventListener("load", function () {
                    ctx.drawImage(this, map.parts[i].x, map.parts[i].y);
                    drawn[i] = true;
                    add_image();
                });
            }
            else{
                get_map_image(map.parts[i].map).addEventListener("load", function () {
                    ctx.drawImage(this,
                        map.parts[i].start_x, map.parts[i].start_y,
                        map.parts[i].width, map.parts[i].height,
                        map.parts[i].x, map.parts[i].y,
                        map.parts[i].width, map.parts[i].height);
                    drawn[i] = true;
                    add_image();
                });
            }
        }
    }
    return image;
}

/**@returns {HTMLDivElement}*/ let page = document.createElement("div");


let playing = document.createElement("div");
playing.style.position = "fixed";
playing.style.top = "0px";
playing.style.right = "0px";
playing.style.margin = "20px";
playing.style.padding = "20px";
playing.style.width = "auto";
playing.style.height = "auto";
playing.style.border = "2px solid black";
playing.style.backgroundColor = "hsl(0,0%,83%)";
playing.style.fontWeight = "bold";
//playing.style.animation = "rainbow 4s linear 0s infinite normal";
playing.append("Now Playing: ");
let now_playing = document.createElement("span");
now_playing.innerText = "Nothing";
playing.appendChild(now_playing);



const image_margin = 10;

/**@returns {HTMLMapElement}*/ function get_map_image_map(/*String*/ map_name){
    /**@type {MapItem}*/ let map = maps.get(map_name);
}

const null_part = {
    map: "",
    x: 0,
    y: 0,
    start_x: 0,
    start_y: 0,
    width: 0,
    height: 0
};


/**@returns {void}*/ function post_map(/*String*/ map_name){
    /**@returns {HTMLImageElement}*/ let image = get_map_image(map_name);
    let map = maps.get(map_name);
    image.addEventListener("load", function() {
        this.height = this.height * scale;
        image.style.imageRendering = "pixelated";
        image.style.verticalAlign = "top";
        image.style.margin = `${image_margin}px`;
        image.useMap = `#${map_name}`;
    });
    let container = document.createElement("div");
    container.style.position = "relative";
    let image_map = document.createElement("map");
    image_map.name = map_name;
    /**@returns {void}*/ function create_map(locations, part, coord_multiplier){
        function highlight_location(location){
            for(let block_container of block_containers.values()) {
                block_container.div.innerHTML = "";
                block_container.is_active = false;
            }
            for (let rect of location.rects) {
                let block = document.createElement("div");
                block.style.position = "absolute";
                block.style.left = `${image_margin + scale * (coord_multiplier * rect.x + part.x - part.start_x)}px`;
                block.style.top = `${image_margin + scale * (coord_multiplier * rect.y + part.y - part.start_y)}px`;
                block.style.width = `${scale * coord_multiplier * rect.width}px`;
                block.style.height = `${scale * coord_multiplier * rect.height}px`;
                block.style.backgroundColor = "rgba(255,0,0,0)";
                block.style.animation = "pulse 1s cubic-bezier(0.3, 0.18, 0.58, 1) 0s infinite alternate";
                block_containers.get(map_name).div.appendChild(block);
            }
            block_containers.get(map_name).is_active = true;
            block_containers.get(map_name).active_location = location.id;
        }
        for(let location of locations){
            for(let related of compositions.get(map_name)){
                if(block_containers.get(related).is_active && block_containers.get(related).active_location === location.id){
                    highlight_location(location);
                    break;
                }
            }
            for(let poly of rects_to_polys(location.rects)){
                let area = document.createElement("area");
                area.shape = "poly";
                area.coords = "";
                for (let point of poly)
                    area.coords += `${
                        scale * (coord_multiplier * point.x + part.x - part.start_x)
                    }, ${
                        scale * (coord_multiplier * point.y + part.y - part.start_y)
                    }, `;
                area.coords = area.coords.substr(0, area.coords.length - 2);
                area.href = no_ref;
                area.addEventListener("click", function () {
                    highlight_location(location);
                    player.cueVideoById(location.music);
                    if(location.hasOwnProperty("volume")){
                        player.setVolume(location.volume);
                    }
                    else{
                        player.setVolume(20);
                    }
                    player.playVideo();
                    paused = false;
                    updateControls();
                    let game = "null";
                    if(games.has(map_name)){
                        game = games.get(map_name);
                    }
                    else{
                        for(let related of compositions.get(map_name)){
                            if(games.has(related)){
                                game = games.get(related);
                                break;
                            }
                        }
                    }
                    now_playing.innerText = `${game} ${location.name}`;
                    this.blur();
                });
                image_map.appendChild(area);
            }
        }
    }
    if(map.type === "basic") {
        create_map(map.locations, null_part, map.coord_multiplier);
    }
    else{
        for(let part of map.parts){
            let sub_map = maps.get(part.map);
            create_map(sub_map.locations, part, sub_map.coord_multiplier);
        }
    }
    container.appendChild(image);
    container.appendChild(image_map);
    container.appendChild(block_containers.get(map_name).div);
    page.appendChild(container);
}

/**@returns {void}*/ function set_page(/*PageItem*/ new_page){
    page.innerHTML = "";
    for(let i = 0; i < new_page.maps.length; i++){
        post_map(new_page.maps[i]);
    }

}

function make_bar(/*Array<PageItem>*/ list){
    for(let i = 0; i < list.length; i++) {
        /**@type {HTMLAnchorElement}*/ let anchor = document.createElement("a");
        anchor.href = no_ref;
        anchor.addEventListener("click", function() {
            set_page(list[i]);
        });
        anchor.innerText = list[i].name;
        document.body.append("[ ");
        document.body.appendChild(anchor);
        document.body.append(" ] ");
    }
}


let player;
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '0',
        width: '0',
        videoId: 'D0j9AOEhzO8',
        playerVars: {
            playsinline: 1
        },
        events: {
            onStateChange:
                function(e) {
                    if (e.data === YT.PlayerState.ENDED) {
                        player.playVideo();
                    }
                }
        }
    });
}


/**@type {HTMLStyleElement}*/ let style = document.createElement("style");
let s = "\n";
for(let i = 0; i <= 20; i++)
    s += `${i * 5}%  {color: hsl(${i * 18}, 100%, 50%);}\n`
style.innerHTML = `
#overlay {
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  pointer-events: none;
}
@keyframes pulse {
  0%    {background-color: rgba(255,0,0,0.1);}
  100%  {background-color: rgba(255,0,0,0.75);}
}
@keyframes rainbow {${s}}
`;
document.head.appendChild(style);


document.body.style.fontFamily = "\"Lucida Console\", Monaco, monospace"

document.body.append("Generations: ");
make_bar(data.generations);

document.body.appendChild(document.createElement("br"));

document.body.append("Regions: ");
make_bar(data.regions);

document.body.appendChild(document.createElement("br"));

document.body.append("Games: ");
make_bar(data.games);

document.body.appendChild(document.createElement("br"));

let player_div = document.createElement('div');
player_div.id = "player";
document.body.appendChild(player_div);

document.body.appendChild(document.createElement("br"));

document.body.append("Controls: ");
/**@type {HTMLAnchorElement}*/ let anchor = document.createElement("a");
anchor.href = no_ref;
anchor.addEventListener("click", function() {
    if(paused){
        paused = false;
        player.playVideo();
    }
    else{
        paused = true;
        player.pauseVideo();
    }
    updateControls();

});
function updateControls (){
    if(paused){
        anchor.innerText = "Play";
    }
    else{
        anchor.innerText = "Pause";
    }
}
updateControls();
document.body.append("[ ");
document.body.appendChild(anchor);
document.body.append(" ] ");

document.body.appendChild(document.createElement("br"));


document.body.appendChild(playing);

document.body.appendChild(document.createElement("br"));

document.body.append(page);

let overlay = document.createElement("div");
overlay.id = "overlay";

document.body.appendChild(overlay);

set_page(data.games[0]);



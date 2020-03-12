


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
 *         [rects]: Array<Rectangle>,
 *         music: string,
 *         [volume]: number,
 *         [sub_locations]: Array<Location>
 *     }
 * } Location
 *
 * @typedef {
 *     {
 *         id: string,
 *         type: string,
 *         [coord_multiplier]: number,
 *         [locations]: Array<Location>,
 *         [versions]: Array<String>,
 *         [src]: string,
 *         [width]: number,
 *         [height]: number,
 *         [parts]: Array<{
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

/**@type {Number}*/ const scale = 5;
/**@type {String}*/ const no_ref = "javascript:void(0)";

/**@type {Array<string>}*/ let shown_maps = [];

let paused = true;

/**@type {Map<String, MapItem>}*/ let maps = new Map();
/**@type {Map<String, {div: HTMLDivElement, is_active: Boolean, active_location: String}>}*/ let block_containers = new Map();
/**@type {Map<String, Array<String>>}*/ let compositions = new Map();
/**@type {Map<String, Array<String>>}*/ let containers = new Map();
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
    containers.set(data.maps[i].id, []);
}
for(let map of data.maps){
    if(map.type === "composition"){
        for(let part of map.parts){
            compositions.get(map.id).push(part.map);
            compositions.get(part.map).push(map.id);
            containers.get(part.map).push(map.id);
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

//page.style.display = "inline-block";
//page.style.marginLeft = "auto";
//page.style.marginRight = "auto";


let playing = document.createElement("div");
playing.style.position = "fixed";
playing.style.top = "0px";
playing.style.right = "0px";
playing.style.margin = "20px";
playing.style.padding = "20px";
playing.style.width = "auto";
playing.style.height = "auto";
//playing.style.border = "2px solid black";
//playing.style.backgroundColor = "hsl(0,0%,83%)";
//playing.style.fontWeight = "bold";
//playing.style.animation = "rainbow 4s linear 0s infinite normal";
playing.append("Now Playing: ");
playing.appendChild(document.createElement("br"));
playing.append("[ ");
let now_playing = document.createElement("span");
now_playing.innerText = "Nothing";
playing.appendChild(now_playing);
playing.append(" ]");

playing.appendChild(document.createElement("br"));

let sub_locations = document.createElement("div");
sub_locations.style.top = "0px";
sub_locations.style.left = "0px";
sub_locations.append("Sub-locations:");
sub_locations.appendChild(document.createElement("br"));

playing.appendChild(document.createElement("br"));

let versions = document.createElement("div");
versions.style.top = "0px";
versions.style.left = "0px";
versions.append("Other Versions:");
versions.appendChild(document.createElement("br"));



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

const null_map = {
    type: "null"
};


/**@returns {void}*/ function post_map(/*String*/ map_name){
    /**@returns {HTMLImageElement}*/ let image = get_map_image(map_name);
    let map = maps.get(map_name);
    image.addEventListener("load", function() {
        this.height = this.height * scale;
        image.style.imageRendering = "pixelated";
        image.style.verticalAlign = "top";
        image.style.margin = `${image_margin}px`;
        image.style.pointerEvents = "auto";
        //image.style.display = "block";
        //image.style.marginLeft = "auto";
        //image.style.marginRight = "auto";
        image.useMap = `#${map_name}`;
    });
    let container = document.createElement("div");
    container.style.position = "relative";
    container.style.pointerEvents = "none";
    //container.style.display = "inline-block";
    //container.style.marginLeft = "auto";
    //container.style.marginRight = "auto";
    //container.style.width = "auto";
    let image_map = document.createElement("map");
    image_map.name = map_name;
    function highlight_location(/*Location*/ location, target_map, part){
        let container_map_id = (part === null_part ? target_map.id : containers.get(target_map.id)[0]);
        for(let block_container of block_containers.values()) {
            block_container.div.innerHTML = "";
            block_container.is_active = false;
        }
        for (let rect of location.rects) {
            let block = document.createElement("div");
            block.style.position = "absolute";
            block.style.left = `${image_margin + scale * (target_map.coord_multiplier * rect.x + part.x - part.start_x)}px`;
            block.style.top = `${image_margin + scale * (target_map.coord_multiplier * rect.y + part.y - part.start_y)}px`;
            block.style.width = `${scale * target_map.coord_multiplier * rect.width}px`;
            block.style.height = `${scale * target_map.coord_multiplier * rect.height}px`;
            block.style.backgroundColor = "rgba(255,0,0,0)";
            block.style.pointerEvents = "none";
            block.style.animation = "pulse 1s cubic-bezier(0.3, 0.18, 0.58, 1) 0s infinite alternate";
            block_containers.get(container_map_id).div.appendChild(block);
        }
        block_containers.get(container_map_id).is_active = true;
        block_containers.get(container_map_id).active_location = location.id;
    }


    let parent_location;
    let parent_map;
    let parent_part;

    function play(location, target_map, part){

        let is_sub = true;
        if(target_map.type !== "null") {
            parent_location = location;
            parent_map = target_map;
            parent_part = part;
            is_sub = false;
        }

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

        function game_name(target_map_name){
            let game = "null";
            if(games.has(target_map_name)){
                game = games.get(target_map_name);
            }
            else{
                for(let related of compositions.get(target_map_name)){
                    if(games.has(related)){
                        game = games.get(related);
                        break;
                    }
                }
            }
            return game;
        }
        now_playing.innerText = `${game_name(parent_map.id)} ${location.name}`;

        highlight_location(parent_location, parent_map, parent_part);


        let breaks = playing.getElementsByTagName("br");
        for(let ele of breaks)
            ele.remove();

        playing.appendChild(document.createElement("br"));

        versions.remove();
        versions.innerHTML = "Other Versions:";
        let show_versions = false;
        for(let version of parent_map.versions){
            let version_map = maps.get(version);
            let version_locations = version_map.locations;
            for(let version_location of version_locations){
                if(version_location.id === parent_location.id){
                    let version_parent_location = version_location;
                    if(is_sub){
                        if(!version_location.hasOwnProperty("sub_locations"))
                            break;
                        let found = false;
                        for(let version_sub_location of version_location.sub_locations){
                            if(version_sub_location.id === location.id){
                                found = true;
                                version_location = version_sub_location;
                            }
                        }
                        if(!found)
                            break;
                    }
                    show_versions = true;
                    let version_element = document.createElement("div");
                    let anchor = document.createElement("a");
                    anchor.href = no_ref;
                    anchor.innerText = `${game_name(version)} ${version_location.name}`;
                    anchor.addEventListener("click", function () {
                        let version_part = null_part;
                        outer:
                            for (let shown_map of shown_maps) {
                                for(let version_comp of compositions.get(version)){
                                    if(shown_map === version_comp){
                                        let shown_map_data = maps.get(shown_map);
                                        if(shown_map_data.type === "composition"){
                                            for(let potential_part of shown_map_data.parts){
                                                if(potential_part.map === version){
                                                    version_part = potential_part;
                                                }
                                            }
                                        }
                                        break outer;
                                    }
                                }
                            }
                        parent_map = version_map;
                        parent_part = version_part;
                        parent_location = version_parent_location;
                        play(version_location, (is_sub ? null_map : version_map), (is_sub ? null_part : version_part));
                    });
                    version_element.append("[ ");
                    version_element.appendChild(anchor);
                    version_element.append(" ]");
                    versions.appendChild(version_element);
                    break;
                }
            }
        }
        if(show_versions) {
            playing.appendChild(versions);
            playing.appendChild(document.createElement("br"));
        }



        sub_locations.remove();
        if(is_sub || !location.hasOwnProperty("sub_locations"))
            return;
        sub_locations.innerHTML = "Sub-locations:";
        let show_sub_locations = false;
        for(let sub_location of location.sub_locations){
            show_sub_locations = true;
            let sub_location_element = document.createElement("div");
            let anchor = document.createElement("a");
            anchor.href = no_ref;
            anchor.innerText = `${game_name(target_map.id)} ${sub_location.name}`;
            anchor.addEventListener("click", function () {
                play(sub_location, null_map, null_part);
            });
            sub_location_element.append("[ ");
            sub_location_element.appendChild(anchor);
            sub_location_element.append(" ]");
            sub_locations.appendChild(sub_location_element);
        }
        if(show_sub_locations)
            playing.appendChild(sub_locations);




    }
    /**@returns {void}*/ function create_map(target_map, part, ){
        for(let location of target_map.locations){
            for(let related of compositions.get(map_name)){
                if(block_containers.get(related).is_active && block_containers.get(related).active_location === location.id){
                    highlight_location(location, target_map, part);
                    break;
                }
            }
            for(let poly of rects_to_polys(location.rects)){
                let area = document.createElement("area");
                area.shape = "poly";
                area.coords = "";
                for (let point of poly)
                    area.coords += `${
                        scale * (target_map.coord_multiplier * point.x + part.x - part.start_x)
                    }, ${
                        scale * (target_map.coord_multiplier * point.y + part.y - part.start_y)
                    }, `;
                area.coords = area.coords.substr(0, area.coords.length - 2);
                area.href = no_ref;
                area.addEventListener("click", function () {
                    this.blur();
                    play(location, target_map, part);
                });
                image_map.appendChild(area);
            }
        }
    }
    if(map.type === "basic") {
        create_map(map, null_part);
    }
    else{
        for(let part of map.parts){
            let sub_map = maps.get(part.map);
            create_map(sub_map, part);
        }
    }
    container.appendChild(image);
    container.appendChild(image_map);
    container.appendChild(block_containers.get(map_name).div);
    page.appendChild(container);
}

/**@returns {void}*/ function set_page(/*PageItem*/ new_page){
    page.innerHTML = "";
    shown_maps = [];
    for(let i = 0; i < new_page.maps.length; i++){
        post_map(new_page.maps[i]);
        shown_maps.push(new_page.maps[i]);
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
@font-face {
  font-family: in_game;
  src: url(assets/gen_1-2.ttf);
}
@keyframes pulse {
  0%    {background-color: rgba(255,0,0,0.1);}
  100%  {background-color: rgba(255,0,0,0.75);}
}
@keyframes rainbow {${s}}
`;
document.head.appendChild(style);


document.body.style.fontFamily = "\"Lucida Console\", Monaco, monospace"
//document.body.style.fontFamily = "in_game";

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


set_page(data.games[0]);



/**@returns {string}*/ function get_raw(/*string*/ url){
    /**@type {XMLHttpRequest}*/ const request = new XMLHttpRequest();
    request.open("GET", url, false);
    request.send(null);
    return request.responseText
}
const data = JSON.parse(get_raw("assets/data.json"));
const green = "rgba(0, 128, 0, 0.5)";
const red = "rgba(255, 0, 0, 0.5)";
const blue = "rgba(0, 0, 255, 0.5)";
/**@type {number}*/ const scale = 5;
/**@type {string}*/ const no_ref = "javascript:void(0)";
let map_content = document.createElement("div");
let null_option = document.createElement("option");
null_option.append("-- select --");
null_option.value = "";
let regions = document.createElement("select");
document.body.appendChild(regions);
let maps = {};
regions.addEventListener("change", function(){
    select_map(maps[this.value]);
});
regions.appendChild(null_option);
for(let map of data.maps)
    if(map.type === "basic") {
        maps[map.id] = map;
        let option = document.createElement("option");
        option.value = map.id;
        option.append(map.id);
        regions.appendChild(option);
    }
function select_map(map){
    function create_shape(shape_data, color, scale_data, transpose, access){
        let shape = document.createElement("div");
        if(!scale_data)
            scale_data = {x: 1, y: 1};
        for(let rect_data of shape_data.rects){
            let left = rect_data.x * scale_data.x * scale;
            let top = rect_data.y * scale_data.y * scale;
            let width = rect_data.width * scale_data.x * scale;
            let height = rect_data.height * scale_data.y * scale;
            if(transpose){
                let temp = width;
                width = height;
                height = temp;
                temp = left;
                left = top;
                top = temp;
            }
            if(width < 0){
                left += width;
                width = -width;
            }
            if(height < 0){
                top += height;
                height = -height;
            }
            let rect = document.createElement("div");
            rect.style.position = "absolute";
            rect.style.left = `${left}px`;
            rect.style.top = `${top}px`;
            rect.style.width = `${width}px`;
            rect.style.height = `${height}px`;
            rect.style.backgroundColor = color;
            access(rect);
            shape.appendChild(rect);
        }
        return shape;
    }
    function create_rect(rect_data, color, access){
        return create_shape({rects: [{x: 0, y: 0, width: map.coord_multiplier, height: map.coord_multiplier}]}, color, {x: rect_data.width, y: rect_data.height}, false, access);
    }
    map_content.innerHTML = "";
    let locations = document.createElement("select");
    map_content.appendChild(locations);
    locations.append(null_option);
    map_content.appendChild(document.createElement("br"));
    let rect = document.createElement("a");
    rect.append("New rect");
    rect.href = no_ref;
    map_content.appendChild(rect);
    map_content.append(" | ");
    let shapes = {};
    if(map.shapes)
        for(let shape_data of map.shapes){
            shapes[shape_data.id] = shape_data;
            let shape = document.createElement("a");
            shape.append("New " + shape_data.id);
            shape.href = no_ref;
            map_content.appendChild(shape);
            map_content.append(" | ");
        }
    map_content.appendChild(document.createElement("br"));
    let image_container = document.createElement("div");
    image_container.style.position = "relative";
    let map_image = new Image();
    map_image.src = map.src;
    image_container.appendChild(map_image);
    map_content.appendChild(image_container);
    map_image.addEventListener("load", function() {
        this.height = this.height * scale;
        this.style.imageRendering = "pixelated";
        this.style.verticalAlign = "top";
        this.style.pointerEvents = "auto";
    });
    let render_location = {};
    let render_zone = document.createElement("div");
    render_zone.style.position = "absolute";
    render_zone.style.top = "0";
    render_zone.style.left = "0";
    image_container.appendChild(render_zone);
    function render_shape(shape, data){
        shape.style.left = `${data.x * map.coord_multiplier * scale}px`;
        shape.style.top = `${data.y * map.coord_multiplier * scale}px`;
        shape.style.position = "absolute";
        render_zone.appendChild(shape);
    }
    for(let location_data of map.locations){
        let option = document.createElement("option");
        option.append(location_data.id);
        option.value = location_data.id;
        locations.append(option);
        render_location[location_data.id] = function(){
            render_zone.innerHTML = "";
            function render_data(rect_data, is_shape){
                function render_rect_data(color){
                    let access = function(r){
                        r.addEventListener("mousedown", function(e){
                            let x = e.clientX - rect.offsetLeft;
                            let y = e.clientY - rect.offsetTop;
                            rect.remove();
                            rect = render_rect_data(blue);
                            document.onmouseup = function(){
                                document.onmousemove = null;
                                document.onmouseup = null;
                                rect.remove();
                                render_rect_data(is_shape ? green : red);
                            }
                            document.onmousemove = function(ne){
                                let new_y = Math.round((ne.clientY - y) / scale);
                                let new_x = Math.round((ne.clientX - x) / scale);
                                if(new_x !== rect_data.x || new_y !== rect_data.y){
                                    rect_data.x = new_x;
                                    rect_data.y = new_y;
                                    rect.remove();
                                    rect = render_rect_data(blue);
                                }
                            }
                        });
                    };
                    let rect = is_shape ? create_shape(shapes[rect_data.id], color, rect_data.scale, rect_data.transpose, access) : create_rect(rect_data, color, access);
                    render_shape(rect, rect_data);
                    return rect;
                }
                render_rect_data(is_shape ? green : red);
            }
            if(location_data.rects)
                for(let rect_data of location_data.rects){
                    render_data(rect_data, false);
                }
            if(location_data.no_click_rects)
                for(let rect_data of location_data.no_click_rects){
                    render_data(rect_data, false);
                }
            if(location_data.shapes)
                for(let shape_data of location_data.shapes){
                    render_data(shape_data, true);
                }
        };
    }
    locations.addEventListener("change", function(){
        render_location[this.value]();
    });
}
document.body.appendChild(map_content);
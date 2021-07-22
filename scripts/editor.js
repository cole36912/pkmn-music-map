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
    let current_data, current_render;
    map_content.innerHTML = "";
    let locations = document.createElement("select");
    map_content.appendChild(locations);
    locations.append(null_option);
    map_content.append(" Name: ");
    let name = document.createElement("input");
    name.type = "text";
    map_content.appendChild(name);
    map_content.append(" Music: ");
    let music = document.createElement("input");
    music.type = "text";
    map_content.appendChild(music);
    map_content.append(" ");
    let music_go = document.createElement("a");
    music_go.append("Go");
    music_go.target = "_blank";
    map_content.appendChild(music_go);
    map_content.append(" ");
    let location_out = document.createElement("button");
    location_out.append("Get Location Data");
    location_out.addEventListener("click", function(){
        if(current_data)
            alert(JSON.stringify(current_data));
    });
    map_content.appendChild(location_out);
    map_content.appendChild(document.createElement("br"));
    let new_rect_button = document.createElement("a");
    new_rect_button.append("New rect");
    new_rect_button.href = no_ref;
    new_rect_button.addEventListener("click", function(){
        if(current_data && current_render) {
            let new_rect = {x: 0, y: 0, width: 1, height: 1}
            if(!current_data.rects)
                current_data.rects = [];
            current_data.rects.push(new_rect);
            current_render(new_rect, false, false);
        }
    });
    map_content.appendChild(new_rect_button);
    map_content.append(" | ");
    let shapes = {};
    if(map.shapes)
        for(let shape_data of map.shapes){
            shapes[shape_data.id] = shape_data;
            let new_shape_button = document.createElement("a");
            new_shape_button.append("New " + shape_data.id);
            new_shape_button.href = no_ref;
            new_shape_button.addEventListener("click", function(){
                if(current_data && current_render) {
                    let new_shape = {id: shape_data.id, x: 0, y: 0}
                    if(!current_data.shapes)
                        current_data.shapes = [];
                    current_data.shapes.push(new_shape);
                    current_render(new_shape, true, false);
                }
            });
            map_content.appendChild(new_shape_button);
            map_content.append(" | ");
        }
    let shape_pane = document.createElement("div");
    map_content.appendChild(shape_pane);
    shape_pane.append("Type: ");
    let shape_type = document.createElement("span");
    shape_pane.appendChild(shape_type);
    shape_pane.append(" Scale: (");
    let scale_x_box = document.createElement("input");
    scale_x_box.type = "number";
    shape_pane.appendChild(scale_x_box);
    shape_pane.append(", ");
    let scale_y_box = document.createElement("input");
    scale_y_box.type = "number";
    shape_pane.appendChild(scale_y_box);
    shape_pane.append(") Transpose: ");
    let transpose = document.createElement("input");
    transpose.type = "checkbox";
    shape_pane.appendChild(transpose);
    shape_pane.append(" No-Click: ");
    let no_click = document.createElement("input");
    no_click.type = "checkbox";
    shape_pane.appendChild(no_click);
    shape_pane.append(" ");
    let delete_shape = document.createElement("button");
    delete_shape.append("Delete");
    shape_pane.appendChild(delete_shape);
    shape_pane.append(" ");
    let shape_out = document.createElement("button");
    shape_out.append("Get Shape Data");
    shape_pane.appendChild(shape_out);
    map_content.appendChild(document.createElement("br"));
    function reset_shape_pane(){
        window.unselect = null;
        shape_type.innerHTML = "";
        scale_x_box.value = "";
        scale_x_box.onchange = null;
        scale_y_box.value = "";
        scale_y_box.onchange = null;
        transpose.checked = false;
        transpose.onchange = null;
        no_click.checked = false;
        no_click.onchange = null;
        delete_shape.onclick = null;
        shape_out.onclick = null;
    }
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
            reset_shape_pane();
            current_data = location_data;
            music.value = location_data.music;
            music_go.href = "https://www.youtube.com/watch?v=" + music.value;
            music.onchange = function(){
                location_data.music = music.value;
                music_go.href = "https://www.youtube.com/watch?v=" + music.value;
            };
            name.value = location_data.name;
            name.onchange = function(){
                location_data.name = name.value;
            };
            window.unselect = null;
            render_zone.innerHTML = "";
            function render_data(rect_data, is_shape, is_no_click){
                function render_rect_data(color){
                    let access = function(r){
                        r.addEventListener("mousedown", function(e){
                            let x = e.clientX - rect.offsetLeft;
                            let y = e.clientY - rect.offsetTop;
                            if(window.unselect)
                                window.unselect(rect);
                            rect.remove();
                            rect = render_rect_data(blue);
                            if(is_shape){
                                if(!rect_data.scale){
                                    rect_data.scale = {x: 1, y: 1};
                                }
                                shape_type.innerHTML = rect_data.id;
                                scale_x_box.value = rect_data.scale.x;
                                scale_x_box.onchange = function(){
                                    rect_data.scale.x = parseInt(this.value);
                                    rect.remove();
                                    rect = render_rect_data(blue);
                                };
                                scale_y_box.value = rect_data.scale.y;
                                scale_y_box.onchange = function(){
                                    rect_data.scale.y = parseInt(this.value);
                                    rect.remove();
                                    rect = render_rect_data(blue);
                                };
                                delete_shape.onclick = function(){
                                    for(let i in location_data.shapes)
                                        if (location_data.shapes[i] === rect_data)
                                            location_data.shapes.splice(i, 1);
                                    rect.remove();
                                    reset_shape_pane();
                                };
                            }
                            else{
                                shape_type.innerHTML = "rect";
                                scale_x_box.value = rect_data.width;
                                scale_x_box.onchange = function(){
                                    rect_data.width = parseInt(this.value);
                                    rect.remove();
                                    rect = render_rect_data(blue);
                                };
                                scale_y_box.value = rect_data.height;
                                scale_y_box.onchange = function(){
                                    rect_data.height = parseInt(this.value);
                                    rect.remove();
                                    rect = render_rect_data(blue);
                                };
                                let container = is_no_click ? "no_click_rects" : "rects";
                                delete_shape.onclick = function(){
                                    for(let i in location_data[container])
                                        if (location_data[container][i] === rect_data)
                                            location_data[container].splice(i, 1);
                                    rect.remove();
                                    reset_shape_pane();
                                };
                            }
                            transpose.checked = false;
                            if(is_shape){
                                transpose.checked = rect_data.transpose;
                                transpose.onchange = function(){
                                    rect_data.transpose = transpose.checked;
                                    rect.remove();
                                    rect = render_rect_data(blue);
                                };
                            }
                            else
                                transpose.onchange = null;
                            no_click.checked = is_no_click;
                            if(is_shape)
                                no_click.onchange = function(){
                                    rect_data.no_click = no_click.checked;
                                    is_no_click = no_click.checked;
                                };
                            else
                                no_click.onchange = function(){
                                    if(is_no_click){
                                        if(!location_data.rects)
                                            location_data.rects = [];
                                        for(let i in location_data.no_click_rects)
                                            if (location_data.no_click_rects[i] === rect_data) {
                                                location_data.no_click_rects.splice(i, 1);
                                                location_data.rects.push(rect_data);
                                            }
                                        is_no_click = false;
                                    }
                                    else{
                                        if(!location_data.no_click_rects)
                                            location_data.no_click_rects = [];
                                        for(let i in location_data.rects)
                                            if (location_data.rects[i] === rect_data) {
                                                location_data.rects.splice(i, 1);
                                                location_data.no_click_rects.push(rect_data);
                                            }
                                        is_no_click = true;
                                    }
                                };
                            shape_out.onclick = function(){
                                alert(JSON.stringify(rect_data));
                            };
                            document.onmouseup = function(){
                                document.onmousemove = null;
                                document.onmouseup = null;
                                window.unselect = function(new_rect){
                                    if(rect !== new_rect){
                                        rect.remove();
                                        render_rect_data(is_shape ? green : red);
                                        window.unselect = null;
                                    }
                                };
                            }
                            document.onmousemove = function(ne){
                                let new_y = Math.round((ne.clientY - y) / scale / map.coord_multiplier);
                                let new_x = Math.round((ne.clientX - x) / scale / map.coord_multiplier);
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
                    render_data(rect_data, false, false);
                }
            if(location_data.no_click_rects)
                for(let rect_data of location_data.no_click_rects){
                    render_data(rect_data, false, true);
                }
            if(location_data.shapes)
                for(let shape_data of location_data.shapes){
                    render_data(shape_data, true, shape_data.no_click);
                }
            current_render = render_data;
        };
    }
    locations.addEventListener("change", function(){
        render_location[this.value]();
    });
}
document.body.appendChild(map_content);
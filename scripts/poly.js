class Point{
    constructor(/*number | Point*/ x, /*number?*/ y) {
        if(arguments.length === 1){
            /**@type {number}*/ this.x = x.x;
            /**@type {number}*/ this.y = x.y;
        }
        else{
            /**@type {number}*/ this.x = x;
            /**@type {number}*/ this.y = y;
        }
    }
    /**@returns {Point}*/ add(/*Point*/ point){
        return new Point(this.x + point.x, this.y + point.y);
    }
    /**@returns {Point}*/ scale(/*number*/ lambda){
        return new Point(this.x * lambda, this.y * lambda);
    }
    /**@returns {boolean}*/ equals(/*Point*/ point){
        return this.x === point.x && this.y === point.y;
    }
    /**@returns {string}*/ toString(){
        return `(${this.x},${this.y})`;
    }
}

class Rectangle{
    constructor(/*number | Point | {x: number, y: number, width: number, height: number}*/ x, /*number? | Point?*/ y, /*number?*/ width, /*number?*/ height) {
        if(arguments.length === 2){
            /**@type {Point}*/ this.position = x;
            /**@type {Point}*/ this.dimenstions = y;
        }
        else{
            if(arguments.length === 1){
                y = x.y;
                width = x.width;
                height = x.height;
                x = x.x;
            }
            /**@type {Point}*/ this.position = new Point(x, y);
            /**@type {Point}*/ this.dimenstions = new Point(width, height);
        }
    }
    /**@returns {number}*/ getArea(){
        return this.dimenstions.x * this.dimenstions.y;
    }
    /**@returns {void}*/ generateCompatibilityParameters(){
        /**@type {number}*/ this.x = this.position.x;
        /**@type {number}*/ this.y = this.position.y;
        /**@type {number}*/ this.width = this.dimenstions.x;
        /**@type {number}*/ this.height = this.dimenstions.y;
    }
    /**@returns {void}*/ generateMaxPos(){
        /**@type {Point}*/ this.max = this.position.add(this.dimenstions);
    }
    /**@returns {string}*/  toString(){
        return `Rectangle(${this.position.toString()},${this.dimenstions.toString()})`;
    }
}

class Polygon{
    constructor(/*Array<Point>? | Point?*/ ...points) {
        if(arguments.length === 0){
            /**@type {Array<Point>}*/ this.points = [];
        }
        else if(arguments.length === 1){
            /**@type {Array<Point>}*/ this.points = points[0];
        }
        else{
            /**@type {Array<Point>}*/ this.points = points;
        }
    }
    /**@returns {void}*/ addPoint(/*Point*/ point){
        this.points.push(point);
    }
    /**@returns {void}*/ addPoints(/*Array<Point> | Point*/ ...points){
        if(arguments.length === 1){
            this.points = this.points.concat(points[0]);
        }
        else{
            this.points = this.points.concat(points);
        }
    }
}


class Edge{
    constructor(/*Point*/ position, /*number | string*/ side, /*number*/ length) {
        /**@type {Point}*/ this.position = position;
        if(typeof side === "string")
            side = "trbl".indexOf(side);
        /**@type {boolean}*/ this.is_vertical = side % 2 === 1;
        /**@type {number}*/ this.length = length;
        /**@type {number}*/ this.side = side;
        /**@type {Point}*/ this.end = this.position.add(
            (
                this.side % 2 === 0 ?
                    new Point(1, 0) : new Point(0, 1)
            ).scale(
                this.length *
                (
                    Math.trunc(this.side / 2)  === 0 ?
                        1 : -1
                )
            )
        );
        console.assert(this.end.equals(this.end_func()));
    }
    /**@returns {Point}*/ end_func(){
        switch(this.side){
            case 0: return this.position.add(new Point(this.length, 0));
            case 1: return this.position.add(new Point(0, this.length));
            case 2: return this.position.add(new Point(-this.length, 0));
            case 3: return this.position.add(new Point(0, -this.length));
        }
    }
}


/**@returns {Array<Polygon>}*/ function rects_to_polys(/*Array<Rectangle>*/ rectangles){
    //Collect pixels
    /**@type {Map<number, Set<number>>}*/ let grid = new Map();
    for(let rectangle of rectangles){
        rectangle.generateMaxPos();
        for(let x = rectangle.position.x; x < rectangle.max.x; x++){
            if(!grid.has(x))
                grid.set(x, new Set());
            for(let y = rectangle.position.y; y < rectangle.max.y; y++)
                grid.get(x).add(y);
        }
    }
    //Collect Edges
    /**@type {Array<Edge>}*/ let unit_edges = [];
    for(let x of grid){
        for(let y of x[1]){
            if(!x[1].has(y - 1))
                unit_edges.push(new Edge(new Point(x[0], y), 0, 1));
            if(!(grid.has(x[0] + 1) && grid.get(x[0] + 1).has(y)))
                unit_edges.push(new Edge(new Point(x[0] + 1, y), 1, 1));
            if(!x[1].has(y + 1))
                unit_edges.push(new Edge(new Point(x[0] + 1, y + 1), 2, 1));
            if(!(grid.has(x[0] - 1) && grid.get(x[0] - 1).has(y)))
                unit_edges.push(new Edge(new Point(x[0], y + 1), 3, 1));
        }
    }
    //Merge Edges
    /**@type {Array<Map<string, Array<Edge>>>}*/ let edges = [new Map(), new Map()];
    while(!(unit_edges.length === 0)){
        /**@type {Edge}*/ let current_edge = unit_edges.pop();
        /**@type {boolean}*/ let done = false;
        while(!done){
            done = true;
            for(let i = 0; i < unit_edges.length; i++){
                if(current_edge.is_vertical && unit_edges[i].is_vertical
                    && current_edge.position.x === unit_edges[i].position.x
                    && current_edge.side === unit_edges[i].side){
                    if(current_edge.position.equals(unit_edges[i].end)){
                        current_edge.length++;
                        current_edge.position = new Point(unit_edges[i].position);
                        unit_edges.splice(i, 1);
                        done = false;
                        break;
                    }
                    else if(current_edge.end.equals(unit_edges[i].position)){
                        current_edge.length++;
                        current_edge.end = new Point(unit_edges[i].end);
                        unit_edges.splice(i, 1);
                        done = false;
                        break;
                    }
                }
                else if(!current_edge.is_vertical && !unit_edges[i].is_vertical
                    && current_edge.position.y === unit_edges[i].position.y
                    && current_edge.side === unit_edges[i].side){
                    if(current_edge.position.equals(unit_edges[i].end)){
                        current_edge.length++;
                        current_edge.position = new Point(unit_edges[i].position);
                        unit_edges.splice(i, 1);
                        done = false;
                        break;
                    }
                    else if(current_edge.end.equals(unit_edges[i].position)){
                        current_edge.length++;
                        current_edge.end = new Point(unit_edges[i].end);
                        unit_edges.splice(i, 1);
                        done = false;
                        break;
                    }
                }
            }
        }
        let map = edges[current_edge.side % 2];
        if(!map.has(current_edge.position.toString()))
            map.set(current_edge.position.toString(), []);
        map.get(current_edge.position.toString()).push(current_edge);
    }
    //Make polygon
    /**@type {Array<Polygon>}*/ let polygons = [];
    while(!(edges[0].size === 0 && edges[1].size === 0)){
        /**@type {Polygon}*/ let polygon = new Polygon();
        /**@type {Edge}*/ let current_edge = edges[0].get(edges[0].keys().next().value).pop();
        if(edges[0].get(edges[0].keys().next().value).length === 0)
            edges[0].delete(edges[0].keys().next().value)
        /**@type {Point}*/ let start = current_edge.position;
        polygon.addPoint(current_edge.position);
        while(!current_edge.end.equals(start)){
            /**@type {Array<Edge>}*/ let next_edges = edges[(current_edge.side  + 1) % 2].get(current_edge.end.toString());
            if(next_edges.length === 2){
                current_edge = next_edges.splice(Number(next_edges[0].side !== (current_edge.side + 1) % 4), 1)[0];
            }
            else{
                edges[(current_edge.side  + 1) % 2].delete(current_edge.end.toString());
                current_edge = next_edges[0];
            }
            polygon.addPoint(current_edge.position);
        }
        polygons.push(polygon);
    }
    return polygons;
}



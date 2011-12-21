RAMAP.newMapView = function(){
  var MapView = {
    stage: 0,
    canvas: 0,
    ctx: 0,
    height: 0,
    width: 0,
    scale: 0,
//    draggingRect: false,
//    dragImg: 0,
    clickCallback: 0,
    lastTileset: 0,
    lastTiles: 0,
    init: function(id, width, height, scale, clickCallback){
      MapView.stage = new Kinetic.Stage(id, width, height);
      MapView.canvas = MapView.stage.getCanvas();
      MapView.ctx = MapView.stage.getContext();
      MapView.height = height;
      MapView.width = width;
      MapView.scale = scale;
      MapView.clickCallback = clickCallback;
      },
/**    setDragImg: function(imgObj, posX, posY, scale){
        console.log(imgObj);
        MapView.stage.removeAll();
        MapView.stage.removeEventListenerType("mousedown", MapView.clicked);
        MapView.stage.removeEventListenerType("mousemove", MapView.mousemoved);
        var drawImg = Kinetic.drawImage(imgObj, posX, posY);
        MapView.dragImg = new Kinetic.Shape(drawImg); 
        MapView.dragImg.setScale(scale);
        MapView.draggingRect = true;
        MapView.stage.add(MapView.dragImg);
        MapView.stage.addEventListener("mousemove", MapView.mousemoved, false);
        MapView.stage.addEventListener("mousedown", MapView.clicked);
    },*/
    zoomIn: function(){
      MapView.scale = MapView.scale + 3;
      if( MapView.scale > RAMAP.MAX_ZOOM){
        MapView.scale = RAMAP.MAX_ZOOM; 
      }
      
      MapView.drawMap( null, null, RAMAP.shiftX, RAMAP.shiftY, MapView.scale); // render to show changes
    },
    zoomOut: function(){
      MapView.scale = MapView.scale - 3;
      if( MapView.scale < RAMAP.MIN_ZOOM){
        MapView.scale = RAMAP.MIN_ZOOM; 
      }
      MapView.drawMap( null, null, RAMAP.shiftX, RAMAP.shiftY, MapView.scale); // render to show changes
    },
    onDebug: function(){
      RAMAP.DEBUG = RAMAP.DEBUG^1
      console.log( RAMAP.DEBUG );
      MapView.drawMap( null, null, RAMAP.shiftX, RAMAP.shiftY, MapView.scale); // render to show changes
    },
    drawMap: function(mapTiles, tileset, shiftX, shiftY, scale ){
 
     //clear in case of redraw
     MapView.ctx.clearRect ( -1200 , -1200 , 3600, 3600 );

     if ( mapTiles !== undefined && mapTiles !== null){
      MapView.lastTiles = mapTiles; 
     }else if(MapView.lastTiles !== 0){
      mapTiles = MapView.lastTiles;
     }else{
      console.log("ah jeez");
      return;
     }

     if ( tileset !== undefined && tileset !== null){
      MapView.lastTileset = tileset; 
     }else if( MapView.lasTileset !== 0){
      tileset = MapView.lastTileset;
     }else{
      console.log("oh boy");
      return;
     }

     if ( shiftX !== undefined && shiftX !== 0 && shiftX !== null ){
      var shiftX = Math.round( Number(shiftX) );
     }else{
      var shiftX = 0; 
     }
     if ( shiftY !== undefined && shiftY !== 0 && shiftY !== null ){
      var shiftY = Math.round( Number(shiftY) );
     }else{
      var shiftY = 0; 
     }
     if ( scale !== undefined && scale !== 0 && scale !== null ){
      //console.log("changing scale: " + scale );
      var scale = Math.round( Number(scale) );
     }else{
      var scale = MapView.scale; 
     }

     //how many tiles fit on canvas
     var drawWidth = Math.round( RAMAP.CANVAS_WIDTH / scale ); 
     var drawHeight = Math.round( RAMAP.CANVAS_HEIGHT / scale ); 

     //console.log( startI + " " + startJ + " " + endI + " " + endJ);
     for( i = 0; i < drawWidth; i++){
      for( j = 0; j < drawHeight; j++){
        var indexI = ( i - shiftX );  
        var indexJ = ( j - shiftY );  
        if ( indexI >= 0 && indexI < RAMAP.CANVAS_SIZE &&  indexJ >= 0 && indexJ < RAMAP.CANVAS_SIZE){
          var tile = mapTiles[indexI][indexJ];

          if (RAMAP.DEBUG === 0 || RAMAP.DEBUG === undefined){
            tile.render(MapView.ctx, tileset, indexI+shiftX, indexJ+shiftY, scale);
          }
          else{
            MapView.ctx.fillText( tile.templateID, (indexI +shiftX)*scale, (indexJ+shiftY)*scale+10);
            MapView.ctx.fillText( tile.index, (indexI+shiftX)*scale+1, (indexJ+shiftY)*scale+20);
            MapView.ctx.strokeRect((indexI+shiftX)*scale, (indexJ+shiftY)*scale, scale, scale);
          }
          
        }
      }
     }
    }/**,
    clicked: function(){
      console.log(MapView.currTempID);
      var mousePos = MapView.stage.getMousePos();
      MapView.clickCallback(mousePos.x - 500, mousePos.y);
      //MapView.draggingRect = false;
    },
    mousemoved: function(){
      var mousePos = MapView.stage.getMousePos();
      //console.log("mouseMove");
      MapView.dragImg.setScale(MapView.scale/RAMAP.CHUNK_SIZE);
      MapView.dragImg.x = Math.floor((mousePos.x - 500) / MapView.scale) * MapView.scale;
      MapView.dragImg.y = Math.floor((mousePos.y ) / MapView.scale) * MapView.scale;
      MapView.stage.draw();
    }*/
  }
  return MapView;
};

RAMAP.newPickerView = function(){
  var PickerView = {
    canvas: 0,
    width: 0,
    height: 0,
    posX: 0,
    posY: 0,
    init: function(id){
      PickerView.canvas = document.getElementById(id);
      //console.log(PickerView.canvas);
      PickerView.width = $(PickerView.canvas).width();
      PickerView.height = $(PickerView.canvas).height();
    },
    scrollUp: function(value){
      if( PickerView.posY - value >= 0 ){
        PickerView.posY = PickerView.posY - value; 
        var translation = 'translate( 0px, -' + PickerView.posY + 'px)'; 
        
        updated_css = {
          '-webkit-transition': 'all .5s ease-in',
          '-webkit-transform' : translation
        }
        $(PickerView.canvas).css(updated_css);
      }
    },
    scrollDown: function(value){
      if( PickerView.posY + value < PickerView.height ){
        PickerView.posY = PickerView.posY + value; 
        var translation = 'translate( 0px, -' + PickerView.posY + 'px)'; 
        
        updated_css = {
          '-webkit-transition': 'all .5s ease-in',
          '-webkit-transform' : translation
        }
        $(PickerView.canvas).css(updated_css);
      }
    }
  }
  return PickerView;
};


RAMAP.newToolPalette = function(){
  var ToolPalette = {
    tools: {},
    mapView: 0,
    currentTool: 0,
    currentID: 0,
    dragImg: 0,
    init: function(mapView){
      ToolPalette.mapView = mapView;
      ToolPalette.loadIcons();
    },
    addTool: function( tool ){
      ToolPalette.tools[tool.name] = tool;
    },
    setTool: function(key){
      if ( isNaN(key) ){
        ToolPalette.currentID = 0;
        ToolPalette.currentTool = ToolPalette.tools[key];
        ToolPalette.mapView.setDragImg( ToolPalette.currentTool.source.image, -900,-900, 1); 
      }else{
        ToolPalette.currentID = key;
        ToolPalette.currentTool = ToolPalette.tools["tileBrush"];
        ToolPalette.mapView.setDragImg( RAMAP.tileset.templates[key].source.image, -900, -900, RAMAP.mapView.scale/RAMAP.CHUNK_SIZE); 
      }
    },
    loadIcons: function(callback){
      var toolCount = Object.keys(ToolPalette.tools).length;
      var loadedCount = 0;
      for( key in ToolPalette.tools ){
        var tool = ToolPalette.tools[key];
        if( tool.source !== 0 ){
          tool.source.image.onload = function(){
            toolCount++;
            if( loadedCount >= toolCount ){
              callback.call(this);
            }
          }
        }else{
          toolCount = toolCount - 1;
        }
      }
    },
    setDragImg: function(imgObj, posX, posY, scale){
        console.log(imgObj);
        var stage = ToolPalette.mapView.stage;
        stage.removeAll();
        stage.removeEventListenerType("mousedown", ToolPalette.clickHandler);
        stage.removeEventListenerType("mousemove", ToolPalette.mousemoved);
        var drawImg = Kinetic.drawImage(imgObj, posX, posY);
        ToolPalette.dragImg = new Kinetic.Shape(drawImg); 
        ToolPalette.dragImg.setScale(scale);
        ToolPalette.draggingRect = true;
        stage.add(ToolPalette.dragImg);
        stage.addEventListener("mousemove", ToolPalette.mousemoved, false);
        stage.addEventListener("mousedown", ToolPalette.clickHandler);
    },
    clicked: function(){
      console.log(MapView.currTempID);
      var mousePos = MapView.stage.getMousePos();
      MapView.clickCallback(mousePos.x - 500, mousePos.y);
      //MapView.draggingRect = false;
    },
    mousemoved: function(){
      var mapView = ToolPalette.mapView;
      var mousePos = mapView.stage.getMousePos();
      //console.log("mouseMove");
      if( ToolPalette.currentTool.name !== "hand" ){
        ToolPalette.dragImg.setScale(mapView.scale/RAMAP.CHUNK_SIZE);
      }
      ToolPalette.dragImg.x = Math.floor((mousePos.x - 500) / mapView.scale) * mapView.scale;
      ToolPalette.dragImg.y = Math.floor((mousePos.y ) / mapView.scale) * mapView.scale;
      mapView.stage.draw();
    },
    clickHandler: function(){
      var mousePos = ToolPalette.mapView.stage.getMousePos();
      ToolPalette.currentTool.action(ToolPalette.currentID, mousePos.x, mousePos.y);
    }
  }
  return ToolPalette;
};

RAMAP.newTool = function(){
  var Tool = {
    name: 0,
    action: 0,
    source: 0,
    init: function (name, action, imgPath){
      Tool.name = name;
      Tool.action = action;
      if( imgPath !== undefined && imgPath !== null ){
        Tool.source = RAMAP.newSourceImage();
        Tool.source.init( imgPath + Tool.name + ".png");
      }
    }
  }
  return Tool;
}

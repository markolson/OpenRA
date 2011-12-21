var RAMAP = {};
RAMAP.BYTE_MAX_VALUE = 255;
RAMAP.CHUNK_SIZE = 24;
RAMAP.CANVAS_SIZE = 128;
RAMAP.CANVAS_WIDTH = 900;
RAMAP.CANVAS_HEIGHT = 900;
RAMAP.DEFAULT_SCALE = 12;

RAMAP.MAX_ZOOM = 42;
RAMAP.MIN_ZOOM = 3;

//RAMAP.mapTiles;
//RAMAP.resourceTiles;
//RAMAP.templateMap = {};
//RAMAP.templates = {};
//RAMAP.sources = {};
RAMAP.tileset;

RAMAP.DEBUG = 0;
RAMAP.TERRAIN_ID = 65535;

$(document).ready( function(){
    /**
  var isDown = false; // whether mouse is pressed
  var startCoords = []; // 'grab' coordinates when pressing mouse
  var last = [0, 0]; // previous coordinates of mouse release

  RAMAP.canvas.onmousedown = function(e) {
    isDown = true;

    startCoords = [
        e.offsetX - last[0], // set start coordinates
        e.offsetY - last[1]
   ];
  };

  RAMAP.canvas.onmouseup   = function(e) {
      isDown = false;

      last = [
          e.offsetX - startCoords[0], // set last coordinates
          e.offsetY - startCoords[1]
      ];
  };

  RAMAP.canvas.onmousemove = function(e)
  {
      if(!isDown) return; // don't pan if mouse is not pressed

      var x = e.offsetX;
      var y = e.offsetY;

      // set the canvas' transformation matrix by setting the amount of movement:
      // 1  0  dx
      // 0  1  dy
      // 0  0  1

      //RAMAP.ctx.setTransform(1, 0, 0, 1,
      //                 x - startCoords[0], y - startCoords[1]);
      //console.log( "dx: " + (x - startCoords[0]) + "dy: " + (y - startCoords[1]) );
      RAMAP.shiftX = Math.floor( (( x - startCoords[0] ) / RAMAP.scale) / 2);
      RAMAP.shiftY = Math.floor( (( y - startCoords[1] ) / RAMAP.scale) / 2);


      //console.log( "shiftX: "+ shiftX + "shiftY: " + shiftY );

      //RAMAP.shiftX = RAMAP.getShift(RAMAP.shiftX - shiftX);
      //RAMAP.shiftY = RAMAP.getShift(RAMAP.shiftY - shiftY);

      //console.log( "RA.shiftX: "+ RAMAP.shiftX + "RA.shiftY: " + RAMAP.shiftY );
      RAMAP.drawMap( RAMAP.shiftX, RAMAP.shiftY, RAMAP.scale); // render to show changes

  }
  /** 
  RAMAP.getShift = function(value){
    if ( value > RAMAP.CANVAS_SIZE ){
        value = RAMAP.CANVAS_SIZE;
      }
      else if ( value < -RAMAP.CANVAS_SIZE ) {
        value = -RAMAP.CANVAS_SIZE;
      }
    return value;
  }*/
  //$.getScript('javascript/mapview.js', function( data, textStatus) {  
    RAMAP.tileset = RAMAP.newTileset();
    RAMAP.tileset.init('ajax/snow.json', "/images/ramap/Snow/");
    RAMAP.tileset.loadTemplates(RAMAP.init);
  //});
});
RAMAP.init = function (){
  RAMAP.mapView = RAMAP.newMapView();
  RAMAP.mapView.init("map_window", 900, 900, RAMAP.DEFAULT_SCALE);
  RAMAP.canvas = RAMAP.mapView.canvas;
  RAMAP.ctx = RAMAP.mapView.ctx;

  RAMAP.picker = RAMAP.newPickerView();
  RAMAP.picker.init("template_picker");

  RAMAP.mapIO = RAMAP.newMapIO();
  RAMAP.mapIO.init(document , RAMAP.onMapRead, RAMAP.onMapWrite);

  //create and add tools
  var tools= {};
  tools["cursor"] = {"action": function(posX, posY){ console.log("cursor! " + posX + " " + posY);}};
  tools["hand"] = {"action": function(posX, posY){ console.log("hand! " + posX + " " + posY);}, "isTileCursor": false};
  tools["tileBrush"] = {"action": function(posX, posY){ console.log("tileBrush! " + posX + " " + posY);}};

  RAMAP.toolPalette = RAMAP.newToolPalette();
  for ( key in tools ){
    var tool = RAMAP.newTool();
    tool.init( key, tools[key].action, "/images/tools/", tools[key].isTileCursor);
    RAMAP.toolPalette.addTool( tool );
  }
  RAMAP.toolPalette.init(RAMAP.mapView);
  RAMAP.toolPalette.setTool("cursor");

  //add templates to template picker
  for ( key in RAMAP.tileset.templates ){
    //console.log(RAMAP.templates[key]);
    var template = RAMAP.tileset.templates[key];
    $("#template_picker").append('<input type="image" src="' + template.source.image.src + '" id="'+key+'" onclick="RAMAP.toolPalette.setTool('+key+')" >');
  }
}

RAMAP.onMapRead = function(){
  RAMAP.mapView.drawMap(RAMAP.mapIO.mapData.tiles, RAMAP.tileset);
}

RAMAP.onMapWrite= function(fileEntry){
  console.log('mapwrite callback');
  $('#download').html("<a href='"+fileEntry.toURL()+"'> Download </a>");
}
RAMAP.setCursor = function(key){
  var template = RAMAP.tileset.templates[key];
  RAMAP.mapView.setDragImg(key, template.source.image, 0, 0);
}

/**
RAMAP.onDebug = function(){
  RAMAP.mapView.onDebug();
  //RAMAP.mapView.drawMap( RAMAP.mapIO.mapData.tiles, RAMAP.tileset);
}*/

RAMAP.saveMap = function(){
  window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
  window.requestFileSystem( /**window.PERSISTENT*/ window.TEMPORARY, 1, RAMAP.mapIO.onInitFS , RAMAP.mapIO.errorHandler);
}



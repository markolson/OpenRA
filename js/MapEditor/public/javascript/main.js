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
RAMAP.tilesets = {}; 
RAMAP.tileset;

RAMAP.DEBUG = 0;
RAMAP.TERRAIN_ID = 65535;

$(document).ready( function(){
    //$("#menu").hide();
    //$("#app").hide();
    var tl = RAMAP.newTilesetLoader();
    tl.init(RAMAP.init);
});

RAMAP.setTileset = function( tileset ){
  RAMAP.tileset = RAMAP.tilesets[tileset];
  for (key in RAMAP.tilesets){
    if( key === tileset ){
      $("."+tileset).show();
    }else{
      $("."+key).hide();
    }
  }
  if ( RAMAP.mapIO.mapData.tiles !== 0 ){ 
    RAMAP.mapView.drawMap(RAMAP.mapIO.mapData.tiles, RAMAP.tileset);
  }
}

RAMAP.newMap = function(){
  //$("#instructions").hide();
  //$("#menu").show();
  //$("#app").show();
  RAMAP.mapIO.newMap( Number( $("#new_width").val()), Number($("#new_height").val()) );
  RAMAP.mapView.drawMap(RAMAP.mapIO.mapData.tiles, RAMAP.tileset);
}

RAMAP.init = function (){
  //set default template
  RAMAP.tileset = RAMAP.tilesets["snow"];

  RAMAP.mapView = RAMAP.newMapView();
  RAMAP.mapView.init("map_window", 900, 900, RAMAP.DEFAULT_SCALE, RAMAP.onMapClick, RAMAP.onMapUp);
  RAMAP.canvas = RAMAP.mapView.canvas;
  RAMAP.ctx = RAMAP.mapView.ctx;

  RAMAP.picker = RAMAP.newPickerView();
  RAMAP.picker.init("template_picker");

  RAMAP.mapIO = RAMAP.newMapIO();
  RAMAP.mapIO.init(document , RAMAP.onMapRead, RAMAP.onMapWrite);

  //create and add tools
  var tools= {};
  tools["cursor"] = {"action": function(id, posX, posY){ console.log(id + " cursor! " + posX + " " + posY);}};
  tools["hand"] = {"action": function(id, posX, posY){ RAMAP.mapView.dragOn = true;}, "upAction": function(id, posX, posY){ RAMAP.mapView.dragOn = false;}, "isTileCursor": false};
  tools["tileBrush"] = {"action": function(id, posX, posY, mapX, mapY){ 
    console.log(id + " tileBrush! " + posX + " " + posY + "Tile " + mapX + " " + mapY);
    RAMAP.mapIO.mapData.addTemplate( mapX, mapY, RAMAP.tileset.templates[id] );
    RAMAP.mapView.drawMap(RAMAP.mapIO.mapData.tiles, RAMAP.tileset);
  }};

  RAMAP.toolPalette = RAMAP.newToolPalette();
  for ( key in tools ){
    var tool = RAMAP.newTool();
    tool.init( key, tools[key].action, tools[key].upAction, "/images/tools/", tools[key].isTileCursor);
    RAMAP.toolPalette.addTool( tool );
  }
  RAMAP.toolPalette.init(RAMAP.mapView);
  RAMAP.toolPalette.setTool("hand");
};

RAMAP.onMapRead = function(){
  RAMAP.mapView.drawMap(RAMAP.mapIO.mapData.tiles, RAMAP.tileset);
};

RAMAP.onMapWrite = function(fileEntry){
  console.log('mapwrite callback');
  $('#download').html("<a href='"+fileEntry.toURL()+"'> Download </a>");
};

RAMAP.onMapClick = function(mosX, mosY, mapX, mapY){
  RAMAP.toolPalette.clickHandler(mosX, mosY, mapX, mapY);
};

RAMAP.onMapUp = function(mosX, mosY, mapX, mapY){
  RAMAP.toolPalette.upHandler(mosX, mosY, mapX, mapY);
};

/**
RAMAP.onDebug = function(){
  RAMAP.mapView.onDebug();
  //RAMAP.mapView.drawMap( RAMAP.mapIO.mapData.tiles, RAMAP.tileset);
}*/

RAMAP.saveMap = function(){
  window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
  window.requestFileSystem( /**window.PERSISTENT*/ window.TEMPORARY, 1, RAMAP.mapIO.onInitFS , RAMAP.mapIO.errorHandler);
}



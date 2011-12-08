var RAMAP = {};
RAMAP.BYTE_MAX_VALUE = 255;
RAMAP.CHUNK_SIZE = 6;
RAMAP.SCALE = 12;
RAMAP.CANVAS_SIZE = 128;
RAMAP.CANVAS_WIDTH = 900;
RAMAP.CANVAS_HEIGHT = 900;

RAMAP.sizeX;
RAMAP.sizeY;
RAMAP.byteSize;

RAMAP.mapTiles;
RAMAP.resourceTiles;

RAMAP.templateMap = new Array(65535);
RAMAP.templates = new Array(65535);
RAMAP.sources = new Array(65535);

//RAMAP.shiftX = 0;
//RAMAP.shiftY = 0;


$(document).ready( function(){
  RAMAP.canvas = document.getElementById("canvas");
  RAMAP.ctx = RAMAP.canvas.getContext("2d");

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
      var shiftX = Math.floor( (( x - startCoords[0] ) / RAMAP.SCALE) / 2);
      var shiftY = Math.floor( (( y - startCoords[1] ) / RAMAP.SCALE) / 2);


      console.log( "shiftX: "+ shiftX + "shiftY: " + shiftY );

      //RAMAP.shiftX = RAMAP.getShift(RAMAP.shiftX - shiftX);
      //RAMAP.shiftY = RAMAP.getShift(RAMAP.shiftY - shiftY);

      //console.log( "RA.shiftX: "+ RAMAP.shiftX + "RA.shiftY: " + RAMAP.shiftY );
      RAMAP.drawMap( shiftX, shiftY, RAMAP.SCALE); // render to show changes

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
  }*//

});

RAMAP.errorHandler = function(e) {
  var msg = '';

  switch (e.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
      msg = 'QUOTA_EXCEEDED_ERR';
      break;
    case FileError.NOT_FOUND_ERR:
      msg = 'NOT_FOUND_ERR';
      break;
    case FileError.SECURITY_ERR:
      msg = 'SECURITY_ERR';
      break;
    case FileError.INVALID_MODIFICATION_ERR:
      msg = 'INVALID_MODIFICATION_ERR - is the file writable? does the file already exist?';
      break;
    case FileError.INVALID_STATE_ERR:
      msg = 'INVALID_STATE_ERR';
      break;
    default:
      msg = 'Unknown Error';
      break;
  };

  console.log('Error: ' + msg);
};

RAMAP.handleFileDrop = function (evt) {
    evt.stopPropagation();
    evt.preventDefault();
    var files = evt.dataTransfer.files; // FileList object.
    RAMAP.handleFiles(files);
};

RAMAP.handleDragOver = function (evt) {
    evt.stopPropagation();
    evt.preventDefault();
};

RAMAP.onInitFs = function(fs) {
  fs.root.getFile('blah.bin', {create: true, exclusive: false}, function(fileEntry) {
    fileEntry.createWriter(function(fileWriter) {

          fileWriter.onwriteend = function(e) {
            console.log('Write completed.');
            $('#uploadPreview').html("<a href='"+fileEntry.toURL()+"'> Click to Download </a>");
            RAMAP.drawMap();
          };

          fileWriter.onerror = function(e) {
            console.log('Write failed: ' + e.toString());
          };
          
          //give the blob the map array buffer and write it.
          var bb = new window.WebKitBlobBuilder();
          bb.append( RAMAP.getMapBuffer() );
          fileWriter.write(bb.getBlob('application/octet-stream'));

        }, RAMAP.errorHandler);
  }, RAMAP.errorHandler);
};

RAMAP.handleFiles =  function (input) {
    // files is a FileList of File objects. List some properties.
    console.log("Dropped File");
    files = []
    for (var i = 0, f; f = input[i]; i++) {
      files[f.name] = f;  
    }
    if("map.bin" in files){
      console.log("map.bin dropped");
      var fr = new FileReader();
      console.log("what what");
      fr.readAsArrayBuffer( files["map.bin"]);
      console.log("in the");
      fr.onloadend = function (frEvent) {  
        //console.log(frEvent.target.result);
        var map_bin = frEvent.target.result;
        RAMAP.readMapBin(map_bin);

        window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
        window.requestFileSystem( /**window.PERSISTENT*/ window.TEMPORARY, 1, RAMAP.onInitFs, RAMAP.errorHandler);

        //TODO rewrite using web workers
        //var worker = new Worker("/javascript/write_map.js");
      };
    }
};

RAMAP.readMapBin = function(map_bin){
    var map_data =  new DataView( map_bin );
    var dr = RAMAP.dataReader;
    console.log("map.bin length: " + map_data.byteLength);
    var version = dr.read8(map_data); 

    console.log("Version:" + version); 
    if ( version !== 1 ){
      alert("Incorrect Binary Format");
      return;
    }
    var mapSizeX = dr.read16(map_data);
    var mapSizeY = dr.read16(map_data);
    console.log("Map X Size:" + mapSizeX ); 
    console.log("Map Y Size:" + mapSizeY ); 
    RAMAP.sizeX = mapSizeX;
    RAMAP.sizeY = mapSizeY;
   
    //double array to hold map tile info 
    RAMAP.mapTiles = new Array(mapSizeX);
    for (var i = 0; i < mapSizeX; i++){
      RAMAP.mapTiles[i] = new Array(mapSizeY);
    }

    for ( var i = 0; i < mapSizeX; i++){
      for ( var j = 0; j < mapSizeY; j++){
        var templateID = dr.read16(map_data);
        var index = dr.read8(map_data);
        if (index === RAMAP.BYTE_MAX_VALUE){
          index = (i % 4 + (j % 4) * 4);
          console.log("byte max value"+ i + " " + j);
        }
        //console.log( "X: " + i + " Y: " + j + " Tile: " + tile + " Index: " + index); 
        //RAMAP.mapTiles[i][j] = { "tile": templateID, "index": index }
        var tile = RAMAP.newTile();
        tile.init( templateID, index, i, j );
        RAMAP.mapTiles[i][j] = tile;
      }
    }

    //double array to hold resource tile info 
    RAMAP.resourceTiles = new Array(mapSizeX);
    for (var i = 0; i < mapSizeX; i++){
      RAMAP.resourceTiles[i] = new Array(mapSizeY);
    }

    for ( var i = 0; i < mapSizeX; i++){
      for ( var j = 0; j < mapSizeY; j++){
        var resource = dr.read8(map_data);
        var index = dr.read8(map_data);
        //console.log( "X: " + i + " Y: " + j + " Resource: " + resource + " Index: " + index); 
        RAMAP.resourceTiles[i][j] = { "resource": resource, "index": index }
      }
    }
};

RAMAP.getMapBuffer = function(){
    console.log("writeMapBin");
    var area = RAMAP.sizeX * RAMAP.sizeY;
    var tileSize = area * 3; //tile 2 bytes + index 1 byte
    var resourceSize = area * 2; //resoure 1 byte + index 1 byte
    var headerSize = 5; // version 1 byte + sizeX 2 bytes + sizeY 2 bytes
    var fileSize = tileSize + resourceSize + headerSize;
    console.log("fileSize: " + fileSize );
    var file_buff = new ArrayBuffer( fileSize ); 
    var file_data = new DataView(file_buff);
    var dw = RAMAP.dataWriter;

    console.log("file_data length:" + file_data.byteLength );
    //check if out of range
    //if( RAMAP.mapTiles.length != sizeX )
    //for( int i = 0; i < sizeX; i++){
    //}

    //write header
    dw.write8(file_data, 1);
    dw.write16(file_data, RAMAP.sizeX);
    dw.write16(file_data, RAMAP.sizeY);
    console.log( "Writing: " + file_data.byteLength );

    //mapTiles
    console.log("write mapTiles");
    for( i = 0; i < RAMAP.sizeX; i ++){
      for( j = 0; j < RAMAP.sizeY; j ++){
        dw.write16( file_data, RAMAP.mapTiles[i][j].tile );
        //console.log("writing tile: " + RAMAP.mapTiles[i][j].tile + " at " + i + " " + j);
        //TODO pickany code ( % 4) (for cnc?)
        dw.write8( file_data, RAMAP.mapTiles[i][j].index );
      } 
    }
    console.log("write resourceTiles");
    //resourceTiles
    for( i = 0; i < RAMAP.sizeX; i ++){
      for( j = 0; j < RAMAP.sizeY; j ++){
        dw.write8( file_data, RAMAP.resourceTiles[i][j].resource );
        dw.write8( file_data, RAMAP.resourceTiles[i][j].index );
      } 
    }

    return file_buff;
};

RAMAP.dataReader = (function(){
    var byteOffset = 0;
    return {
        read8: function(dataView){
          var value = dataView.getUint8(byteOffset);  
          byteOffset += 1;
          return value;  
        },
        read16: function(dataView){
          var value = dataView.getUint16(byteOffset, true);  
          byteOffset += 2;
          return value;  
        },
        read32: function(dataView){
          var value = dataView.getUint32(byteOffset, true);  
          byteOffset += 4;
          return value;  
        }
    }
}());

RAMAP.dataWriter = (function(){
    var byteOffset = 0;
    return {
        write8: function(dataView, value){
          dataView.setUint8(byteOffset, value );  
          byteOffset += 1;
        },
        write16: function(dataView, value){
          dataView.setUint16(byteOffset, value, true);  
          byteOffset += 2;
        },
        write32: function(dataView, value){
          dataView.setUint32(byteOffset, value, true);  
          byteOffset += 4;
        }
    }
}());

RAMAP.getTile = function( i , j ){
  console.log( "tile: " + RAMAP.mapTiles[i][j].tile + "index: " + RAMAP.mapTiles[i][j].index);
};


function newSourceImage(){ //image used to create tile 
    var SourceImage = {
        imageFilename: 0, //filename for image
        image: 0, //dom image object
        isready: 0, //is image loaded and ready to be drawn
        init: function(file){
            SourceImage.imageFilename = file;
            SourceImage.isready = false;
            SourceImage.image = new Image();  //create new image object
            SourceImage.image.src = file; //load file into image object
        }
    };
    return SourceImage;
}

function loadTemplates(){
  RAMAP.templateMap[65535] = { "id":65535, "width": 4, "height": 4, "path":'/images/ramap/Snow/clear1.png' }; 
  //for each key in template map 
    var template = newTemplate();
    template.init(65535); //init with key
}

RAMAP.newTile = function(){
  var Tile = {
    templateID: 0,
    index: 0,
    x: 0,
    y: 0,
    init: function(templateID, index, x, y){
      Tile.templateID = templateID;
      Tile.index = index;
      Tile.x = x;
      Tile.y = y;
      },
    render: function(ctx, posX, posY, scale){
      var template = RAMAP.templates[Tile.templateID];
      if( template !== undefined){
        var chunk = template.chunks[Tile.index];
        ctx.drawImage(template.source.image, chunk.x, chunk.y, RAMAP.CHUNK_SIZE, RAMAP.CHUNK_SIZE, posX*scale, posY*scale, scale, scale);

        /** Use this in case of loading problems
        var image = new Image(); //template.source.image;
        image.onload = (function(ctx, image, x, y, chunk, scale){  
            return function () {
              ctx.drawImage(image, chunk.x, chunk.y, RAMAP.CHUNK_SIZE, RAMAP.CHUNK_SIZE, x*scale, y*scale, scale, scale);
            }
        })(ctx, image ,Tile.x, Tile.y, chunk, scale);
        image.src = template.source.image.src
        */
      }else{
        //console.log("Unrecongized template ID: " + Tile.templateID );
      }
    }
  }
  return Tile;
}

function newTemplate(){
  var Template = {
    id: 0,
    width: 0,
    height: 0,
    chunks: 0,
    source: 0,
    init: function(id){
      Template.width = RAMAP.templateMap[id].width;
      Template.height = RAMAP.templateMap[id].height;
      Template.chunks = getChunks(Template.width, Template.height);
      Template.source = newSourceImage();
      Template.source.init(RAMAP.templateMap[id].path)
      RAMAP.sources[id] = Template.source;
      RAMAP.templates[id] = Template;
    }
  }
  return Template;
}


function getChunks( tempWidth, tempHeight){
  var numChunks = tempWidth * tempHeight;
  var chunks = [];
  for ( var i = 0; i < numChunks; i++){
    var row = Math.floor( i / tempWidth );
    var column = i % tempWidth;
    chunks.push( { "id": i, "x": column*RAMAP.CHUNK_SIZE, "y": row*RAMAP.CHUNK_SIZE} );
  }
    return chunks; 
}

/**
function getChunkPos( tempWidth, tempHeight, index){
  var numChunks = tempWidth * tempHeight;
  var row = Math.floor( index / tempWidth );
  var column = index % tempWidth;
  return { "x": column*6, "y": row*6}
}
*/

/**
RAMAP.fitToMap = function( mapIndex ){
  if( mapIndex > RAMAP.CANVAS_SIZE ){
    mapIndex = RAMAP.CANVAS_SIZE;
  }
  else if( mapIndex < 0 ){
    mapIndex = 0;
  }
  return mapIndex;
}*/

RAMAP.drawMap = function(shiftX, shiftY, scale) {
 //var canvas = document.getElementById("canvas");
 //var ctx = canvas.getContext("2d");
 
 //clear in case of redraw
 RAMAP.ctx.clearRect ( -1200 , -1200 , 3600, 3600 );
 //RAMAP.ctx.clip();
 //RAMAP.canvas.width = RAMAP.canvas.width;
 
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
  console.log("changing scale: " + scale );
  var scale = Math.round( Number(scale) );
 }else{
  var scale = RAMAP.SCALE; 
 }

 //how many tiles fit on canvas
 var drawWidth = Math.round( RAMAP.CANVAS_WIDTH / scale ); 
 var drawHeight = Math.round( RAMAP.CANVAS_HEIGHT / scale ); 

 //var startI = RAMAP.fitToMap(-shiftX);
 //var startJ = RAMAP.fitToMap(-shiftY);
 //var endI = RAMAP.fitToMap(-shiftX + drawWidth);
 //var endJ = RAMAP.fitToMap(-shiftY + drawHeight);

 console.log( startI + " " + startJ + " " + endI + " " + endJ);

 for( i = 0; i < drawWidth; i++){
  for( j = 0; j < drawHeight; j++){
    var indexI = ( i - shiftX );  
    var indexJ = ( j - shiftY );  
    if ( indexI >= 0 && indexI < RAMAP.CANVAS_SIZE &&  indexJ >= 0 && indexJ < RAMAP.CANVAS_SIZE){
      var tile = RAMAP.mapTiles[indexI][indexJ];
      tile.render(RAMAP.ctx, indexI+shiftX, indexJ+shiftY, scale);
    }
  }
 }
};

// Setup the dnd listeners.
var dropZone = document //.getElementById('drop_zone');
dropZone.addEventListener('dragover', RAMAP.handleDragOver, false);
dropZone.addEventListener('drop', RAMAP.handleFileDrop, false);
loadTemplates();

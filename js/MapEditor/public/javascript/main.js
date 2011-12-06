var RAMAP = {};

RAMAP.BYTE_MAX_VALUE = 255;


RAMAP.sizeX;
RAMAP.sizeY;
RAMAP.byteSize;

RAMAP.mapTiles;
RAMAP.resourceTiles;

RAMAP.fileURI;

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
  fs.root.getFile('map.bin', {create: true, exclusive: false}, function(fileEntry) {
    fileEntry.createWriter(function(fileWriter) {

          fileWriter.onwriteend = function(e) {
            console.log('Write completed.');
            $('#uploadPreview').html("<a href='"+fileEntry.toURL()+"'> Click to Download </a>");
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
        var tile = dr.read16(map_data);
        var index = dr.read8(map_data);
        if (index === RAMAP.BYTE_MAX_VALUE){
          index = (i % 4 + (j % 4) * 4);
          console.log("byte max value"+ i + " " + j);
        }
        //console.log( "X: " + i + " Y: " + j + " Tile: " + tile + " Index: " + index); 
        RAMAP.mapTiles[i][j] = { "tile": tile, "index": index }
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
    console.log( file_data.byteLength );
    //mapTiles
    console.log("mapTiles");
    for( i = 0; i < RAMAP.sizeX; i ++){
      for( j = 0; j < RAMAP.sizeY; j ++){
        dw.write16( file_data, RAMAP.mapTiles[i][j].tile );
        //TODO pickany code ( % 4)
        dw.write8( file_data, RAMAP.mapTiles[i][j].index );
      } 
    }
    console.log("resourceTiles");
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
          var value = dataView.setUint8(byteOffset, value );  
          byteOffset += 1;
          return value;  
        },
        write16: function(dataView){
          var value = dataView.setUint16(byteOffset, value, true);  
          byteOffset += 2;
          return value;  
        },
        write32: function(dataView){
          var value = dataView.setUint32(byteOffset, value, true);  
          byteOffset += 4;
          return value;  
        }
    }
}());

RAMAP.getTile = function( i , j ){
  console.log( "tile: " + RAMAP.mapTiles[i][j].tile + "index: " + RAMAP.mapTiles[i][j].index);
}

/**
  function readHeaderIndex( dataView ){
    console.log( "ID: " + read32(dataView) );
    console.log( "Start: " + read32(dataView) );
    console.log( "Size: " + read32(dataView) );
  }
*/

  // Setup the dnd listeners.
  var dropZone = document //.getElementById('drop_zone');
  dropZone.addEventListener('dragover', RAMAP.handleDragOver, false);
  dropZone.addEventListener('drop', RAMAP.handleFileDrop, false);


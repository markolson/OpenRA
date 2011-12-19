RAMAP.newMapIO = function(){
  var MapIO = {
    dropZone: 0,
    init: function( element ){
      MapIO.dropZone = element; 
      MapIO.dropZone.addEventListener('dragover', MapIO.handleDragOver, false);
      MapIO.dropZone.addEventListener('drop', MapIO.handleFileDrop, false);
    },
    handleDragOver: function(evt){
      evt.stopPropagation();
      evt.preventDefault();
    }
    handleFileDrop: function(evt){
      evt.stopPropagation();
      evt.preventDefault();
      var files = evt.dataTransfer.files; // FileList object.
      MapIO.handleFiles(files);
    },
    onInitFS: function(fs, callback){
      fs.root.getFile('map.bin', {create: true, exclusive: false}, function(fileEntry) {
        fileEntry.createWriter(function(fileWriter) {
          fileWriter.onwriteend = function(e) {
            console.log('Write completed.');
            $('#download').html("<a href='"+fileEntry.toURL()+"'> Download </a>");
            RAMAP.drawMap();
            callback.call(this);
          };
          fileWriter.onerror = function(e) {
            console.log('Write failed: ' + e.toString());
          };
          //give the blob the map array buffer and write it.
          var bb = new window.WebKitBlobBuilder();
          bb.append( RAMAP.getMapBuffer() );
          fileWriter.write(bb.getBlob('application/octet-stream'));
        }, MapIO.errorHandler);
      }, MapIO.errorHandler);
    },
    handleFiles: function(input){
      // files is a FileList of File objects. List some properties.
      console.log("Dropped File");
      console.log(input);
      files = []
      for (var i = 0, f; f = input[i]; i++) {
        console.log(f);
        files[f.name] = f;  
      }
      if("map.bin" in files){
        console.log("map.bin dropped");
        var fr = new FileReader();
        //console.log("what what");
        fr.readAsArrayBuffer( files["map.bin"]);
        //console.log("in the");
        fr.onloadend = function (frEvent) {  
          //console.log(frEvent.target.result);
          var map_bin = frEvent.target.result;
          MapIO.readMapBin(map_bin);
          window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
          window.requestFileSystem( /**window.PERSISTENT*/ window.TEMPORARY, 1, MapIO.onInitFs, MapIO.errorHandler);
          //TODO rewrite using web workers
          //var worker = new Worker("/javascript/write_map.js");
        };
      }
    },
    readMapBin: function(map_bin){
      var bin_data =  new DataView( map_bin );
      var dr = RAMAP.dataReader;
      console.log("map.bin length: " + bin_data.byteLength);
      var version = dr.read8(bin_data); 

      console.log("Version:" + version); 
      if ( version !== 1 ){
        alert("Incorrect Binary Format");
        return;
      }
      var mapSizeX = dr.read16(bin_data);
      var mapSizeY = dr.read16(bin_data);
      RAMAP.mapData = RAMAP.newMapData(mapSizeX, mapSizeY);
      //read tiles
      for ( var i = 0; i < mapSizeX; i++){
        for ( var j = 0; j < mapSizeY; j++){
          var templateID = dr.read16(bin_data);
          var index = dr.read8(bin_data);
          if (index === RAMAP.BYTE_MAX_VALUE){
            index = (i % 4 + (j % 4) * 4);
          }
          RAMAP.mapData.addTile(i,j, templateID, index);
        }
      }
      //read resources
      for ( var i = 0; i < mapSizeX; i++){
        for ( var j = 0; j < mapSizeY; j++){
          var resource = dr.read8(bin_data);
          var index = dr.read8(bin_data);
          //console.log( "X: " + i + " Y: " + j + " Resource: " + resource + " Index: " + index); 
          RAMAP.mapData.addResource(i,j, resource, index);
        }
      }
    },
    getMapBuffer: function(){
      console.log("writeMapBin");
      var mapSizeX = RAMAP.mapData.sizeX;
      var mapSizeY = RAMAP.mapData.sizeY;
      var area = mapSizeX * mapSizeY;
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
      dw.write16(file_data, mapSizeX);
      dw.write16(file_data, mapSizeY);
      console.log( "Writing: " + file_data.byteLength );

      //mapTiles
      console.log("write mapTiles");
      for( i = 0; i < mapSizeX; i ++){
        for( j = 0; j < mapSizeY; j ++){
          var tile = RAMAP.mapData.getTile(i,j);
          dw.write16( file_data, tile.tile );
          //TODO pickany code ( % 4) (for cnc?)
          dw.write8( file_data, tile.index );
        } 
      }
      console.log("write resourceTiles");
      //resourceTiles
      for( i = 0; i < mapSizeX; i ++){
        for( j = 0; j < mapSizeY; j ++){
          var resource = RAMAP.mapData.getResource(i,j);
          dw.write8( file_data, resource.resource );
          dw.write8( file_data, resource.index );
        } 
      }

      return file_buff;
    },
    errorHandler: function(e){
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
    },

  }
  return MapIO;
}

RAMAP.newMapData = function(){
  var MapData = {
    sizeX: 0,
    sizeY: 0,
    tiles: 0,
    resources: 0,
    actors: 0,
    init: function(mapSizeX, mapSizeY){
      //double array to hold map tile info 
      MapData.tiles = new Array(mapSizeX);
      for (var i = 0; i < mapSizeX; i++){
        MapData.tiles[i] = new Array(mapSizeY);
      }
      //double array to hold resource tile info 
      MapData.resources = new Array(mapSizeX);
      for (var i = 0; i < mapSizeX; i++){
        MapData.resources[i] = new Array(mapSizeY);
      }
    },
    addTile: function(i,j, templateID, index){
      var tile = RAMAP.newTile();
      tile.init( templateID, index, i, j );
      MapData.tiles[i][j] = tile;
    },
    getTile: function(i,j){
      return MapData.tiles[i][j];
    },
    addResource: function(i,j, resource, index){
      MapData.resources[i][j] = { "resource": resource, "index": index }
    },
    getResource: function(i,j){
      return MapData.resources[i][j];
    },
    removeResource: function(i,j){
      MapData.resources[i][j] = null;
    },
    addTemplate: function(i,j){
      //TODO
    }
  };
  return MapData;
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


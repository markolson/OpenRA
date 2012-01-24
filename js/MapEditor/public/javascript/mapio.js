/** RAMAP.newMapInfo requires rayaml-parser.js  */
/** RAMAP.getMapYaml requires yaml_dumper.js  */

RAMAP.newMapIO = function(){
  var MapIO = {
    dropZone: 0,
    mapDataStorage: [],
    mapInfoStorage: [],
    mapData: 0,
    mapInfo: 0,
    infoFile: 0,
    onWriteEndCallback: 0,
    onWriteYamlEndCallback: 0,
    onReadEndCallback: 0,
    init: function( element, onReadEndCallback, onWriteEndCallback, onWriteYamlEndCallback ){
      MapIO.dropZone = element; 
      console.log(MapIO.dropZone);
/**
<div id="output" style="min-height: 100px; white-space: pre; border: 1px solid black;"  
     ondragenter="document.getElementById('output').textContent = ''; event.stopPropagation(); event.preventDefault();"  
     ondragover="event.stopPropagation(); event.preventDefault();"  
     ondrop="event.stopPropagation(); event.preventDefault(); dodrop(event);">
     */
      MapIO.dropZone.addEventListener('dragenter', MapIO.handleDragOver, false);           
      MapIO.dropZone.addEventListener('dragover', MapIO.handleDragOver, false);
      MapIO.dropZone.addEventListener('drop', MapIO.handleFileDrop, false);
      MapIO.onWriteEndCallback = onWriteEndCallback;
      MapIO.onWriteYamlEndCallback = onWriteYamlEndCallback;
      MapIO.onReadEndCallback = onReadEndCallback;
    },
    getMapData: function(){
      return MapIO.mapData;
    },
    getMapDataStorage: function(){
      return MapIO.mapDataStorage;
    },
    setMapData: function(mapData){
      MapIO.mapData = mapData;
    },
    handleDragOver: function(evt){
      evt.stopPropagation();
      evt.preventDefault();
    },
    handleFileDrop: function(evt){
      evt.stopPropagation();
      evt.preventDefault();
      var files = evt.dataTransfer.files; // FileList object.
      MapIO.handleFiles(files);
    },
    onInitFS: function(fs){
      if( MapIO.mapData === 0 ){
       return;
      }
      fs.root.getFile('map.bin', {create: true, exclusive: false}, function(fileEntry) {
        fileEntry.createWriter(function(fileWriter) {
          fileWriter.onwriteend = function(e) {
            console.log('Write Bin completed.');
            MapIO.onWriteEndCallback(fileEntry);
          };
          fileWriter.onerror = function(e) {
            console.log('Write failed: ' + e.toString());
          };
          //give the blob the map array buffer and write it.
          var bb = new window.WebKitBlobBuilder();
          bb.append( MapIO.getMapBuffer() );
          fileWriter.write(bb.getBlob('application/octet-stream'));
        }, MapIO.errorHandler);
      }, MapIO.errorHandler);

      fs.root.getFile('map.yaml', {create: true, exclusive: false}, function(fileEntry) {
        fileEntry.createWriter(function(fileWriter) {
          fileWriter.onwriteend = function(e) {
            console.log('Write Yaml completed.');
            MapIO.onWriteYamlEndCallback(fileEntry);
          };
          fileWriter.onerror = function(e) {
            console.log('Write failed: ' + e.toString());
          };
          //give the blob the map array buffer and write it.
          var bb = new window.WebKitBlobBuilder();
          bb.append( MapIO.getMapYaml() );
          fileWriter.write(bb.getBlob('text/plain'));
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
      if("map.yaml" in files){
        console.log("map.yaml dropped");
        MapIO.infoFile = files["map.yaml"]; 
      }
      if("map.bin" in files){
        console.log("map.bin dropped");
        var fr = new FileReader();
        fr.readAsArrayBuffer( files["map.bin"]);
        fr.onloadend = function (frEvent) {  
          //console.log(frEvent.target.result);
          var map_bin = frEvent.target.result;
          MapIO.readMapBin(map_bin);
          //TODO rewrite using web workers
          //var worker = new Worker("/javascript/write_map.js");
        };
      }
    },
    newMap: function( width, height, tileset){
      console.log(width);
      console.log(height);
      MapIO.mapData = RAMAP.newMapData();
      MapIO.mapData.init(width, height);

      for( var i = 0; i < width; i++ ){
        for( var j = 0; j < width; j++ ){
          if( i % 4 === 0 && j % 4 === 0){
            MapIO.mapData.addTemplate(i,j, tileset.templates[RAMAP.TERRAIN_ID]);
          }
          MapIO.mapData.addResource(i,j, 0, 0);
        }
      }
      
      MapIO.mapInfo = RAMAP.newMapInfo();
    },
    saveMap: function(){
      
      console.log("savemap");
      window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
      window.requestFileSystem( /**window.PERSISTENT*/ window.TEMPORARY, 1, MapIO.onInitFS , MapIO.errorHandler);
    },
    readMapYaml: function( text ){
      MapIO.mapInfo = RAMAP.newMapInfo();
      MapIO.mapInfo.parse(text);
      
      //read in actors
      if ( MapIO.mapData !== undefined ){
        var actors = MapIO.mapInfo.actors;
        for( key in actors){
          if( key === "id") { continue; }
          //console.log(key);
          var actor = actors[key];
          MapIO.mapData.addActor(  actor.loc[0], actor.loc[1], actor.id, actor.owner ); 
          //console.log(actor);
        }
      }

      //update the tileset 
      if ( MapIO.mapInfo.tileset !== undefined ){
        RAMAP.tileset = RAMAP.tilesets[MapIO.mapInfo.tileset.toLowerCase()];
      }

      console.log("finished reading yaml");
      MapIO.mapInfoStorage.push( MapIO.mapInfo );
      MapIO.onReadEndCallback();
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
      MapIO.mapData = RAMAP.newMapData();
      MapIO.mapData.init(mapSizeX, mapSizeY);
      //read tiles
      for ( var i = 0; i < mapSizeX; i++){
        for ( var j = 0; j < mapSizeY; j++){
          var templateID = dr.read16(bin_data);
          var index = dr.read8(bin_data);
          if (index === RAMAP.BYTE_MAX_VALUE){
            index = (i % 4 + (j % 4) * 4);
          }
          MapIO.mapData.addTile(i,j, templateID, index);
        }
      }
      //read resources
      for ( var i = 0; i < mapSizeX; i++){
        for ( var j = 0; j < mapSizeY; j++){
          var resource = dr.read8(bin_data);
          var index = dr.read8(bin_data);
          //console.log( "X: " + i + " Y: " + j + " Resource: " + resource + " Index: " + index); 
          MapIO.mapData.addResource(i,j, resource, index);
        }
      }

      if ( MapIO.infoFile !== undefined && MapIO.infoFile !== 0 ){
        var fr = new FileReader();
        fr.readAsText( MapIO.infoFile );
        fr.onloadend = function (frEvent) {  
          var yaml_text = frEvent.target.result;
          MapIO.readMapYaml(yaml_text);
        };
        MapIO.infoFile = 0;
      }

      console.log("finished reading");
      MapIO.mapDataStorage.push( MapIO.mapData );
      MapIO.onReadEndCallback();
      
    },
    getMapYaml: function(){
      yamlWriter = new YAML();
      //update MapInfo
      MapIO.mapInfo.addActors(MapIO.mapData.actors);

      yamlText = yamlWriter.dump([MapIO.mapInfo.getInfoObj()]);
      console.log(yamlText);
      return yamlText;
    },
    getMapBuffer: function(){
      
      console.log("writeMapBin");
      var mapSizeX = MapIO.mapData.sizeX;
      var mapSizeY = MapIO.mapData.sizeY;
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
          var tile = MapIO.mapData.getTile(i,j);
          dw.write16( file_data, tile.templateID);
          //TODO pickany code ( % 4) (for cnc?)
          dw.write8( file_data, tile.index );
        } 
      }
      console.log("write resourceTiles");
      //resourceTiles
      for( i = 0; i < mapSizeX; i ++){
        for( j = 0; j < mapSizeY; j ++){
          var resource = MapIO.mapData.getResource(i,j);
          if( resource !== undefined){
            dw.write8( file_data, resource.resource );
            dw.write8( file_data, resource.index );
          }
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

RAMAP.newMapInfo = function(){
  var MapInfo = {
    selectable: false,
    mapformat: 5,
    title: "No Title",
    description: "No Description",
    author: "Edgar Allan Poe",
    tileset: "SNOW",
    mapsize: [128,128],
    bounds: [16, 16, 96, 96],
    useasshellmap: false,
    type: "Conquest",
    players: {
      "PlayerReference@Neutral": {
        "Name": "Neutral",
        "OwnsWorld": true,
        "NonCombatant": true,
        "Race": "allies"
      },
      "PlayerReference@Creeps": {
        "Name": "Creeps",
        "OwnsWorld": true,
        "NonCombatant": true,
        "Race": "allies"
      }
    },
    actors: null,
    smudges: null,
    rules: null,
    sequences: null,
    weapons: null,
    voices: null,
    init: function( mapObj ){
      for ( key in mapObj ){
        console.log( key );
        if( mapObj[key] !== undefined ){
          console.log( "copied " + key );
          MapInfo[key.toLowerCase()] = mapObj[key];
        }
      }
    },
    parse: function( text ){
      var mapObj = RAParser.parse( text, 'map.yaml');
      MapInfo.init(mapObj);
    },
    addActors: function( actorData ){
      if ( MapInfo.actors === undefined || MapInfo.actors === null){
        MapInfo.actors = {};
      }
      var numActors = Object.keys(MapInfo.actors).length;
      for ( var i = 0; i < actorData.length; i++ ){
        for ( var j = 0; j < actorData[i].length; j++ ){
          var actorTile = actorData[i][j];
          if( actorTile !== undefined && actorTile !== null ){
            MapInfo.actors["Actor"+numActors] = { "id": actorTile.name, "Location": [actorTile.x,actorTile.y], "Owner": actorTile.owner };
            numActors++;
          }
        }
      }
    },
    getInfoObj: function(){
      return {
        "Selectable": MapInfo.selectable,
        "MapFormat" : MapInfo.mapformat,
        "Title": MapInfo.title,
        "Description": MapInfo.description,
        "Author": MapInfo.author,
        "Tileset": MapInfo.tileset.toUpperCase(),
        "MapSize": MapInfo.mapsize,
        "Bounds": MapInfo.bounds,
        "UseAsShellmap": MapInfo.useasshellmap,
        "Type": MapInfo.type,
        "Players": MapInfo.players,
        "Actors": MapInfo.actors,
        "Smudges": MapInfo.smudges,
        "Rules": MapInfo.rules,
        "Sequences": MapInfo.sequences,
        "Weapons": MapInfo.weapons,
        "Voices": MapInfo.voices 
      };
    }
  };
  return MapInfo;
}

RAMAP.newMapData = function(){
  var MapData = {
    sizeX: 0,
    sizeY: 0,
    tiles: 0,
    resources: 0,
    actors: 0,
    init: function(mapSizeX, mapSizeY){
      MapData.sizeX = mapSizeX;
      MapData.sizeY = mapSizeY;
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
      //double array to hold actor tile info 
      MapData.actors = new Array(mapSizeX);
      for (var i = 0; i < mapSizeX; i++){
        MapData.actors[i] = new Array(mapSizeY);
      }
    },
    addTile: function(i,j, templateID, index){
      if( !MapData.coordsInMap(i,j) ){
        return;
      }
      var tile = RAMAP.newTile();
      tile.init( templateID, index, i, j );
      //console.log( "added tile at " + i + ":" + j + " - " + index ); 
      MapData.tiles[i][j] = tile;
    },
    getTile: function(i,j){
      return MapData.tiles[i][j];
    },
    addResource: function(i,j, resource, index){
      var rsrcTile = RAMAP.newRsrcTile();
      rsrcTile.init( resource, index, i , j );
      MapData.resources[i][j] = rsrcTile;
    },
    getResource: function(i,j){
      return MapData.resources[i][j];
    },
    removeResource: function(i,j){
      MapData.addResource(i , j, 0, 0);
    },
    addActor: function(i , j, name, owner){
      var actorTile = RAMAP.newActorTile();
      actorTile.init( name, i, j, owner );
      //console.log(actorTile);
      //console.log("added");
      MapData.actors[i][j] = actorTile;
    },
    getActor: function(i, j){
      if( i > 128 ){
        console.log( "x out of bounds");
      }
      if( j > 128 ){
        console.log( "y out of bounds");
      }
      //console.log("wtf mates");
      if ( MapData.actors[i][j] !== undefined ){
        //console.log(MapData.actors[i][j]);
      }else{
        //console.log("damnit");
      }
      return MapData.actors[i][j];
    },
    removeActor: function(i,j){
      MapData.actors[i][j] = null;
    },
    addTemplate: function(x,y, template){
      //console.log("add template at index: " + x + ": " +y);  
      var index = 0;
      for ( var j = 0; j < template.height; j++){
        for ( var i = 0; i < template.width; i++){
          if( template.chunks[index].visible){
            MapData.addTile( x+i, y+j, template.id, index);
          }
          index++;
        }
      }
    },
    coordsInMap: function(i,j){
      if( i >= 0 && j >=0 && i < MapData.sizeX && j < MapData.sizeY){
        return true;
      }else{
        return false;
      }
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


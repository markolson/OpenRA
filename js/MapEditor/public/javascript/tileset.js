RAMAP.newTileset = function(){
  var Tileset = {
    name: 0,
    templateMapSrcPath: 0,
    resourceMapSrcPath: 0,
    templateImgPath: 0,
    resourceImgPath: 0,
    actorImgPath: 0,
    templateMap: {},
    resourceMap: {},
    templates: {},
    rsrcTemplates: {},
    sources: {},
    init: function(name, templateMapSrcPath, templateImgPath, resourceMapSrcPath){
     Tileset.name = name;
     Tileset.templateMapSrcPath = templateMapSrcPath;// 'ajax/snow.json'
     Tileset.resourceMapSrcPath = resourceMapSrcPath;// 'ajax/resources.json'
     Tileset.templateImgPath = templateImgPath;// "/images/ramap/Snow/"
     Tileset.resourceImgPath = templateImgPath + "/Resources/";// "/images/ramap/Snow/Resources"
     Tileset.actorImgPath = templateImgPath + "/Actors/";// "/images/ramap/Snow/Actors"
    },
    loadTemplates: function(callback){
      console.log("loading templates");
      $.getJSON( Tileset.templateMapSrcPath, function(data) {
        //console.log("retrieving json");
        //console.log(Object.keys(data).length);
        var imageCount = Object.keys(data).length;
        var loadedCount = 0; 
        $.each(data, function(key, val) {
          Tileset.templateMap[key] = val
          //console.log( key + " " + val["path"] );
          //items.push( val["path"] + ".png" );
          var tm = Tileset.templateMap[key];
          var template = RAMAP.newTemplate();
          template.init(key, tm.path, tm.width, tm.height, Tileset.templateImgPath, tm.visibleChunks );
          template.source.image.onload = function(){
            //console.log("loaded");
            //console.log(template.source.image);
            loadedCount++
            if ( loadedCount == imageCount ){
              //imagesLoaded();
              //add templates to template picker
              for ( key in Tileset.templates ){
                  //console.log(RAMAP.templates[key]);
                  var temp = Tileset.templates[key];
                  $("#height_"+temp.height).append('<input type="image" class="'+ Tileset.name + '"src="' + temp.source.image.src + '" id="'+key+'" onclick="RAMAP.toolPalette.setTool('+key+')" >');
              }
              callback.call(this);
            }
          }
          //Tileset.sources[key] = template.source;
          Tileset.templates[key] = template;
        });
      });
    },
    loadResources: function(callback){
      $.getJSON( Tileset.resourceMapSrcPath, function(data) {
        var imageCount = Object.keys(data).length;
        var loadedCount = 0; 
        $.each(data, function(key, val) {
          Tileset.resourceMap[key] = val
          //console.log( key + " " + val["path"] );
          //items.push( val["path"] + ".png" );
          var rm = Tileset.resourceMap[key];
          var template = RAMAP.newRsrcTemplate();
          //create a resource for each index of a resource?
          template.init(rm.resource, rm.path, rm.width, rm.height, Tileset.resourceImgPath);
          resource.source.image.onload = function(){
            //console.log("loaded");
            //console.log(template.source.image);
            loadedCount++
            if ( loadedCount == imageCount ){
              //imagesLoaded();
              //add templates to template picker
              for ( key in Tileset.rsrcTemplates){
                  //console.log(RAMAP.templates[key]);
                  var temp = Tileset.rsrcTemplates[key];
                  $("#height_"+temp.height).append('<input type="image" class="'+ Tileset.name + ' resource" src="' + temp.source.image.src + '" id="'+key+'" onclick="RAMAP.toolPalette.setTool('+key+')" >');
              }
              callback.call(this);
            }
          }
          //Tileset.sources[key] = template.source;
          Tileset.rsrcTemplates[key] = resource;       
        });
      }
    },
    loadActors: function(callback){
    }
  }
  return Tileset;
};

RAMAP.newRsrcTemplate = function(){
  var RsrcTemplate = {
    template: 0,
    init: function( id, name, width, height, imgPath){
      var visibleChunks = [];
      //all resource chunks are visible
      for( var i = 0; i < width; i++){ visibleChunks.push(1); };
      template = RAMAP.newTemplate();
      template.init( id, name, width, height, imgPath, visibleChunks);
    }
  };
  return RsrcTemplate;
}
/**
RAMAP.newResource = function(){
  var Resource = {
    resource: 0,
    index: 0,
    path: 0,
    width: 0,
    height: 0,
    imgPath: 0,
    source: 0,
    init: function( resource, index, path, width, height, imgPath){
      Resource.resource = resource;
      Resource.index = index;
      Resource.path = path;
      Resource.width = width;
      Resource.height = height;
      Resource.imgPath = imgPath;
      Resource.source = RAMAP.newSourceImage();
      Resource.source.init( imgPath + path + ".png")
    },
    render: function( index )
  };
  return Resource;
}
*/
RAMAP.newTemplate = function(){
  var Template = {
    id: 0,
    name: 0,
    width: 0,
    height: 0,
    chunks: 0,
    source: 0,
    init: function(id, name, width, height, imgPath, visibleChunks){
      Template.id = Number(id);
      Template.name = name;
      Template.width = Number(width);
      Template.height = Number(height);
      //console.log( id + " " + Template.width + " " + Template.height );
      Template.chunks = Template.getChunks(Template.width, Template.height, visibleChunks);
      Template.source = RAMAP.newSourceImage();
      Template.source.init( imgPath + Template.name + ".png")
    },
    getChunks: function(tempWidth, tempHeight, visibleChunks){
      var numChunks = tempWidth * tempHeight;
      var chunks = [];
      for ( var i = 0; i < numChunks; i++){
        var row = Math.floor( i / tempWidth );
        var column = i % tempWidth;
        chunks.push( { "id": i, "x": column*RAMAP.CHUNK_SIZE, "y": row*RAMAP.CHUNK_SIZE, "visible": Boolean(visibleChunks[i])} );
      }
        return chunks; 
    }
  }
  return Template;
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
    render: function(ctx, templateSrc, posX, posY, scale){
      var template = templateSrc[Tile.templateID];
      if( template !== undefined){
        var chunk = template.chunks[Tile.index];
        if (chunk !== undefined && chunk.visible){
          //console.log( template.chunks );
          //console.log( Tile.templateID + " " + template.source.image.src + " " + Tile.index + " chunk:" + chunk.x + " " + chunk.y + "scale " + RAMAP.CHUNK_SIZE );
          ctx.drawImage(template.source.image, chunk.x, chunk.y, RAMAP.CHUNK_SIZE, RAMAP.CHUNK_SIZE, posX*scale, posY*scale, scale, scale);
        }else{
          console.log( "Truffle shuffle: " + Tile.templateID + "index: " + Tile.index);
        }

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

RAMAP.newSourceImage = function(){ //image used to create tile 
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

RAMAP.newTilesetLoader = function(){
  var TilesetLoader = {
    loaded: 0,
    callback: 0,
    init: function(callback){
      TilesetLoader.callback = callback;

      var snow = RAMAP.newTileset();
      RAMAP.tilesets["snow"] = snow;
      var temperate = RAMAP.newTileset();
      RAMAP.tilesets["temperate"] = temperate;

      snow.init("snow", 'ajax/snow.json', "/images/ramap/Snow/");
      snow.loadTemplates(TilesetLoader.loadedTemplate);
      temperate.init("temperate", 'ajax/temperate.json', "/images/ramap/Temperate/");
      temperate.loadTemplates(TilesetLoader.loadedTemplate);
    },
    loadedTemplate: function(obj){
      TilesetLoader.loaded++;
      console.log( TilesetLoader.loaded );
      if ( TilesetLoader.loaded >= Object.keys(RAMAP.tilesets).length ){
        console.log("holla");
        TilesetLoader.callback();
      }
    }
  };
  return TilesetLoader;
}

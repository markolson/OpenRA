RAMAP.newTileset = function(){
  var Tileset = {
    templateMapSrcPath: 0,
    imgPath: 0,
    templateMap: {},
    templates: {},
    sources: {},
    init: function(templateMapSrcPath, imgPath){
     Tileset.templateMapSrcPath = templateMapSrcPath;// 'ajax/snow.json'
     Tileset.imgPath = imgPath;// "/images/ramap/Snow/"
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
          template.init(key, tm.path, tm.width, tm.height, Tileset.imgPath, tm.visibleChunks );
          template.source.image.onload = function(){
            //console.log("loaded");
            //console.log(template.source.image);
            loadedCount++
            if ( loadedCount == imageCount ){
              //imagesLoaded();
              callback.call(this);
            }
          }
          Tileset.sources[key] = template.source;
          Tileset.templates[key] = template;
        });
      });
    }
  }
  return Tileset;
}

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
    render: function(ctx, tileset, posX, posY, scale){
      var template = tileset.templates[Tile.templateID];
      if( template !== undefined){
        //special casing this because I don't want to figure this out right now.
        if ( Tile.templateID === RAMAP.TERRAIN_ID ){
          var chunk = template.chunks[0];
        }else{
          var chunk = template.chunks[Tile.index];
        }
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

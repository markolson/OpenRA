$(document).ready( function (){

});

RAMAP.newMapView = function(){
  var MapView = {
    stage: 0,
    canvas: 0,
    ctx: 0,
    height: 0,
    width: 0,
    draggingRect: false,
    dragImg: 0,
    currTempID: 0,
    clickCallback: 0,
    init: function(id, width, height, clickCallback){
      MapView.stage = new Kinetic.Stage(id, width, height);
      MapView.canvas = MapView.stage.getCanvas();
      MapView.ctx = MapView.stage.getContext();
      MapView.height = height;
      MapView.width = width;
      MapView.clickCallback = clickCallback;
      },
    
    setDragImg: function(id, imgObj, posX, posY){
        console.log(imgObj);
        MapView.currTempID = id;
        MapView.stage.removeAll();
        MapView.stage.removeEventListenerType("mousedown", MapView.clicked);
        MapView.stage.removeEventListenerType("mousemove", MapView.mousemoved);
        var drawImg = Kinetic.drawImage(imgObj, posX, posY);
        MapView.dragImg = new Kinetic.Shape(drawImg); 
        MapView.dragImg.setScale(RAMAP.scale/RAMAP.CHUNK_SIZE);
        MapView.draggingRect = true;
        MapView.stage.add(MapView.dragImg);
        MapView.stage.addEventListener("mousedown", MapView.clicked);
        MapView.stage.addEventListener("mousemove", MapView.mousemoved, false);
    },
    clicked: function(){
      console.log(MapView.currTempID);
      MapView.clickCallback();
      //MapView.draggingRect = false;
    },
    mousemoved: function(){
      var mousePos = MapView.stage.getMousePos();
      //console.log("mouseMove");
      MapView.dragImg.setScale(RAMAP.scale/RAMAP.CHUNK_SIZE);
      MapView.dragImg.x = Math.floor((mousePos.x - 500) / RAMAP.scale) * RAMAP.scale;
      MapView.dragImg.y = Math.floor((mousePos.y ) / RAMAP.scale) * RAMAP.scale;
      MapView.stage.draw();
    }
  }
  return MapView;
}

RAMAP.newPickerView = function(){
  var PickerView = {
    canvas: 0,
    width: 0,
    height: 0,
    posX: 0,
    posY: 0,
    init: function(id){
      PickerView.canvas = document.getElementById(id);
      console.log(PickerView.canvas);
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
}


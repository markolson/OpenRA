$(document).ready( function (){

});

RAMAP.newTemplatePicker = function(){
  var TemplatePicker = {
    stage: 0,
    canvas: 0,
    ctx: 0,
    height: 0,
    width: 0,
    posY: 0,
    posX: 0,
    draggingRect: false,
    dragImg: 0,
    currTempID: 0,
    init: function(id, width, height){
      TemplatePicker.stage = new Kinetic.Stage(id, width, height);
      TemplatePicker.canvas = TemplatePicker.stage.getCanvas();
      //console.log(TemplatePicker.stage.getCanvas());
      TemplatePicker.ctx = TemplatePicker.stage.getContext();
      TemplatePicker.height = height;
      TemplatePicker.width = width;
      },
    scrollUp: function(){
      if( TemplatePicker.posY - TemplatePicker.scrollHeight >= 0 ){
        TemplatePicker.posY = TemplatePicker.posY - TemplatePicker.scrollHeight; 
        var translation = 'translate( 0px, -' + TemplatePicker.posY + 'px)'; 
        
        updated_css = {
          '-webkit-transition': 'all .5s ease-in',
          '-webkit-transform' : translation
        }
        $(TemplatePicker.canvas).css(updated_css);
      }
    },
    scrollDown: function(){
      if( TemplatePicker.posY + TemplatePicker.scrollHeight < TemplatePicker.canvas.height ){
        TemplatePicker.posY = TemplatePicker.posY + TemplatePicker.scrollHeight; 
        var translation = 'translate( 0px, -' + TemplatePicker.posY + 'px)'; 
        
        updated_css = {
          '-webkit-transition': 'all .5s ease-in',
          '-webkit-transform' : translation
        }
        $(TemplatePicker.canvas).css(updated_css);
      }
    },
    setDragImg: function(id, imgObj, posX, posY){
        console.log(imgObj);
        TemplatePicker.currTempID = id;
        TemplatePicker.stage.removeAll();
        TemplatePicker.stage.removeEventListenerType("mousedown", TemplatePicker.clicked);
        TemplatePicker.stage.removeEventListenerType("mousemove", TemplatePicker.mousemoved);
        var drawImg = Kinetic.drawImage(imgObj, posX, posY);
        TemplatePicker.dragImg = new Kinetic.Shape(drawImg); 
        TemplatePicker.dragImg.setScale(RAMAP.scale/RAMAP.CHUNK_SIZE);
        TemplatePicker.draggingRect = true;
        TemplatePicker.stage.add(TemplatePicker.dragImg);
        TemplatePicker.stage.addEventListener("mousedown", TemplatePicker.clicked);
        TemplatePicker.stage.addEventListener("mousemove", TemplatePicker.mousemoved, false);
    },
    clicked: function(){
      console.log(TemplatePicker.currTempID);
      //TemplatePicker.draggingRect = false;
    },
    mousemoved: function(){
      var mousePos = TemplatePicker.stage.getMousePos();
      //console.log("mouseMove");
      TemplatePicker.dragImg.setScale(RAMAP.scale/RAMAP.CHUNK_SIZE);
      TemplatePicker.dragImg.x = Math.floor((mousePos.x - 500) / RAMAP.scale) * RAMAP.scale;
      TemplatePicker.dragImg.y = Math.floor((mousePos.y ) / RAMAP.scale) * RAMAP.scale;
      TemplatePicker.stage.draw();
    }
  }
  return TemplatePicker;
}






RAMAP.scrollPickerDown = function (value){
  var translation = 'translate( 0px, -' + value + 'px)'; 

  updated_css = {
    '-webkit-transition': 'all .5s ease-in',
    '-webkit-transform' : translation
  }
  $("#template_picker").css(updated_css);
}

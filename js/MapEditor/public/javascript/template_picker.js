$(document).ready( function (){

});

RAMAP.newTemplatePicker = function(){
  var TemplatePicker = {
    canvas: 0,
    ctx: 0,
    height: 0,
    width: 0,
    posY: 0,
    posX: 0,
    scrollHeight: 900,
    init: function(id){
      TemplatePicker.canvas = document.getElementById(id);
      TemplatePicker.ctx = TemplatePicker.canvas.getContext("2d");
      TemplatePicker.height = TemplatePicker.canvas.height;
      TemplatePicker.width = TemplatePicker.canvas.width;
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

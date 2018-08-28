var canvas, selectionElement;
var width, height;
var infColor = [0,0,0];
var zoomLimit = 3;
var defaultcx = -0.6, defaultcy = 0.0, defaultscale = 0.005;
var maxIter = 25, cx = defaultcx, cy = defaultcy, scale = defaultscale;
var moving = false;
var mousex, mousey, mousew, mouseh;

function set(data, i, r, g, b) {
  data[i] = r;
  data[i+1] = g;
  data[i+2] = b;
  data[i+3] = 255;
}
function resetData(data, v) {
  for (var i=0; i<data.length; ++i) data[i] = v;
}
function gradient(maxIter, sets)
{
  var clrs = [];
  var gradLen = maxIter / (sets.length - 1);
  for (var i = 1; i < sets.length; ++i) {
    var col1 = sets[i-1], col2 = sets[i];
    for (var c = 0; c < gradLen; ++c) {
      var d = 1.0*c / gradLen;
      clrs.push([
        col2[0]*d + col1[0]*(1-d),
        col2[1]*d + col1[1]*(1-d),
        col2[2]*d + col1[2]*(1-d)
      ]);
    }
  }
  return clrs;
}
function setSelection(x, y) {
  mousex = x;
  mousey = y;
  mousew = 0;
  mouseh = 0;
  selectionElement.style.left = x;
  selectionElement.style.top = y;
  selectionElement.style.width = 0;
  selectionElement.style.height = 0;
}
function updateSelection(w, h) {
  var x = mousex;
  var y = mousey;
  mousew = w;
  mouseh = h;
  if (w < 0) {
    x += w;
    w = -w;
  }
  if (h < 0) {
    y += h;
    h = -h;
  }
  selectionElement.style.left = x;
  selectionElement.style.top = y;
  selectionElement.style.width = w;
  selectionElement.style.height = h;
}
function myDown(e) {
  if (moving) return;

  moving = true;

  selectionElement.style.display = 'block';
  setSelection(e.offsetX, e.offsetY);
}
function myUp() {
  if (!moving) return;

  moving = false;  
  selectionElement.style.display = 'none';

  if (Math.abs(mousew) < zoomLimit || Math.abs(mouseh) < zoomLimit) return;

  zoom();
  startRender();
}
function myMove(e) {
  if (!moving) return;
  updateSelection(e.offsetX - mousex, e.offsetY - mousey);  
}
function myDblClick() {
  reset();
}
function getIdealMaxIter() {
  var sc = width / (scale*width);
  return 50 * Math.pow(Math.log10(sc), 1.25);
}
function reset() {
  cx = defaultcx;
  cy = defaultcy;
  scale = defaultscale;
  startRender();
}
function zoom() {
  var x = mousex;
  var y = mousey;
  var w = mousew;
  var h = mouseh;
  if (w < 0) {
    x += w; w = -w;
  }
  if (h < 0) {
    y += h; h = -h;
  }
  cx += (1.0*(x + w/2) / width - 0.5) * (scale * width);
  cy += (1.0*(y + h/2) / height - 0.5) * (scale * height);

  var sw = 1.0*w/width, sh = 1.0*h/height;
  scale = sw > sh ? scale * sw : scale * sh;
}
function startRender() {
  maxIter = getIdealMaxIter() | 0;
  console.log('(x0,x1) (y0,y1)', '('+(cx-(width*scale/2))+','+(cx+(width*scale/2))+') ('+(cy-(height*scale/2))+','+(cy+(height*scale/2))+')');
  console.log('Iterations', maxIter);
  var colors = gradient(maxIter, [ [50,50,230], [230,50,50], [230,230,230]])
  var ctx = canvas.getContext('2d');
  var imageData = ctx.createImageData(width, height);
  var data = imageData.data;
  classicRender(ctx, data, colors)
  ctx.putImageData(imageData, 0, 0);
}
function classicRender(ctx, data, colors) {
  for (var h = 0; h < height; ++h) {
    var y0 = cy + (h - (height/2))*scale;
    for (var w = 0; w < width; ++w) {
      var d = 4*(h*width + w);
      
      var x0 = cx + (w - (width/2))*scale;      
      var xt, x = x0, y = y0, i = 0;
      while(x*x + y*y < 4.0 && i < maxIter) {
        xt = x;
        x = x*x - y*y + x0;
        y = 2*xt*y + y0;
        ++i;
      }

      var color = i == maxIter ? infColor : colors[i];
      
      set(data, d, color[0], color[1], color[2]);
    }
  }
}
function mb(x0, y0) {
  var xt, x = x0, y = y0, i = 0;
  while(x*x + y*y < 4.0 && i < maxIter) {
    xt = x;
    x = x*x - y*y + x0;
    y = 2*xt*y + y0;
    ++i;
  }
  return i;
}
function smartRender(ctx, data, colors) {
  var nextDir = function(d) {
    switch (d)
    {
      case 'r': return 'u';
      case 'u': return 'l';
      case 'l': return 'd';
      case 'd': return 'r';
    }
  }
  var isYBorder = function(h2, h) {
    return h2 == h || h2 == heigh;
  }
  var isXBorder = function(w2, w) {
    return w2 == w || w2 == width;
  }
  resetData(data, 0);
  for (var h = 0; h < height; ++h) {
    var y0 = cy + (h - (height/2))*scale;
    for (var w = 0; w < width; ++w) {
      var d = 4*(h*width + w);
      // Skip if already rendered
      if (data[d+3] != 0) {
        continue;
      }

      var x0 = cx + (w - (width/2))*scale;      
      var i = mb(x0, y0);

      if (i != maxIter) {
        var color = colors[i];
        set(data, d, color[0], color[1], color[2]);
      }
      else {
        // var dir = nextDir('r');
        // var h2 = h2, w2 = w;

        // do
        // {
        //   switch(dir)
        //   {
        //     case 'u':
        //       if (isYBorder(h2-1, h)) {
        //         dir = nextDir(dir);
        //         continue;
        //       }
        //       var y2 = cy + (h2-1 - (height/2))*scale;
        //       var x2 = cx + (w2 - (width/2))*scale;      
        //       i = mb(x2, y2);
        //       break;
        //     case 'l': return 'd';
        //     case 'd': return 'r';
        //     case 'r': return 'u';
        //   }
        // }
        // while (true);
      }
    }
  }
}

window.onload = function() {
  selectionElement = document.getElementById('selection');
  canvas = document.getElementById('myCanvas');
  width = canvas.width;
  height = canvas.height;

  canvas.onselectstart = function () { return false; }
  canvas.onmousedown = myDown;
  //canvas.onmouseleave
  canvas.onmouseup = myUp;
  canvas.onmousemove = myMove;
  canvas.ondblclick = myDblClick;

  startRender();
}
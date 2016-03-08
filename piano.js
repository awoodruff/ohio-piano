var map = L.map('map',{
  dragging: false,
  touchZoom: false,
  scrollWheelZoom: false,
  doubleClickZoom: false,
  zoomControl: false
}).setView([40.168728,-84.9115694],10);

var CartoDB_Positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

var layersByName = {};
var sortedNames = [];

var countyData;
var fields;

var playInterval;

var songPopup = L.popup().setContent('Geographic center of song');
var songLatLngs = [];

$('#warning').click(function(){
  $(this).fadeOut();
})

setTimeout( function(){
  $('#warning').fadeOut();
},4000);

var countiesLayer = L.geoJson(countiesGeoJson, {
    onEachFeature: function(feature, layer) {
      layersByName[feature.properties.NAME] = layer;
    }
  }).setStyle({
    weight: 1,
    color: '#333',
    fillColor: '#999'
  }).on('mouseover',function(e){
    if (!countyData) return;
    var name = e.layer.feature.properties.NAME;
    var i = sortedNames.indexOf(name);
    playNote(i);

    e.layer.setStyle({
      fillOpacity: 0.75,
      weight: 2,
      color: '#000',
      fillColor: '#333'
    });
  }).on('mouseout',function(e){
    e.layer.setStyle({
      fillOpacity: 0.2,
      weight: 1,
      color: '#333'
    }).setStyle(e.layer._style);
  }).addTo(map);

scaleToFit();
$(window).resize(scaleToFit);
function scaleToFit() {
  var bounds = countiesLayer.getBounds();
  var nw = map.latLngToContainerPoint(bounds.getNorthWest());
  var se = map.latLngToContainerPoint(bounds.getSouthEast());
  var w = se.x - nw.x + 50 ;
  var h = se.y - nw.y + 50;
  var ds = Math.min( $('#map').width()/w, $('#map').height()/h );
  map.setView(bounds.getCenter(),map.getZoom() + Math.log(ds)/Math.log(2),{animate:false});
}

$.get('ohio.csv',function(csv){
  var parsed = Papa.parse(csv,{header:true});
  fields = parsed.meta.fields;
  countyData = parsed.data;
  sortCountiesOn('County name');
  for (var i = 0; i < fields.length; i ++) {
    var opt = $('<option>')
      .attr('value',fields[i])
      .html(fields[i])
      .appendTo('#sort-field');
  }
  $('#sort-field').on('change',function() {
    sortCountiesOn( $(this).val() );
  });

  $('#order').click(playInOrder);
  $('#song').click(playSong);
});

var notes = [];
for(var i = 1; i < 89; i ++) {
  var a = new Audio('notes/' + i + '.mp3');
  notes.push(a);
}

for ( i = 0; i < citiesArray.length; i ++ ) {
  $('<option>')
    .attr('value',citiesArray[i])
    .html(citiesArray[i])
    .appendTo('#from');
  $('<option>')
    .attr('value',citiesArray[i])
    .html(citiesArray[i])
    .appendTo('#to');
}
$('#to').on('change', routeChange)[0].selectedIndex = parseInt(Math.random()*citiesArray.length);
$('#from').on('change', routeChange)[0].selectedIndex = parseInt(Math.random()*citiesArray.length);

function playNote(i) {
  $('#warning').fadeOut();
  if (notes[i].paused) {
    notes[i].play();
  }else{
    notes[i].currentTime = 0
  }
}

function sortCountiesOn(fieldName) {
  if (!countyData) return;
  sortedNames = [];
  if (fieldName == 'County name') {
    sortedNames = countyData.map(function(row){ return row['County name'] }).sort();
  } else {
    countyData.sort(function(a,b) {
      return parseFloat(a[fieldName]) - parseFloat(b[fieldName]);
    });
    sortedNames = countyData.map(function(row){ return row['County name'] });
  }
  for (var i = 0; i < sortedNames.length; i ++ ) {
    var layer = layersByName[ sortedNames[i] ];
    var k = i  % 12;
    if (k == 1 || k == 4 || k == 8 || k == 9 || k == 11) {
      layer.setStyle({fillColor: '#000'});
      layer._style = {fillColor: '#000'};
    } else {
      layer.setStyle({fillColor: '#ccc'});
      layer._style = {fillColor: '#ccc'};
    }
  }
}

function playInOrder() {
  clearInterval(playInterval);
  var count = -1;
  playInterval = setInterval(function() {
    if (count >= 0) {
      layersByName[ sortedNames[count] ].setStyle({
        fillOpacity: 0.2,
        weight: 1,
        color: '#333'
      }).setStyle(layersByName[ sortedNames[count] ]._style);
    }
    count ++;
    if (count == sortedNames.length) {
      clearInterval(playInterval);
      return;
    }
    var layer = layersByName[ sortedNames[count] ]
    playNote(count);

    layer.setStyle({
      fillOpacity: 0.75,
      weight: 2,
      color: '#000',
      fillColor: '#333'
    });
  },50);
}

function playSong() {
  clearInterval(playInterval);
  var count = -1;
  songLatLngs = [];
  songPopup.setContent('Geographic center of song');
  playInterval = setInterval(function() {
    if (count >= 0) {
      for ( var i in songArray[count] ) {
        layersByName[ sortedNames[songArray[count][i]] ].setStyle({
          fillOpacity: 0.2,
          weight: 1,
          color: '#333'
        }).setStyle(layersByName[ sortedNames[songArray[count][i]] ]._style);
      }
      
    }
    count ++;
    if (count == songArray.length) {
      clearInterval(playInterval);
      reverseGeocode(songPopup.getLatLng());
      setTimeout(function(){
        map.closePopup(songPopup);
      },4000)
      return;
    }
    for ( var i in songArray[count] ) {
      var layer = layersByName[ sortedNames[songArray[count][i]] ];
      songLatLngs.push(layer.getBounds().getCenter())
      playNote(songArray[count][i]);

      layer.setStyle({
        fillOpacity: 0.75,
        weight: 2,
        color: '#000',
        fillColor: '#333'
      });
    }
    var center = getSongCenter();
    songPopup.setLatLng(center).openOn(map);
    
  },175);
}

function getSongCenter() {
  var sumLat = 0;
  var sumLng = 0;
  for (var i = 0; i < songLatLngs.length; i ++) {
    sumLat += songLatLngs[i].lat;
    sumLng += songLatLngs[i].lng;
  }
  return [sumLat/songLatLngs.length, sumLng/songLatLngs.length];
}

function reverseGeocode(latlng) {
  $.getJSON('http://open.mapquestapi.com/geocoding/v1/reverse?key=U1wFm9vioETmo92DWyc6tzAq5PhIKoED&location=' + latlng.lat + ',' + latlng.lng, function(response){
    var location = response.results[0].locations[0];
    songPopup.setContent('Geographic center of song:<br>' + location.adminArea5 + ', ' + location.adminArea4).openOn(map);
    //console.log()
  })
}

function routeChange() {
  getRoute( $('#from').val(), $('#to').val() );
}

function getRoute(from,to) {
  $.getJSON('http://open.mapquestapi.com/directions/v2/route?key=U1wFm9vioETmo92DWyc6tzAq5PhIKoED&from=' + from + ',OH&to=' + to + ',OH&fullShape=true', function(result) {
    var shape = result.route.shape.shapePoints;
    var countySequence = [];
    var latlngs = [];
    for (var i = 0; i < shape.length; i += 2) {
      var pt = {lat:shape[i],lng:shape[i+1]};
      latlngs.push([shape[i],shape[i+1]]);
      loopy: for ( var n in layersByName) {
        var poly = layersByName[n]._latlngs;
        for ( var p in poly ) {
          var ring = poly[p];
          if(isPointInPoly(ring,pt) && countySequence[countySequence.length-1] != layersByName[n]) {
            countySequence.push(layersByName[n]);
            break loopy;
          }
        }
      }
    }
    var routeLayer = L.polyline(latlngs,{
      color: '#f30'
    }).addTo(map);
    var count = -1;
    playInterval = setInterval(function() {
      if (count >= 0) {
        countySequence[count].setStyle({
          fillOpacity: 0.2,
          weight: 1,
          color: '#333'
        }).setStyle(countySequence[count]._style);
      }
      count ++;
      if (count == countySequence.length) {
        clearInterval(playInterval);
        setTimeout(function(){
          map.removeLayer(routeLayer);
        },2000);
        return;
      }
      var layer = countySequence[count];
      playNote( sortedNames.indexOf(layer.feature.properties.NAME) );

      layer.setStyle({
        fillOpacity: 0.75,
        weight: 2,
        color: '#000',
        fillColor: '#333'
      });
    },200);
  })
}

function isPointInPoly(poly, pt){
    for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
        ((poly[i].lat <= pt.lat && pt.lat < poly[j].lat) || (poly[j].lat <= pt.lat && pt.lat < poly[i].lat))
        && (pt.lng < (poly[j].lng - poly[i].lng) * (pt.lat - poly[i].lat) / (poly[j].lat - poly[i].lat) + poly[i].lng)
        && (c = !c);
    return c;
}
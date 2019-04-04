/*****************************************************************************
 * FILE:    HIWAT MAIN JS
 * DATE:    9 JULY 2018
 * AUTHOR: Sarva Pulla
 * COPYRIGHT: (c) NASA SERVIR 2018
 * LICENSE: BSD 2-Clause
 *****************************************************************************/

/*****************************************************************************
 *                      LIBRARY WRAPPER
 *****************************************************************************/

var LIBRARY_OBJECT = (function() {
    // Wrap the library in a package function
    "use strict"; // And enable strict mode for this library

    /************************************************************************
     *                      MODULE LEVEL / GLOBAL VARIABLES
     *************************************************************************/
    var animationDelay,
        $btnGetPlot,
        det_options,
        hourly_options,
        int_type,
        int_options,
        map,
        $modalChart,
        opacity,
        public_interface,			// Object returned by the module
        $slider,
        $sliderContainer,
        sliderInterval,
        tdWmsLayer,
        thredds_urls,
        var_options,
        gs_wms_url;


    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/
    var add_wms,
        clear_coords,
        get_ts,
        init_dropdown,
        init_events,
        init_jquery_vars,
        init_all,
        init_map,
        init_opacity_slider;


    /************************************************************************
     *                    PRIVATE FUNCTION IMPLEMENTATIONS
     *************************************************************************/

    clear_coords = function(){
        $("#point-lat-lon").val('');
        $("#poly-lat-lon").val('');
        $("#shp-lat-lon").val('');
    };


    init_jquery_vars = function(){
        $slider = $("#slider");
        $sliderContainer = $("#slider-container");
        $modalChart = $("#chart-modal");
        $btnGetPlot = $("#btn-get-plot");
        var $meta_element = $("#metadata");
        gs_wms_url = $meta_element.attr('data-wms-url');
        var_options = $meta_element.attr('data-var-options');
        var_options = JSON.parse(var_options);
        hourly_options = $meta_element.attr('data-hourly-options');
        hourly_options = JSON.parse(hourly_options);
        det_options = $meta_element.attr('data-det-options');
        det_options = JSON.parse(det_options);
        thredds_urls = $meta_element.attr('data-thredds-urls');
        thredds_urls = JSON.parse(thredds_urls);
        int_options = {'det':'Deterministic','hourly':'Ensemble Hourly','day1':'Ensemble Day 1','day2':'Ensemble Day 2'};

    };

    init_dropdown = function () {
        $(".interval_table").select2({minimumResultsForSearch: -1});
        $(".var_table").select2({minimumResultsForSearch: -1});

    };

    init_map = function() {
        map = L.map('map',{
            // timeDimension: true,
            // timeDimensionControl: true
        }).setView([28.39, 84.12], 5);

        var timeDimension = new L.TimeDimension();
        map.timeDimension = timeDimension;

        var player        = new L.TimeDimension.Player({
            loop: true,
            startOver:true
        }, timeDimension);

        var timeDimensionControlOptions = {
            player:        player,
            timeDimension: timeDimension,
            position:      'bottomleft',
            autoPlay:      false,
            minSpeed:      1,
            speedStep:     0.5,
            maxSpeed:      20,
            timeSliderDragUpdate: true,
            loopButton:true,
            limitSliders:true
        };

        var drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        var drawControlFull = new L.Control.Draw({
            edit: {
                featureGroup: drawnItems,
                edit: false
            },
            draw: {
                polyline: false,
                circlemarker:false,
                rectangle:false,
                circle:false,
                polygon:{
                    shapeOptions: {
                        color: '#007df3',
                        weight: 4
                    },
                    allowIntersection: false, // Restricts shapes to simple polygons
                }
            }
        });

        map.addControl(drawControlFull);

        map.on("draw:drawstart ", function (e) {
            drawnItems.clearLayers();
        });

        map.on("draw:created", function (e) {
            var layer = e.layer;
            layer.addTo(drawnItems);

            var feature = drawnItems.toGeoJSON();
            var type = feature.features[0].geometry.type;
            int_type = type;
            if (type == 'Point'){
                var coords = feature["features"][0]["geometry"]["coordinates"];
                $("#point-lat-lon").val(coords);
                get_ts();

            } else if (type == 'Polygon'){

                var coords = feature["features"][0]["geometry"];
                $("#poly-lat-lon").val(JSON.stringify(coords));
                get_ts();
            }
        });

        var timeDimensionControl = new L.Control.TimeDimension(timeDimensionControlOptions);
        map.addControl(timeDimensionControl);

        var mapLink =
            '<a href="http://openstreetmap.org">OpenStreetMap</a>';
        L.tileLayer(
            'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; ' + mapLink + ' Contributors',
                maxZoom: 18,
            }).addTo(map);

        var wmsUrl = "https://tethys.servirglobal.net/thredds/wms/tethys/HIWAT/hkhControl_20180329-1800_latlon.nc";
        var wmsLayer = L.tileLayer.wms(wmsUrl, {
            layers: 'APCP_surface',
            format: 'image/png',
            transparent: true,
            style:'boxfill/apcp_surface'
        });

// Create and add a TimeDimension Layer to the map
        tdWmsLayer = L.timeDimension.layer.wms(wmsLayer);


    };


    init_events = function(){

        map.on("mousemove", function (event) {
            document.getElementById('mouse-position').innerHTML = 'Latitude:'+event.latlng.lat.toFixed(5)+', Longitude:'+event.latlng.lng.toFixed(5);
        });


    };

    init_all = function(){
        init_jquery_vars();
        init_map();
        init_events();
        init_dropdown();
        init_opacity_slider();
    };

    init_opacity_slider = function(){
        opacity = 0.7;
        $("#opacity").text(opacity);
        $( "#opacity-slider" ).slider({
            value:opacity,
            min: 0.2,
            max: 1,
            step: 0.1, //Assigning the slider step based on the depths that were retrieved in the controller
            animate:"fast",
            slide: function( event, ui ) {

            }
        });
    };

    add_wms = function(var_type,interval){

        var wmsUrl = thredds_urls[interval];
        // console.log(wmsUrl);
        // map.removeLayer(wms_layer);
        map.removeLayer(tdWmsLayer);
        var index = find_var_index(var_type,var_options);
        var scale = var_options[index]["scale"];
        // gen_color_bar(var_options[index]["colors_list"],scale);
        var layer_id = var_options[index]["id"];
        var range = var_options[index]["min"]+','+var_options[index]["max"];

        var style = 'boxfill/'+layer_id.toLowerCase();
        opacity = $('#opacity-slider').slider("option", "value");

        var wmsLayer = L.tileLayer.wms(wmsUrl, {
            layers: layer_id,
            format: 'image/png',
            transparent: true,
            styles: style,
            colorscalerange: range,
            opacity:opacity,
            version:'1.3.0'
        });

        if(interval=='det'||interval=='hourly'){
            $('.leaflet-bar-timecontrol').removeClass('hidden');
            // Create and add a TimeDimension Layer to the map
            tdWmsLayer = L.timeDimension.layer.wms(wmsLayer,{
                updateTimeDimension:true,
                setDefaultTime:true,
                cache:48
            });
            tdWmsLayer.addTo(map);
        }else{
            $('.leaflet-bar-timecontrol').addClass('hidden');
            tdWmsLayer = wmsLayer;
            tdWmsLayer.addTo(map);
        }

        var imgsrc = wmsUrl + "?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER="+layer_id+"&colorscalerange="+range+"&PALETTE="+layer_id.toLowerCase()+"&transparent=TRUE";

        document.getElementById('legend').innerHTML = '<img src="' + imgsrc + '" alt="legend">';

    };

    get_ts = function(){
        if($("#poly-lat-lon").val() == "" && $("#point-lat-lon").val() == "" && $("#shp-lat-lon").val() == ""){
            $('.error').html('<b>No feature selected. Please create a feature using the map interaction dropdown. Plot cannot be generated without a feature.</b>');
            return false;
        }else{
            $('.error').html('');
        }

        var interaction = int_type;
        var sel_variable = $("#select_variable option:selected").val();
        var var_type = ($("#var_table option:selected").val());
        var interval_type = ($("#interval_table option:selected").val());

        if(interaction=="Point"){
            var geom_data = $("#point-lat-lon").val();
        }else if(interaction == "Polygon"){
            var geom_data = $("#poly-lat-lon").val();
        }
        $modalChart.modal('show');
        $("#cube").removeClass('hidden');
        $("#plotter").addClass('hidden');
        var xhr = ajax_update_database("get-ts",{"variable":var_type,"interval":interval_type,"interaction":interaction,"geom_data":geom_data});
        xhr.done(function(result) {
            if("success" in result) {

                // var json_response = JSON.parse(result);
                var index = find_var_index(var_type,var_options);
                var display_name = var_options[index]["display_name"];
                var units = var_options[index]["units"];
                $('.error').html('');
                $('#plotter').highcharts({
                    chart: {
                        type:'spline',
                        zoomType: 'x'
                    },
                    tooltip: {
                        backgroundColor: '#FCFFC5',
                        borderColor: 'black',
                        borderRadius: 10,
                        borderWidth: 3
                    },
                    title: {
                        text: $("#var_table option:selected").text() + " values at " + result.data["geom"] ,
                        style: {
                            fontSize: '14px'
                        }
                    },
                    xAxis: {
                        type: 'datetime',
                        labels: {
                            format: '{value:Day %d-%H:%M}'
                            // rotation: 45,
                            // align: 'left'
                        },
                        title: {
                            text: 'Date'
                        }
                    },
                    yAxis: {
                        title: {
                            text: units
                        }

                    },
                    exporting: {
                        enabled: true
                    },
                    series: [{
                        data:result.data["plot"],
                        name: display_name
                    }]

                });
                $("#cube").addClass('hidden');
                $("#plotter").removeClass('hidden');
            } else {
                $("#cube").removeClass('hidden');
                $(".error").append('<h3>Error Processing Request.</h3>');
                $("#plotter").removeClass('hidden');
            }
        });

    };

    $("#btn-get-plot").on('click',get_ts);

    /************************************************************************
     *                        DEFINE PUBLIC INTERFACE
     *************************************************************************/

    public_interface = {

    };

    /************************************************************************
     *                  INITIALIZATION / CONSTRUCTOR
     *************************************************************************/

    // Initialization: jQuery function that gets called when
    // the DOM tree finishes loading
    $(function() {
        init_all();

        // thredds_urls.forEach(function(item,i){
        //    console.log(item,i);
        // });
        $("#interval_table").html('');
        $.each(thredds_urls,function(n){
            var new_option = new Option(int_options[n],n);
            $("#interval_table").append(new_option);
        });

        $("#interval_table").change(function(){
            var interval_type = ($("#interval_table option:selected").val());

            $("#var_table").html('');

            var_options.forEach(function(item,i){
                if(item["category"]==interval_type){
                    var new_option = new Option(item["display_name"]+' ('+item["units"]+')',item["id"]);
                    $("#var_table").append(new_option);
                }
            });
            $("#var_table").trigger('change');

        }).change();

        $("#var_table").change(function(){
            $('#types').val('None').trigger('change');
            var var_type = ($("#var_table option:selected").val());
            var interval_type = ($("#interval_table option:selected").val());
            add_wms(var_type,interval_type);
        }).change();


        $("#opacity-slider").on("slidechange", function(event, ui) {
            opacity = ui.value;
            $("#opacity").text(opacity);
            tdWmsLayer.setOpacity(opacity);

        });


    });

    return public_interface;

}()); // End of package wrapper
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper
// function immediately after being parsed.
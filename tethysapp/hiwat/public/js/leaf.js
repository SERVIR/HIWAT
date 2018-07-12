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
        current_layer,
        day1_options,
        day2_options,
        det_options,
        element,
        hourly_options,
        int_type,
        layers,
        map,
        $modalUpload,
        $modalChart,
        opacity,
        popup,
        public_interface,			// Object returned by the module
        select_source,
        selectedFeatures,
        shp_layer,
        shp_source,
        sld_global,
        $slider,
        $sliderContainer,
        slider_max,
        sliderInterval,
        styling,
        tdWmsLayer,
        thredds_urls,
        var_options,
        gs_wms_url,
        wms_url,
        wms_layer,
        wms_source;


    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/
    var add_wms,
        animate,
        update_wms,
        clear_coords,
        gen_color_bar,
        get_ts,
        gen_slider,
        get_styling,
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
            maxSpeed:      4,
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

        // map.on("click", function (event) {
        //     console.log(event);
        // });

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

    gen_slider = function(interval){
        $sliderContainer.removeClass('hidden');

        if(interval == 'det'){

            slider_max = 49;
            $("#slider").slider({
                value:0,
                min: 0,
                max: slider_max - 1,
                step: 1, //Assigning the slider step based on the depths that were retrieved in the controller
                animate:"fast",
                slide: function( event, ui ) {
                }

            });
            $sliderContainer.removeClass('hidden');

        }else if(interval == 'hourly'){
            slider_max = 48;
            $( "#slider").slider({
                value:0,
                min: 0,
                max: slider_max - 1,
                step: 1, //Assigning the slider step based on the depths that were retrieved in the controller
                animate:"fast",
                slide: function( event, ui ) {
                }

            });
            $sliderContainer.removeClass('hidden');

        }else if(interval == 'day1' || interval == 'day2'){
            slider_max = 0;
            $( "#slider").slider({
                value:0,
                min: 0,
                max: slider_max - 1,
                step: 1, //Assigning the slider step based on the depths that were retrieved in the controller
                animate:"fast",
                slide: function( event, ui ) {
                }

            });
            $sliderContainer.addClass('hidden');

        }

    };

    gen_color_bar = function(colors,scale){
        var cv  = document.getElementById('cv'),
            ctx = cv.getContext('2d');
        ctx.clearRect(0,0,cv.width,cv.height);
        // ctx.beginPath();
        // ctx.fillStyle = 'white';
        // ctx.fillRect(0,20,20,20);
        // ctx.fillStyle = 'black';
        // ctx.fillText(scale[0].toFixed(2),20,8);
        colors.forEach(function(color,i){
            // ctx.beginPath();
            ctx.fillStyle = color;
            ctx.fillRect(0,(i+1)*20,20,20);
            ctx.fillStyle = 'black';
            ctx.fillText(scale[i].toFixed(2),25,(i+1)*21);
        });
    };

    get_styling = function(scale,start,end,index){
        // var start = 'blue';
        // var end = 'red';
        var sld_color_string = '';

        if ("colors_list" in var_options[index]){
            // console.log(var_options[index]["colors_list"]);
            var colors = var_options[index]["colors_list"];
            gen_color_bar(colors,scale);
            colors.forEach(function(color,i){
                if(i==0){
                    var color_map_entry = '<ColorMapEntry color="#f00" quantity="'+scale[i]+'" label="label'+i+'" opacity="0.1"/>';
                }else{
                    var color_map_entry = '<ColorMapEntry color="'+color+'" quantity="'+scale[i]+'" label="label'+i+'" opacity="'+opacity+'"/>';
                }

                sld_color_string += color_map_entry;
            });
        }else{
            if(scale[scale.length-1] == 0){
                var colors = chroma.scale([start,start]).mode('lab').correctLightness().colors(20);
                // var colors2 = chroma.scale([start,start]).classes(20);
                // console.log(colors2);
                gen_color_bar(colors,scale);
                if(i==0){
                    var color_map_entry = '<ColorMapEntry color="#f00" quantity="'+scale[i]+'" label="label'+i+'" opacity="0.1"/>';
                }else{
                    var color_map_entry = '<ColorMapEntry color="'+color+'" quantity="'+scale[i]+'" label="label'+i+'" opacity="'+opacity+'"/>';
                }
                sld_color_string += color_map_entry;
            }else{
                var colors = chroma.scale([start,end]).mode('lab').correctLightness().colors(20);

                // var colors2 = chroma.scale([start,end]).classes(20);
                // console.log(colors);
                gen_color_bar(colors,scale);
                colors.forEach(function(color,i){
                    if(i==0){
                        var color_map_entry = '<ColorMapEntry color="#f00" quantity="'+scale[i]+'" label="label'+i+'" opacity="0"/>';
                    }else{
                        var color_map_entry = '<ColorMapEntry color="'+color+'" quantity="'+scale[i]+'" label="label'+i+'" opacity="'+opacity+'"/>';
                    }
                    sld_color_string += color_map_entry;
                });
            }
        }


        return sld_color_string
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
            tdWmsLayer = L.timeDimension.layer.wms(wmsLayer);
            tdWmsLayer.addTo(map);
        }else{
            $('.leaflet-bar-timecontrol').addClass('hidden');
            tdWmsLayer = wmsLayer;
            tdWmsLayer.addTo(map);
        }



    };

    update_wms = function(var_type,uival,interval){

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

    animate = function(){
        var sliderVal = $("#slider").slider("value");

        sliderInterval = setInterval(function() {
            $("#slider").slider("value", sliderVal);
            sliderVal += 1;
            if (sliderVal===slider_max - 1) sliderVal=0;
        }, animationDelay);
    };

    $(".btn-run").on("click", animate);
    //Set the slider value to the current value to start the animation at the );
    $(".btn-stop").on("click", function() {
        //Call clearInterval to stop the animation.
        clearInterval(sliderInterval);
    });

    $(".btn-increase").on("click", function() {
        clearInterval(sliderInterval);

        if(animationDelay > 250){

            animationDelay = animationDelay - 250;
            $("#speed").text((1/(animationDelay/1000)).toFixed(2));
            animate();
        }

    });

    //Decrease the slider timer when you click decrease the speed
    $(".btn-decrease").on("click", function() {
        clearInterval(sliderInterval);
        animationDelay = animationDelay + 250;
        $("#speed").text((1/(animationDelay/1000)).toFixed(2));
        animate();
    });


    $(function() {

    });

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
        // Highcharts.setOptions({lang: {noData: "No data to display. Use the map interaction to fill the chart."}});
        // var chart = Highcharts.chart('plotter', {
        //     series: [{
        //         data: []
        //     }]
        // });
        animationDelay  = 500;
        sliderInterval = {};
        $("#speed").text(((animationDelay/1000)).toFixed(2));
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
            // gen_slider(interval_type);
            add_wms(var_type,interval_type);
        }).change();


        $("#opacity-slider").on("slidechange", function(event, ui) {
            opacity = ui.value;
            $("#opacity").text(opacity);
            tdWmsLayer.setOpacity(opacity);
            // wms_layer.setOpacity(opacity);
        });


    });

    return public_interface;

}()); // End of package wrapper
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper
// function immediately after being parsed.
/*****************************************************************************
 * FILE:    HIWAT MAIN JS
 * DATE:    8 MARCH 2018
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
        $slider,
        $sliderContainer,
        slider_max,
        sliderInterval,
        styling,
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

    };

    init_dropdown = function () {
        $(".interval_table").select2();
        $(".var_table").select2();

    };

    init_map = function() {
        var projection = ol.proj.get('EPSG:3857');
        var baseLayer = new ol.layer.Tile({
            source: new ol.source.BingMaps({
                key: '5TC0yID7CYaqv3nVQLKe~xWVt4aXWMJq2Ed72cO4xsA~ApdeyQwHyH_btMjQS1NJ7OHKY8BK-W-EMQMrIavoQUMYXeZIQOUURnKGBOC7UCt4',
                imagerySet: 'AerialWithLabels' // Options 'Aerial', 'AerialWithLabels', 'Road'
            })
        });
        var fullScreenControl = new ol.control.FullScreen();
        var view = new ol.View({
            center: ol.proj.transform([84,28], 'EPSG:4326','EPSG:3857'),
            projection: projection,
            zoom: 6
        });
        shp_source = new ol.source.Vector();
        shp_layer = new ol.layer.Vector({
            source: shp_source
        });

        wms_source = new ol.source.ImageWMS({
            url: gs_wms_url,
            params: {},
            serverType: 'geoserver',
            crossOrigin: 'Anonymous'
        });

        wms_layer = new ol.layer.Image({
            name: 'wms_layer',
            source: wms_source
        });

        var vector_source = new ol.source.Vector({
            wrapX: false
        });

        var vector_layer = new ol.layer.Vector({
            name: 'my_vectorlayer',
            source: vector_source,
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                    color: '#ffcc33',
                    width: 2
                }),
                image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({
                        color: '#ffcc33'
                    })
                })
            })
        });


        layers = [baseLayer,vector_layer,shp_layer,wms_layer];

        map = new ol.Map({
            target: document.getElementById("map"),
            layers: layers,
            view: view
        });

        map.crossOrigin = 'anonymous';
        element = document.getElementById('popup');

        popup = new ol.Overlay({
            element: element,
            positioning: 'bottom-center',
            stopEvent: true
        });

        map.addOverlay(popup);

        var mousePositionControl = new ol.control.MousePosition({
            coordinateFormat: ol.coordinate.createStringXY(4),
            projection: 'EPSG:4326',
            className: 'custom-mouse-position',
            target: document.getElementById('mouse-position'),
            undefinedHTML: '&nbsp;'
        });

        map.addControl(mousePositionControl);

        //Code for adding interaction for drawing on the map
        var lastFeature, draw, featureType;

        //Clear the last feature before adding a new feature to the map
        var removeLastFeature = function () {
            if (lastFeature) vector_source.removeFeature(lastFeature);
        };

        //Add interaction to the map based on the selected interaction type
        var addInteraction = function (geomtype) {
            var typeSelect = document.getElementById('types');
            var value = typeSelect.value;
            $('#data').val('');
            if (value !== 'None') {
                if (draw)
                    map.removeInteraction(draw);

                draw = new ol.interaction.Draw({
                    source: vector_source,
                    type: geomtype
                });


                map.addInteraction(draw);
            }
            if (featureType === 'Point' || featureType === 'Polygon') {

                draw.on('drawend', function (e) {
                    lastFeature = e.feature;

                });

                draw.on('drawstart', function (e) {
                    vector_source.clear();
                });

            }


        };

        vector_layer.getSource().on('addfeature', function(event){
            //Extracting the point/polygon values from the drawn feature
            var feature_json = saveData();
            var parsed_feature = JSON.parse(feature_json);
            var feature_type = parsed_feature["features"][0]["geometry"]["type"];
            if (feature_type == 'Point'){
                var coords = parsed_feature["features"][0]["geometry"]["coordinates"];
                var proj_coords = ol.proj.transform(coords, 'EPSG:3857','EPSG:4326');
                $("#point-lat-lon").val(proj_coords);
                get_ts();

            } else if (feature_type == 'Polygon'){
                var coords = parsed_feature["features"][0]["geometry"]["coordinates"][0];
                proj_coords = [];
                coords.forEach(function (coord) {
                    var transformed = ol.proj.transform(coord,'EPSG:3857','EPSG:4326');
                    proj_coords.push('['+transformed+']');
                });
                var json_object = '{"type":"Polygon","coordinates":[['+proj_coords+']]}';
                $("#poly-lat-lon").val(json_object);
                get_ts();
            }
        });
        function saveData() {
            // get the format the user has chosen
            var data_type = 'GeoJSON',
                // define a format the data shall be converted to
                format = new ol.format[data_type](),
                // this will be the data in the chosen format
                data;
            try {
                // convert the data of the vector_layer into the chosen format
                data = format.writeFeatures(vector_layer.getSource().getFeatures());
            } catch (e) {
                // at time of creation there is an error in the GPX format (18.7.2014)
                $('#data').val(e.name + ": " + e.message);
                return;
            }
            // $('#data').val(JSON.stringify(data, null, 4));
            return data;

        }

        //Retrieve the relevant modal or tool based on the map interaction item
        $('#types').change(function (e) {
            featureType = $(this).find('option:selected').val();
            clear_coords();
            vector_layer.getSource().clear();
            shp_layer.getSource().clear();
            map.removeInteraction(draw);
            if(featureType == 'None')
            {
                wms_layer.setVisible(true);
            }else{
                wms_layer.setVisible(false);
            }
            if(featureType == 'None'){
                $('#data').val('');

                map.removeInteraction(draw);
                vector_layer.getSource().clear();
                shp_layer.getSource().clear();
            }else if(featureType == 'Upload')
            {
                $modalUpload.modal('show');
            }else if(featureType == 'Point')
            {
                addInteraction(featureType);
            }else if(featureType == 'Polygon'){
                addInteraction(featureType);
            }
        }).change();


    };


    init_events = function(){
        (function () {
            var target, observer, config;
            // select the target node
            target = $('#app-content-wrapper')[0];

            observer = new MutationObserver(function () {
                window.setTimeout(function () {
                    map.updateSize();
                }, 350);
            });
            $(window).on('resize', function () {
                map.updateSize();
            });

            config = {attributes: true};

            observer.observe(target, config);
        }());

        map.on("singleclick",function(evt){
            $(element).popover('destroy');
            if ($("#types").find('option:selected').val()=="None"){
                var clickCoord = evt.coordinate;
                var view = map.getView();
                var viewResolution = view.getResolution();

                wms_url = current_layer.getSource().getGetFeatureInfoUrl(evt.coordinate, viewResolution, view.getProjection(), {'INFO_FORMAT': 'application/json'});
                popup.setPosition(clickCoord);
                if (wms_url) {
                    //Retrieving the details for clicked point via the url
                    $.ajax({
                        type: "GET",
                        url: wms_url,
                        dataType: 'json',
                        success: function (result) {
                            var value = parseFloat(result["features"][0]["properties"]["GRAY_INDEX"]);
                            value = value.toFixed(2);
                            $(element).popover({
                                'placement': 'top',
                                'html': true,
                                //Dynamically Generating the popup content
                                'content':'Value: '+value
                            });

                            $(element).popover('show');
                            $(element).next().css('cursor', 'text');


                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            console.log(Error);
                        }
                    });
                }
            }

        });
        //
        map.on('pointermove', function(evt) {
            if (evt.dragging) {
                return;
            }
            var pixel = map.getEventPixel(evt.originalEvent);
            var hit = map.forEachLayerAtPixel(pixel, function(layer) {
                if (layer != layers[0] && layer != layers[1] && layer != layers[2]){
                    current_layer = layer;
                    return true;}
            });
            map.getTargetElement().style.cursor = hit ? 'pointer' : '';
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
                var color_map_entry = '<ColorMapEntry color="'+color+'" quantity="'+scale[i]+'" label="label'+i+'" opacity="'+opacity+'"/>';
                sld_color_string += color_map_entry;
            });
        }else{
            if(scale[scale.length-1] == 0){
                var colors = chroma.scale([start,start]).mode('lab').correctLightness().colors(20);
                // var colors2 = chroma.scale([start,start]).classes(20);
                // console.log(colors2);
                gen_color_bar(colors,scale);
                var color_map_entry = '<ColorMapEntry color="'+colors[0]+'" quantity="'+scale[0]+'" label="label1" opacity="'+opacity+'"/>';
                sld_color_string += color_map_entry;
            }else{
                var colors = chroma.scale([start,end]).mode('lab').correctLightness().colors(20);

                // var colors2 = chroma.scale([start,end]).classes(20);
                // console.log(colors);
                gen_color_bar(colors,scale);
                colors.forEach(function(color,i){
                    var color_map_entry = '<ColorMapEntry color="'+color+'" quantity="'+scale[i]+'" label="label'+i+'" opacity="'+opacity+'"/>';
                    sld_color_string += color_map_entry;
                });
            }
        }


        return sld_color_string
    };

    add_wms = function(var_type,interval){
        if(interval == 'det'){
            $( "#slider-text" ).text(det_options[0][1]);
            var ws = 'hiwat'+interval;
            var store = var_type+'-'+det_options[0][0];
            var layer_name = ws+':'+store;
        }else if(interval=='hourly'){
            $( "#slider-text" ).text(hourly_options[0][1]);
            var ws = 'hiwat'+interval;
            var store = var_type+'-'+hourly_options[0][0];
            var layer_name = ws+':'+store;
        }else if(interval=='day1'){
            var ws = 'hiwat'+interval;
            var store = var_type+'-'+interval;
            var layer_name = ws+':'+store;
        }else if(interval=='day2'){
            var ws = 'hiwat'+interval;
            var store = var_type+'-'+interval;
            var layer_name = ws+':'+store;
        }

        map.removeLayer(wms_layer);
        var index = find_var_index(var_type,var_options);
        var scale = var_options[index]["scale"];

        styling = get_styling(scale,var_options[index]["start"],var_options[index]["end"],index);
        var sld_string = '<StyledLayerDescriptor version="1.0.0"><NamedLayer><Name>'+layer_name+'</Name><UserStyle><FeatureTypeStyle><Rule>\
        <RasterSymbolizer> \
        <ColorMap type="ramp"> \
        <ColorMapEntry color="#f00" quantity="-9999" label="labelnone" opacity="0"/>'+
            styling+'</ColorMap>\
        </RasterSymbolizer>\
        </Rule>\
        </FeatureTypeStyle>\
        </UserStyle>\
        </NamedLayer>\
        </StyledLayerDescriptor>';

        wms_source = new ol.source.ImageWMS({
            url: gs_wms_url,
            params: {'LAYERS':layer_name,'SLD_BODY':sld_string},
            serverType: 'geoserver',
            crossOrigin: 'Anonymous'
        });

        wms_layer = new ol.layer.Image({
            name:'wms_layer',
            source: wms_source
        });

        // wms_source.updateParams({'LAYERS':layer_name,'SLD_BODY':sld_string});

        map.addLayer(wms_layer);
        map.updateSize();
    };

    update_wms = function(var_type,uival,interval){
        if(interval == 'det'){
            $( "#slider-text" ).text(det_options[uival][1]);
            var ws = 'hiwat'+interval;
            var store = var_type+'-'+det_options[uival][0];
            var layer_name = ws+':'+store;
        }else if(interval=='hourly'){
            $( "#slider-text" ).text(hourly_options[uival][1]);
            var ws = 'hiwat'+interval;
            var store = var_type+'-'+hourly_options[uival][0];
            var layer_name = ws+':'+store;
        }
        var sld_string = '<StyledLayerDescriptor version="1.0.0"><NamedLayer><Name>'+layer_name+'</Name><UserStyle><FeatureTypeStyle><Rule>\
        <RasterSymbolizer> \
        <ColorMap type="ramp"> \
        <ColorMapEntry color="#f00" quantity="-9999" label="labelnone" opacity="0"/>'+
            styling+'</ColorMap>\
        </RasterSymbolizer>\
        </Rule>\
        </FeatureTypeStyle>\
        </UserStyle>\
        </NamedLayer>\
        </StyledLayerDescriptor>';

        wms_source.updateParams({'LAYERS':layer_name,'SLD_BODY':sld_string});
    };

    get_ts = function(){
        if($("#poly-lat-lon").val() == "" && $("#point-lat-lon").val() == "" && $("#shp-lat-lon").val() == ""){
            $('.error').html('<b>No feature selected. Please create a feature using the map interaction dropdown. Plot cannot be generated without a feature.</b>');
            return false;
        }else{
            $('.error').html('');
        }

        var interaction = $("#types option:selected").val();
        var sel_variable = $("#select_variable option:selected").val();
        var var_type = ($("#var_table option:selected").val());
        var interval_type = ($("#interval_table option:selected").val());

        if(interaction=="Point"){
            var geom_data = $("#point-lat-lon").val();
        }else if(interaction == "Polygon"){
            var geom_data = $("#poly-lat-lon").val();
        }

        var xhr = ajax_update_database("get-ts",{"variable":var_type,"interval":interval_type,"interaction":interaction,"geom_data":geom_data});
        xhr.done(function(result) {
            if("success" in result) {
                $modalChart.modal('show');
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

            } else {
                $(".error").append('<h3>Error Processing Request.</h3>');
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
        Highcharts.setOptions({lang: {noData: "No data to display. Use the map interaction to fill the chart."}});
        var chart = Highcharts.chart('plotter', {
            series: [{
                data: []
            }]
        });
        animationDelay  = 1500;
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
            gen_slider(interval_type);
            add_wms(var_type,interval_type);
        }).change();

        $("#slider").on("slidechange", function(event, ui) {
            var interval_type = ($("#interval_table option:selected").val());
            var variable = ($("#var_table option:selected").val());
            if(interval_type == 'det'){
                $( "#slider-text" ).text(det_options[ui.value][1]); //Get the value from the slider
                update_wms(variable,ui.value,interval_type);
            }else if(interval_type == 'hourly'){
                $( "#slider-text" ).text(hourly_options[ui.value][1]);
                update_wms(variable,ui.value,interval_type);
            }

        });

        $("#opacity-slider").on("slidechange", function(event, ui) {
            opacity = ui.value;
            $("#opacity").text(opacity);
            wms_layer.setOpacity(opacity);
        });


    });

    return public_interface;

}()); // End of package wrapper
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper
// function immediately after being parsed.
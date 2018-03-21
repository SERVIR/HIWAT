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
    var $btnGetPlot,
        current_layer,
        element,
        layers,
        map,
        $modalUpload,
        $modalChart,
        popup,
        public_interface,			// Object returned by the module
        select_source,
        selectedFeatures,
        shp_layer,
        shp_source,
        wms_url,
        wms_layer,
        wms_source;


    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/
    var clear_coords,
        get_ts,
        init_events,
        init_jquery_vars,
        init_all,
        init_map;


    /************************************************************************
     *                    PRIVATE FUNCTION IMPLEMENTATIONS
     *************************************************************************/

    clear_coords = function(){
        $("#point-lat-lon").val('');
        $("#poly-lat-lon").val('');
        $("#shp-lat-lon").val('');
    };


    init_jquery_vars = function(){
        $modalChart = $("#chart-modal");
        $btnGetPlot = $("#btn-get-plot");
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
            url: wms_url,
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


        layers = [baseLayer,vector_layer,shp_layer];

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

            } else if (feature_type == 'Polygon'){
                var coords = parsed_feature["features"][0]["geometry"]["coordinates"][0];
                proj_coords = [];
                coords.forEach(function (coord) {
                    var transformed = ol.proj.transform(coord,'EPSG:3857','EPSG:4326');
                    proj_coords.push('['+transformed+']');
                });
                var json_object = '{"type":"Polygon","coordinates":[['+proj_coords+']]}';
                $("#poly-lat-lon").val(json_object);
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
            if(featureType == 'None'){
                $('#data').val('');
                clear_coords();
                map.removeInteraction(draw);
                vector_layer.getSource().clear();
                shp_layer.getSource().clear();
            }else if(featureType == 'Upload')
            {
                clear_coords();
                vector_layer.getSource().clear();
                shp_layer.getSource().clear();
                map.removeInteraction(draw);
                $modalUpload.modal('show');
            }else if(featureType == 'Point')
            {
                clear_coords();
                shp_layer.getSource().clear();
                addInteraction(featureType);
            }else if(featureType == 'Polygon'){
                clear_coords();
                shp_layer.getSource().clear();
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

        // map.on("singleclick",function(evt){
        //
        // });
        //
        // map.on('pointermove', function(evt) {
        //     if (evt.dragging) {
        //         return;
        //     }
        //     var pixel = map.getEventPixel(evt.originalEvent);
        //     var hit = map.forEachLayerAtPixel(pixel, function(layer) {
        //         if (layer != layers[0] && layer != layers[layers.length - 1] && layer != layers[layers.length - 2] && layer != layers[layers.length - 2]){
        //             current_layer = layer;
        //             return true;}
        //     });
        //     map.getTargetElement().style.cursor = hit ? 'pointer' : '';
        // });
    };

    init_all = function(){
        init_jquery_vars();
        init_map();
        init_events();
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
        if(interaction=="Point"){
            var geom_data = $("#point-lat-lon").val();
        }else if(interaction == "Polygon"){
            var geom_data = $("#poly-lat-lon").val();
        }

        var xhr = ajax_update_database("get-ts",{"variable":sel_variable,"interaction":interaction,"geom_data":geom_data});
        xhr.done(function(result) {
            if("success" in result) {
                $modalChart.modal('show');
                // var json_response = JSON.parse(result);
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
                        text: $("#select_variable option:selected").text() + " values at " + result.data["point"] ,
                        style: {
                            fontSize: '14px'
                        }
                    },
                    xAxis: {
                        type: 'datetime',
                        labels: {
                            format: '{value:%d %b %Y}'
                            // rotation: 45,
                            // align: 'left'
                        },
                        title: {
                            text: 'Date'
                        }
                    },
                    // yAxis: {
                    //     title: {
                    //         text: 'Units'
                    //     }
                    //
                    // },
                    exporting: {
                        enabled: true
                    },
                    series: [{
                        data:result.data["plot"],
                        name: $("#select_variable option:selected").text()
                    }]

                });

            } else {
                $(".error").append('<h3>Error Processing Request.</h3>');
            }
        });

    };

    $("#btn-get-plot").on('click',get_ts);

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

    });

    return public_interface;

}()); // End of package wrapper
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper
// function immediately after being parsed.
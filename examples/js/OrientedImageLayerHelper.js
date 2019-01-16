
/* global itowns, document */

function addOrtho() {
    // Add one imagery layer to the scene
    // This layer is defined in a json file but it could be defined as a plain js
    // object. See Layer* for more info.
    itowns.Fetcher.json('../layers/JSONLayers/Ortho.json').then(function _(config) {
        config.source = new itowns.WMTSSource(config.source);
        var layer = new itowns.ColorLayer('Ortho', config);
        view.addLayer(layer).then(menuGlobe.addLayerGUI.bind(menuGlobe));
    });
}

function addElevation() {
    // Add two elevation layers.
    // These will deform iTowns globe geometry to represent terrain elevation.
    function addElevationLayerFromConfig(config) {
        config.source = new itowns.WMTSSource(config.source);
        var layer = new itowns.ElevationLayer(config.id, config);
        view.addLayer(layer).then(menuGlobe.addLayerGUI.bind(menuGlobe));
    }
    itowns.Fetcher.json('../layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addElevationLayerFromConfig);
}

function createWfsBuildingLayer(material) {

    function altitudeBuildings(properties) {
        return properties.z_min - properties.hauteur;
    }

    function extrudeBuildings(properties) {
        return properties.hauteur;
    }

    // prepare WFS source for the buildings
    var wfsBuildingSource = new itowns.WFSSource({
        url: 'http://wxs.ign.fr/3ht7xcw6f7nciopo16etuqp2/geoportail/wfs?',
        version: '2.0.0',
        typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie,BDTOPO_BDD_WLD_WGS84G:bati_industriel',
        projection: 'EPSG:4326',
        ipr: 'IGN',
        format: 'application/json',
        level: 10,
        extent: {
            west: 2.35,
            east: 2.37,
            south: 48.86,
            north: 48.88,
        },
    });

    // create geometry layer for the buildings
    var wfsBuildingLayer = new itowns.GeometryLayer('WFS Building', new itowns.THREE.Group(), {
        update: itowns.FeatureProcessing.update,
        convert: itowns.Feature2Mesh.convert({
            altitude: altitudeBuildings,
            extrude: extrudeBuildings }),

        // when a building is created, it get the projective texture mapping, from oriented image layer.
        onMeshCreated: (mesh) => mesh.traverse(object => object.material = material),
        source: wfsBuildingSource
    });

        // add the created building layer
    return view.addLayer(wfsBuildingLayer);
}

function dispatchOnPanoChangedEventToControl(e) {
    view.controls.setPreviousPosition(e.previousPanoPosition);
    view.controls.setCurrentPosition(e.currentPanoPosition);
    view.controls.setNextPosition(e.nextPanoPosition);
}

function createOrientedImageLayer(view, id, textureUrl, orientationsUrl, calibrationUrl, backgroundDistance) {
    // Prepare oriented image source
    var orientedImageSource = new itowns.OrientedImageSource({
            url: textureUrl,
    });
    // Fetch the two files
    var promises = [];
    var networkOptions = {crossOrigin: ''};
    promises.push(itowns.Fetcher.json(orientationsUrl, networkOptions) );
    promises.push(itowns.Fetcher.json(calibrationUrl, networkOptions) ) ;
    return Promise.all(promises).then((res) => {

        var orientation = res[0];
        var calibration = res[1];

        // Create oriented image layer
        var olayer = new itowns.OrientedImageLayer(id, {
            // Radius in meter of the sphere used as a background.
            backgroundDistance: backgroundDistance,
            source: orientedImageSource,
            orientation: orientation,
            calibration: calibration,
            projection: view.referenceCrs,
            onPanoChanged: dispatchOnPanoChangedEventToControl
        });

        return view.addLayer(olayer, view.tileLayer);
    });
}

function addPlyLayer(id, url, position, material) {
    var loader = new itowns.THREE.PLYLoader();

    loader.load(url, function onLoad(geometry) {
        var meshLayer = new itowns.GeometryLayer(id, new itowns.THREE.Group());
        var mesh = new itowns.THREE.Mesh(geometry, material);

        meshLayer.update = function _() {};
        meshLayer.name = 'Mesh Layer';
        meshLayer.overrideMaterials = true;  // custom cesium shaders are not functional
        meshLayer.type = 'geometry';
        meshLayer.visible = true;
        view.addLayer(meshLayer);
        mesh.position.copy(position);
        mesh.updateMatrixWorld();
        mesh.layer = meshLayer.id;
        view.scene.add(mesh);
    });
}

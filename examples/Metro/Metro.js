/* global itowns, document, renderer, dat, debug, menuGlobe */
// # Simple Globe viewer

var debugGui = new dat.GUI({ width: 200 });

// Define initial camera position
var positionOnGlobe = { longitude: 2.4350, latitude: 48.8578, altitude: 100 };
var promises = [];

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');

// Instanciate iTowns GlobeView*
var view = new itowns.GlobeView(viewerDiv, positionOnGlobe, {
    renderer: renderer,
    handleCollision: false,
    sseSubdivisionThreshold: 10,
});
            // create Immersive control
var streetControls = new itowns.StreetControls(view, {
    animationDuration: 50,
    buildingsLayer: 'Surface',
});

view.controls = new itowns.ControlsSwitcher(view, streetControls);

// limit camera far, to increase performance
// view.camera.camera3D.far = 10000;
view.camera.camera3D.near = 0.1;

// open camera fov
view.camera.camera3D.fov = 75;
view.camera.camera3D.updateProjectionMatrix();

addOrtho();

addElevation();

var orientedImagesLayerPromise = createOrientedImageLayer(view, 'streetTexture',
    'http://localhost:8080/examples/Metro/images/{panoId}_{cameraId}.jpg',
                'http://localhost:8080/examples/Metro/Metro_024_pano.geojson',
                'http://localhost:8080/examples/Metro/images/Metro_024_camera.json', 0);


orientedImagesLayerPromise.then(function addWfsLayer(result) {
    var pointcloud;
    var pointcloud2;
    var loader;
    var folder;

    // LOAD POINT CLOUD
    pointcloud = new itowns.GeometryLayer('Point cloud', new itowns.THREE.Group());
    pointcloud.type = 'geometry';
    pointcloud.file = 'cloud.js';
    pointcloud.protocol = 'potreeconverter';
    pointcloud.url = 'http://localhost:8080/examples/Metro/Lidar';
    // set size to 1
    pointcloud.pointSize = 1;

    function onLayerReady() {
        debug.PointCloudDebug.initTools(view, pointcloud, debugGui);

        // add GUI entry
        menuGlobe.addImageryLayerGUI(pointcloud);
    }

    itowns.View.prototype.addLayer.call(view, pointcloud).then(onLayerReady);

    // LOAD POINT CLOUD
    pointcloud2 = new itowns.GeometryLayer('Centre Photo', new itowns.THREE.Group());
    pointcloud2.type = 'geometry';
    pointcloud2.file = 'cloud.js';
    pointcloud2.protocol = 'potreeconverter';
    pointcloud2.url = 'http://localhost:8080/examples/Metro/AperiCloud';
    // set size to 1
    pointcloud2.pointSize = 1;

    function onLayerReady2() {
        pointcloud2.visible = false;
        pointcloud2.bboxes.visible = false;

        // add GUI entry
        menuGlobe.addImageryLayerGUI(pointcloud2);
    }

    itowns.View.prototype.addLayer.call(view, pointcloud2).then(onLayerReady2);


    // LOAD PLY SURFACE
    loader = new itowns.THREE.PLYLoader();
    loader.load('http://localhost:8080/examples/Metro/poisson_4978_bin.ply',
    function loadPly(geometry) {
        var mesh;
        var meshLayer;

        // create mesh
        mesh = new itowns.THREE.Mesh(geometry, result.material);
        mesh.position.copy(new itowns.THREE.Vector3().set(4200000, 178000, 4780000));
        mesh.updateMatrixWorld();
        // create layer
        meshLayer = new itowns.GeometryLayer('Surface', mesh);
        meshLayer.update = function _() {};
        meshLayer.name = 'Mesh Layer';
        meshLayer.overrideMaterials = true;  // custom cesium shaders are not functional
        meshLayer.type = 'geometry';
        meshLayer.visible = true;
        view.addLayer(meshLayer);
        mesh.layer = meshLayer.id;
        // add GUI entry
        menuGlobe.addImageryLayerGUI(meshLayer);
    });

    folder = menuGlobe.gui.addFolder('ControlsSwitcher');
    folder.add({ immersive: true }, 'immersive').onChange(function switchMode(/* value */) {
        view.controls.switchMode();
    });
});

exports.view = view;
exports.initialPosition = positionOnGlobe;

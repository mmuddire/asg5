import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

class MinMaxGUIHelper {
    constructor(obj, minProp, maxProp, minDif) {
        this.obj = obj;
        this.minProp = minProp;
        this.maxProp = maxProp;
        this.minDif = minDif;
    }
    get min() {
        return this.obj[this.minProp];
    }
    set min(v) {
        this.obj[this.minProp] = v;
        this.obj[this.maxProp] = Math.max(this.obj[this.maxProp], v + this.minDif);
    }
    get max() {
        return this.obj[this.maxProp];
    }
    set max(v) {
        this.obj[this.maxProp] = v;
        this.min = this.min;
    }
}

class ColorGUIHelper {
    constructor(object, prop) {
        this.object = object;
        this.prop = prop;
    }
    get value() {
        return `#${this.object[this.prop].getHexString()}`;
    }
    set value(hexString) {
        this.object[this.prop].set(hexString);
    }
}

function main() {
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.setSize( window.innerWidth, window.innerHeight );
    //renderer.setClearColor(new THREE.Color('black'));

    // Camera setup
    const fov = 45;
    const aspect = 2;
    const near = 0.1;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 10, 20);

    // OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 5, 0);
    controls.update();

    const scene = new THREE.Scene();

    // GUI setup
    const gui = new GUI();
    const cameraHelper = new MinMaxGUIHelper(camera, 'near', 'far', 0.1);
    
    // Camera controls
    const folderC = gui.addFolder("Camera");
    folderC.add(camera, 'fov', 1, 180).onChange(updateCamera);
    folderC.add(cameraHelper, 'min', 0.1, 50, 0.1).name('near').onChange(updateCamera);
    folderC.add(cameraHelper, 'max', 0.1, 50, 0.1).name('far').onChange(updateCamera);
    folderC.close();

    function updateCamera() {
        camera.updateProjectionMatrix();
    }

    //skybox
    const loaderSky = new THREE.CubeTextureLoader();
        const textureSky = loaderSky.load([
            'resources/sky cubemap/left.jpg',
            'resources/sky cubemap/right.jpg',
            'resources/sky cubemap/top.jpg',
            'resources/sky cubemap/bottom.jpg',
            'resources/sky cubemap/back.jpg',
            'resources/sky cubemap/front.jpg',
        ]);
        scene.background = textureSky;

    // Floor
    const planeSize = 200;
    const loader = new THREE.TextureLoader();
    const texture = loader.load('https://threejs.org/manual/examples/resources/images/checker.png');
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.repeat.set(planeSize / 2, planeSize / 2);

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(planeSize, planeSize),
        new THREE.MeshPhongMaterial({
            map: texture,
            side: THREE.DoubleSide
        })
    );
    floor.rotation.x = Math.PI * -0.5;
    scene.add(floor);

    // Normal cube
    const cubeSize = 4;
    const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const cubeMat = new THREE.MeshPhongMaterial({ color: '#8AC' });
    const mesh = new THREE.Mesh(cubeGeo, cubeMat);
    mesh.position.set(cubeSize + 1, cubeSize / 2, 0);
    scene.add(mesh);

    // Sphere 
    const sphereRadius = 3;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 32, 16);
    const sphereMat = new THREE.MeshPhongMaterial({ color: '#CA8' });
    const mesh2 = new THREE.Mesh(sphereGeo, sphereMat);
    mesh2.position.set(sphereRadius - 1, sphereRadius + 2, -9);
    scene.add(mesh2);

    // Rotating Cube
    const cubeTexture = new THREE.TextureLoader().load('https://threejs.org/manual/examples/resources/images/wall.jpg');
    cubeTexture.colorSpace = THREE.SRGBColorSpace;
    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshPhongMaterial({ map: cubeTexture })
    );
    cube.position.y = 1;
    scene.add(cube);

    // 3D Tree
    new MTLLoader().load('resources/tree/materials.mtl', mtl => {
        mtl.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(mtl);
        objLoader.load('resources/tree/model.obj', root => {
            root.position.set(-7.5, 7.5, 0);
            root.scale.set(2, 2, 2);
            scene.add(root);
        });
    });

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1);
    const hemisphereLight = new THREE.HemisphereLight(0xB1E1FF, 0xB97A20, 1);
    
    // Directional Light
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    directionalLight.position.set(0, 10, 0);
    directionalLight.target.position.set(-5, 0, 0);
    scene.add(directionalLight);
    scene.add(directionalLight.target);

    scene.add(ambientLight, hemisphereLight);

    // Lighting GUI controls
    const folderA = gui.addFolder("Ambient Light");
    folderA.addColor(new ColorGUIHelper(ambientLight, 'color'), 'value').name('Color');
    folderA.add(ambientLight, 'intensity', 0, 5, 0.01).name('Intensity');
    folderA.open();
    
    const folderH = gui.addFolder("Hemisphere Light");
    folderH.addColor(new ColorGUIHelper(hemisphereLight, 'color'), 'value').name('Sky Color');
    folderH.addColor(new ColorGUIHelper(hemisphereLight, 'groundColor'), 'value').name('Ground Color');
    folderH.add(hemisphereLight, 'intensity', 0, 5, 0.01).name('Intensity');
    folderH.open();

    // Directional Light GUI controls
    const folderD = gui.addFolder("Directional Light");
    folderD.addColor(new ColorGUIHelper(directionalLight, 'color'), 'value').name('Color');
    folderD.add(directionalLight, 'intensity', 0, 5, 0.01).name('Intensity');
    folderD.add(directionalLight.target.position, 'x', -10, 10).name('Target X');
    folderD.add(directionalLight.target.position, 'z', -10, 10).name('Target Z');
    folderD.add(directionalLight.target.position, 'y', 0, 10).name('Target Y');
    folderD.open();

    // Animation loop
    function animate(time) {
        time *= 0.001;
        
        cube.rotation.x = time;
        cube.rotation.y = time * 0.5;
        
        if (resizeRendererToDisplaySize(renderer)) {
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }
        
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const needResize = canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight;
    if (needResize) {
        renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    }
    return needResize;
}

main();
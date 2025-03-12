import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

const waterVertexShader = `
    uniform float time;
    uniform float waveHeight;
    uniform float frequency;
    
    varying vec2 vUv;
    
    void main() {
        vUv = uv;
        vec3 pos = position;
        float wave = sin(pos.x * frequency + time) * cos(pos.z * frequency + time) * waveHeight;
        pos.y += wave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const waterFragmentShader = `
    varying vec2 vUv;
    uniform vec3 waterColor;
    
    void main() {
        float fresnel = pow(1.0 - dot(vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 0.0)), 2.0);
        vec3 color = mix(waterColor, vec3(1.0), fresnel * 0.5);
        gl_FragColor = vec4(color, 0.8);
    }
`;

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

class FogGUIHelper {
    constructor(fog, backgroundColor) {
        this.fog = fog;
        this.backgroundColor = backgroundColor;
        this._enabled = true;
    }
    get enabled() {
        return this._enabled;
    }
    set enabled(value) {
        this._enabled = value;
        if (this._enabled) {
            this.fog.near = 10; 
            this.fog.far = 75;
            this.backgroundColor.set(this.fog.color);
            
        } else {
            this.fog.near = Infinity; // disable fog
            this.fog.far = Infinity;
            this.backgroundColor.copy(scene.background); // keep skybox     
        }
    }
    get near() {
        return this.fog.near;
    }
    set near(v) {
        this.fog.near = v;
        this.fog.far = Math.max(this.fog.far, v);
    }
    get far() {
        return this.fog.far;
    }
    set far(v) {
        this.fog.far = v;
        this.fog.near = Math.min(this.fog.near, v);
    }
    get color() {
        return `#${this.fog.color.getHexString()}`;
    }
    set color(hexString) {
        this.fog.color.set(hexString);
        if (this._enabled) this.backgroundColor.set(hexString);
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
    //create scene
    const scene = new THREE.Scene();

    // Camera setup
    const fov = 45;
    const aspect = 2;
    const near = 0.1;
    const far = 1000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 10, 20);

    // OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 5, 0);
    controls.update();

    // Fog setup
    const fogColor = new THREE.Color('#ADD8E6'); 
    const fog = new THREE.Fog(fogColor, 10, 75);
    scene.fog = fog;
    scene.background = new THREE.Color(fogColor);

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

    //wave setup
    let waveTime = 0;
    const waveParams = {
        speed: 1.0,
        height: 0.5,
        frequency: 2.0
    };

    // Floor
    const planeSize = 100;

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(planeSize, planeSize),
        new THREE.MeshPhongMaterial({
            color: '#66f26f',
            side: THREE.DoubleSide
        })
    );
    floor.rotation.x = Math.PI * -0.5;
    scene.add(floor);

    const planters = new THREE.Group();

    // planter1
    const cubeSize = 4;
    const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const cubeMat = new THREE.MeshPhongMaterial({ color: '#331e06' });
    const planter1 = new THREE.Mesh(cubeGeo, cubeMat);
    planter1.position.set(-20, cubeSize / 2, 15);
    planters.add(planter1);

    // planter2
    const planter2 = new THREE.Mesh(cubeGeo, cubeMat);
    planter2.position.set(-20, cubeSize / 2, -15);
    planters.add(planter2);

    //3d tulips
    new MTLLoader().load('resources/tulips/materials.mtl', mtl => {
        mtl.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(mtl);
        objLoader.load('resources/tulips/model.obj', root => {
            root.position.set(-20, 5.5, 15);
            root.scale.set(3, 3, 3);
            planters.add(root);
        });
    });

    new MTLLoader().load('resources/tulips/materials.mtl', mtl => {
        mtl.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(mtl);
        objLoader.load('resources/tulips/model.obj', root => {
            root.position.set(-20, 5.5, -15);
            root.scale.set(3, 3, 3);
            planters.add(root);
        });
    });

    scene.add(planters);

    // Rotating Cube
    const cubeTexture = new THREE.TextureLoader().load('https://threejs.org/manual/examples/resources/images/wall.jpg');
    cubeTexture.colorSpace = THREE.SRGBColorSpace;
    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshPhongMaterial({ map: cubeTexture })
    );
    //cube.position.y = 1;
    cube.position.set(30, 1.5, 17);
    scene.add(cube);

    // 3D Tree
    new MTLLoader().load('resources/tree/materials.mtl', mtl => {
        mtl.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(mtl);
        objLoader.load('resources/tree/model.obj', root => {
            root.position.set(-10, 7.5, -27);
            root.scale.set(2, 2, 2);
            scene.add(root);
        });
    });

    

    const castle = new THREE.Group();

    // Towers
    castle.add(createTower(20, [-45, 0, -45]));
    castle.add(createTower(20, [45, 0, -45]));
    castle.add(createTower(20, [45, 0, 45]));
    castle.add(createTower(20, [-45, 0, 45]));
    scene.add(castle);

     // Walls
     castle.add(createWall(90, 10, [0, 5, -45], 0));
     castle.add(createWall(90, 10, [0, 5, 45], 0));
     castle.add(createWall(90, 10, [-45, 5, 0], Math.PI/2));
     castle.add(createWall(90, 10, [45, 5, 0], Math.PI/2));

     // Main Keep
    const keep = new THREE.Mesh(
        new THREE.BoxGeometry(10, 15, 20),
        new THREE.MeshPhongMaterial({ color: 0xccbea7 })
    );
    keep.position.y = 7.5;
    keep.position.x = -30;
    castle.add(keep);

    // Keep Roof
    const keepRoof = new THREE.Mesh(
        new THREE.ConeGeometry(12, 10, 8),
        new THREE.MeshPhongMaterial({ color: 0x8B4513 })
    );
    keepRoof.position.y = 20;
    keepRoof.position.x = -30;
    //keepRoof.position.set(20, -30, 0);
    castle.add(keepRoof);

    // statue
    const statue = new THREE.Mesh(
        new THREE.CylinderGeometry(4, 6, 2.5, 6),
        new THREE.MeshPhongMaterial({ color: 0x212020 })
    );
    statue.position.set(0, 1.25, 0);
    castle.add(statue);

     // Sphere 
     const sphereRadius = 3;
     const sphereGeo = new THREE.SphereGeometry(sphereRadius, 32, 16);
     const sphereMat = new THREE.MeshPhongMaterial({ color: '#8c65db' });
     const mesh2 = new THREE.Mesh(sphereGeo, sphereMat);
     mesh2.position.set(0, sphereRadius + 2.5, 0);
     castle.add(mesh2);

    // Courtyard Pool
    
    const pool = new THREE.Mesh(
        new THREE.TorusGeometry(12, 1, 20, 50),
        new THREE.MeshPhongMaterial({ color: 0x0099FF })
    );
    pool.rotation.x = Math.PI / 2;
    pool.position.set(22, 1, -22);
    castle.add(pool);

    const waterGeometry = new THREE.CircleGeometry(12, 64);
    const waterMaterial = new THREE.ShaderMaterial({
        vertexShader: waterVertexShader,
        fragmentShader: waterFragmentShader,
        uniforms: {
            time: { value: 0 },
            waveHeight: { value: waveParams.height },
            frequency: { value: waveParams.frequency },
            waterColor: { value: new THREE.Color(0x0099FF) }
        },
        transparent: true,
        side: THREE.DoubleSide
    });

    const waves = new THREE.Mesh(waterGeometry, waterMaterial);
    waves.rotation.x = -Math.PI / 2;
    waves.position.set(22, 2, -22); // Slightly raised position
    castle.add(waves);

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

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1);
    const hemisphereLight = new THREE.HemisphereLight(0xB1E1FF, 0x66f26f, 1);
    
    // Directional Light
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    directionalLight.position.set(0, 10, 0);
    directionalLight.target.position.set(-5, 0, 0);
    scene.add(directionalLight);
    scene.add(directionalLight.target);

    scene.add(ambientLight, hemisphereLight);

    // Fog GUI controls
    const fogGUIHelper = new FogGUIHelper(scene.fog, scene.background);
    const folderFog = gui.addFolder('Fog');
    folderFog.add(fogGUIHelper, 'enabled').name('Enabled');
    folderFog.add(fogGUIHelper, 'near', 1, 100).name('Near').listen();
    folderFog.add(fogGUIHelper, 'far', 1, 100).name('Far').listen();
    folderFog.addColor(fogGUIHelper, 'color').name('Color');
    folderFog.open();

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

    // Add GUI controls for waves
    const folderWater = gui.addFolder('Water Waves');
    folderWater.add(waveParams, 'speed', 0.1, 5.0).name('Speed');
    folderWater.add(waveParams, 'height', 0.1, 2.0).name('Height').onChange(v => {
        waterMaterial.uniforms.waveHeight.value = v;
    });
    folderWater.add(waveParams, 'frequency', 0.5, 5.0).name('Frequency').onChange(v => {
        waterMaterial.uniforms.frequency.value = v;
    });
    folderWater.close();

    // Animation loop
    function animate(time) {
        time *= 0.001;

        // Update waves
        waveTime += time * waveParams.speed;
        waterMaterial.uniforms.time.value = waveTime;
        
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

// Castle Construction Functions
function createTower(height = 15, position = [0, 0, 0]) {
    const group = new THREE.Group();
    
    // Main tower structure
    const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(2.5, 2.5, height, 12),
        new THREE.MeshPhongMaterial({ color: 0x636b7a })
    );
    tower.position.y = height/2;
    group.add(tower);

    // Roof
    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(4, 6, 8),
        new THREE.MeshPhongMaterial({ color: 0x8B4513 })
    );
    roof.position.y = height + 3;
    group.add(roof);

    // Battlements
    for(let i = 0; i < 4; i++) {
        const battlement = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 1.5, 1.5),
            new THREE.MeshPhongMaterial({ color: 0x405680 })
        );
        battlement.position.y = height - 2;
        battlement.position.x = Math.cos(i * Math.PI/2) * 3.5;
        battlement.position.z = Math.sin(i * Math.PI/2) * 3.5;
        group.add(battlement);
    }

    group.position.set(...position);
    return group;
}

function createWall(length, height, position, rotation) {
    const wallTexture = new THREE.TextureLoader().load('resources/stonewall.jpg');
    wallTexture.colorSpace = THREE.SRGBColorSpace;
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.magFilter = THREE.NearestFilter;
    wallTexture.repeat.set(9, 1);
    const wall = new THREE.Mesh(
        new THREE.BoxGeometry(length, height, 4),
        new THREE.MeshPhongMaterial({ map: wallTexture })
    );
    wall.position.set(...position);
    wall.rotation.y = rotation;
    return wall;
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
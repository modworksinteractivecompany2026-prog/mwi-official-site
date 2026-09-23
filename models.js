import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

const canvas = document.getElementById("viewerCanvas");
const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.getElementById("loadingText");
const loadingFill = document.getElementById("loadingFill");
const loadingError = document.getElementById("loadingError");

if (!canvas) {
    console.error("viewerCanvas not found.");
    throw new Error("Viewer canvas not found.");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
});

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 2)
);

renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(
    45,
    1,
    0.01,
    5000
);

const controls = new OrbitControls(
    camera,
    renderer.domElement
);

controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = true;
controls.enableZoom = true;
controls.enableRotate = true;

controls.minDistance = 0.1;
controls.maxDistance = 1000;

controls.target.set(0, 0, 0);


/* =========================
   LIGHTING
========================= */

scene.add(
    new THREE.HemisphereLight(
        0xffffff,
        0x202020,
        2.0
    )
);

const key = new THREE.DirectionalLight(
    0xffffff,
    2.2
);

key.position.set(5, 10, 8);
scene.add(key);

const fill = new THREE.DirectionalLight(
    0x4fd8ff,
    1.0
);

fill.position.set(-6, 4, -5);
scene.add(fill);

const rim = new THREE.PointLight(
    0x4fd8ff,
    18,
    30,
    2
);

rim.position.set(0, 3, -4);
scene.add(rim);


/* =========================
   RESIZE
========================= */

function resize() {

    const width = Math.max(
        1,
        canvas.clientWidth
    );

    const height = Math.max(
        1,
        canvas.clientHeight
    );

    renderer.setSize(
        width,
        height,
        false
    );

    camera.aspect = width / height;

    camera.updateProjectionMatrix();
}

window.addEventListener(
    "resize",
    resize
);

resize();


/* =========================
   FRAME MODEL
========================= */

function frameModel(model) {

    const box = new THREE.Box3()
        .setFromObject(model);

    const size = box.getSize(
        new THREE.Vector3()
    );

    const center = box.getCenter(
        new THREE.Vector3()
    );

    model.position.sub(center);

    const maxDim = Math.max(
        size.x,
        size.y,
        size.z
    );

    const fov = THREE.MathUtils.degToRad(
        camera.fov
    );

    const distance =
        (maxDim / 2) /
        Math.tan(fov / 2) *
        1.35;

    camera.position.set(
        distance * 0.9,
        distance * 0.45,
        distance
    );

    camera.near = Math.max(
        maxDim / 1000,
        0.01
    );

    camera.far = Math.max(
        maxDim * 100,
        1000
    );

    camera.updateProjectionMatrix();

    controls.target.set(
        0,
        0,
        0
    );

    controls.minDistance = Math.max(
        maxDim * 0.35,
        0.05
    );

    controls.maxDistance = Math.max(
        maxDim * 8,
        10
    );

    controls.update();
}


/* =========================
   LOADING
========================= */

function getI18nText(key, fallback) {
    try {
        const lang = window.MWiCurrentLanguage || localStorage.getItem("mwiLanguage") || "en";
        return (window.MWiI18n && window.MWiI18n[lang] && window.MWiI18n[lang][key]) || fallback;
    } catch (_) {
        return fallback;
    }
}

function setLoading(percent) {

    const safePercent = Math.max(
        0,
        Math.min(100, percent)
    );

    loadingFill.style.width =
        `${safePercent}%`;

    const template = getI18nText("loading", "Loading 3D model… 0%");
    loadingText.textContent =
        template.replace(/\d+%/, `${Math.round(safePercent)}%`);
}


function showError(message) {

    loadingText.textContent =
        getI18nText("model_error", "Model failed to load");

    loadingFill.style.width = "0%";

    loadingError.textContent =
        message;

    loadingError.style.display =
        "block";

    console.error(
        "MDR 3D Viewer:",
        message
    );
}


/* =========================
   GLB LOADER
========================= */

const loader = new GLTFLoader();

const modelPath =
    "../../assets/models/Car_1/2022_arash_imperium.glb";

console.log(
    "MDR Viewer loading:",
    modelPath
);


loader.load(

    modelPath,

    function (gltf) {

        console.log(
            "GLB loaded successfully:",
            gltf
        );

        const model =
            gltf.scene;

        model.traverse(
            function (object) {

                if (object.isMesh) {

                    object.castShadow = true;
                    object.receiveShadow = true;

                    if (object.material) {
                        object.material.needsUpdate = true;
                    }
                }
            }
        );

        scene.add(model);

        frameModel(model);

        setLoading(100);

        loadingText.textContent =
            "Model ready";

        setTimeout(
            function () {

                loadingScreen.style.opacity =
                    "0";

                setTimeout(
                    function () {

                        if (loadingScreen) {
                            loadingScreen.remove();
                        }

                    },
                    350
                );

            },
            300
        );
    },

    function (xhr) {

        if (xhr.lengthComputable) {

            const percent =
                (xhr.loaded / xhr.total) * 100;

            setLoading(percent);

        } else {

            const loadedMB =
                xhr.loaded / 1024 / 1024;

            const template = getI18nText("loading", "Loading 3D model… 0%");
            loadingText.textContent =
                template.replace(/0%/, `${loadedMB.toFixed(1)} MB`);
        }
    },

    function (error) {

        console.error(
            "GLB loading failed:",
            error
        );

        showError(
            "The 3D model could not be loaded. Check the GLB path, server connection, or browser console."
        );
    }
);


/* =========================
   RENDER LOOP
========================= */

function animate() {

    requestAnimationFrame(
        animate
    );

    controls.update();

    renderer.render(
        scene,
        camera
    );
}

animate();
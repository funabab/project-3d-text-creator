const EVENT_SCENE_LOADED = "loaded";
const EVENT_SCENE_READY = "ready";
const EVENT_SCENE_PROCESSING = "processing";
const EVENT_SCENE_FATAL_ERROR = "fatal_error";
const MIN_CAMERA_FOV = 14;
const DEFAULT_SCENE_TEXT_FONT = "Impact";
const SCENE_ZOOM_LIMIT = 20;
const SCENE_MAX_ANIMATION_SPEED = 30;

class Scene {
    constructor(canvasContainer) {
        this.elCanvasContainer = canvasContainer;
        this.needUpdate = true;
        this.isReady = false;
        this.textFontPath = {
            "Arial": "fonts/arial.json",
            "Calibri": "fonts/calibri.json",
            "Impact": "fonts/impact.json",
            "Roboto": "fonts/roboto.json",
            "Tahoma": "fonts/tahoma.json",
            "Times New Roman": "fonts/times-new-roman.json"
        };
        this.iconFontPath = {
            "fas": "fonts/icons/font-awesome-solid.json",
            "fab": "fonts/icons/font-awesome-brand.json"
        };
        this.iconsFonts = {};
        this.textFont = null;
        this.iconAlignment = "top";
        this.sceneZoom = 0;

        this.initialize();
        this.initializeEvents();
        this.render();
        this.eventCallacks = {};
        this.sceneMode = "object";
        this.animationModeSpeed = 0;
    }

    addEventListener(event, callback) {
        if (typeof this.eventCallacks[event] === "undefined") {
            this.eventCallacks[event] = [];
        }
        this.eventCallacks[event].push(callback);
    }

    emitEvent(event, params = []) {
        if (typeof this.eventCallacks[event] === "undefined") return;
        this.eventCallacks[event].forEach(callback => {
            callback(...params);
        });
    }

    initialize() {
        this.reflection = 100;
        this.textMesh = null;
        this.textReflectMesh = null;

        this.iconMesh = null;
        this.iconReflectMesh = null;
        this.prevText = "";
        this.prevIcon = "";
        this.sceneObjectDepth = 1.0;

        this.threeScene = new THREE.Scene();
        this.threeRenderer = new THREE.WebGLRenderer({
            preserveDrawingBuffer: true
        });
        this.threeRenderer.setClearColor(0xffffff);
        this.threeRenderer.setSize(this.elCanvasContainer.clientWidth, this.elCanvasContainer.clientHeight);
        this.threeCamera = new THREE.PerspectiveCamera(
            45, this.elCanvasContainer.clientWidth / this.elCanvasContainer.clientHeight, 1, 1000
        );

        this.threeEffectComposer = new THREE.EffectComposer(this.threeRenderer);
        this.threeEffectComposer.setSize(this.elCanvasContainer.clientWidth, this.elCanvasContainer.clientHeight);


        this.threeCameraControl = new THREE.OrbitControls(this.threeCamera, this.threeRenderer.domElement);
        this.threeCameraControl.target = new THREE.Vector3(0, 1, 0);
        this.threeCameraControl.maxPolarAngle = Math.PI / 2;
        this.threeCameraControl.minPolarAngle = Math.PI / 4;
        this.threeCameraControl.enablePan = false;
        this.threeScene.add(this.threeCamera);


        window.scene = this.threeScene;
        window.three = THREE;

        this.threeCamera.position.set(0, 0, 35);
        this.threeCameraControl.update();
        this.elCanvasContainer.appendChild(this.threeRenderer.domElement);

        this.initializeMaterials();
        this.intializeLights();

        const groundPlaneGeo = new THREE.PlaneGeometry(100, 100, 100);
        this.groundPlaneMesh = new THREE.Mesh(groundPlaneGeo, this.getMaterial("groundPlane"));
        this.groundPlaneMesh.rotation.x = -Math.PI / 2;

        this.threeScene.add(this.groundPlaneMesh);
        this.initializeSceneEffects();
        this.initializeFonts();
    }

    initializeSceneEffects() {
        this.vignetteShader = {
            uniforms: {
                intensity: {value: 15.0},
                radius: {value: 1.0},
                color: {value: new THREE.Vector4(0.6, 0.6, 0.6, 1)},
                tDiffuse: {value: null}
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                uniform float intensity;
                uniform float radius;
                uniform vec4 color;
                uniform sampler2D tDiffuse;

                void main() {
                    vec2 uv = vUv;
                    uv *= 1.0 - uv.yx; //vec2(1.0)- uv.yx; -> 1.-u.yx; Thanks FabriceNeyret !
                    float vig = uv.x * uv.y * intensity; // multiply with sth for intensity
                    vig = pow(vig, radius); // change pow for modifying the extend of the  vignette
                    gl_FragColor.rgb = (texture2D(tDiffuse, vUv) * vec4(mix(mix(vec3(1.0), color.rgb, color.a), vec3(1.0), vig), 1.0)).rgb;
                }
            `
        }
        const shaderPass = new THREE.ShaderPass(new THREE.ShaderMaterial(this.vignetteShader));
        shaderPass.renderToScreen = true;

        this.threeSceneRenderPass = new THREE.SSAARenderPass(this.threeScene, this.threeCamera, this.threeRenderer.getClearColor().getHex(), 1.0);

        this.threeEffectComposer.addPass(this.threeSceneRenderPass);
        this.threeEffectComposer.addPass(shaderPass);
    }

    initializeMaterials() {
        this.materials = {
            text: new THREE.MeshPhongMaterial({
                color: "blue",
                shininess: 100,
            }),
            icon: new THREE.MeshPhongMaterial({
                color: "blue",
                shininess: 100,
            }),
            groundPlane: new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                fog: false,
                opacity: 0.9
            })
        };
    }

    intializeLights() {
        const lights = [];
        lights[ 0 ] = new THREE.PointLight( 0xffffff, 1, 0 );
        lights[ 1 ] = new THREE.PointLight( 0xffffff, 1, 0 );
        lights[ 2 ] = new THREE.PointLight( 0xffffff, 1, 0 );

        lights[ 0 ].position.set( 0, 200, 0 );
        lights[ 1 ].position.set( 100, 200, 100 );
        lights[ 2 ].position.set( - 100, - 200, - 100 );

        this.threeSceneAmbientLight = new THREE.AmbientLight(0x0f0f0f);

        this.threeScene.add( lights[ 0 ] );
        this.threeScene.add( lights[ 1 ] );
        this.threeScene.add( lights[ 2 ] );
        this.threeScene.add(this.threeSceneAmbientLight);
    }

    initializeFonts() {
        new Promise((resolve, reject) => {
            const fontLoadManager = new THREE.LoadingManager(resolve, () => {}, reject);
            const fontLoader = new THREE.FontLoader(fontLoadManager);
            
            Object.keys(this.iconFontPath).forEach(key => {
                fontLoader.load(
                    this.iconFontPath[key],
                    font => {
                        this.iconsFonts[key] = font
                    }, null
                );
            });
            fontLoader.load(
                "fonts/icons/font-awesome-solid.json",
                font => {
                    this.iconFont = font
                }, null
            );

            fontLoader.load(
                this.textFontPath[DEFAULT_SCENE_TEXT_FONT],
                font => {
                    this.textFont = font;
                }
            );

        }).then(() => {
            this.isReady = true;
            this.emitEvent(EVENT_SCENE_LOADED, [
                Object.keys(this.textFontPath),
                DEFAULT_SCENE_TEXT_FONT
            ]);
            this.emitEvent(EVENT_SCENE_READY);
        }).catch(err => {
            console.log(err);
            this.emitEvent(EVENT_SCENE_FATAL_ERROR);
        });
    }

    initializeEvents() {
        window.addEventListener("resize", this.onWindowResize.bind(this));
        this.elCanvasContainer.addEventListener("mousemove", this.update.bind(this));
        const onFullScreenChange = event => {
            const fullScreenElement = document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || null;
            if (fullScreenElement) {
                this.sceneMode = "animation";
                this.threeCameraControl.autoRotate = this.animationModeSpeed > 0;
            } else {
                this.sceneMode = "object";
                this.threeCameraControl.autoRotate = false;
            }
        }

        if (document.body.webkitRequestFullscreen)
            document.addEventListener("webkitfullscreenchange", onFullScreenChange);
        else if (document.body.mozRequestFullScreen)
            document.addEventListener("mozfullscreenchange", onFullScreenChange);
        else if (document.body.msRequestFullscreen)
            document.addEventListener("MSFullscreenChange", onFullScreenChange)
        else
            document.addEventListener("fullscreenchange", onFullScreenChange);
    }

    getMaterial(name) {
        if (typeof this.materials[name] === "undefined") {
            console.error(`Material ${name} does not exists`, this.materials);
            return null;
        }
        return this.materials[name];
    }

    onWindowResize() {
        this.threeCamera.aspect = this.elCanvasContainer.clientWidth / this.elCanvasContainer.clientHeight;
        this.threeCamera.updateProjectionMatrix();
        this.threeRenderer.setSize(this.elCanvasContainer.clientWidth, this.elCanvasContainer.clientHeight);
        this.threeEffectComposer.setSize(this.elCanvasContainer.clientWidth, this.elCanvasContainer.clientHeight);
        this.update();
    }

    update() {
        this.needUpdate = true;
    }

    render() {
        if ((this.needUpdate && this.isReady) || this.sceneMode === "animation") {
            this.threeCameraControl.update();
            this.threeEffectComposer.render()
            this.needUpdate = false;
        }
        window.requestAnimationFrame(this.render.bind(this));
    }

    updateReflectionText() {
        if (!this.isReady || !this.reflection === 0 || this.textMesh == null) return;
        if (this.textReflectMesh == null) {
            this.textReflectMesh = this.textMesh.clone();
            this.textReflectMesh.rotation.set(Math.PI, Math.PI * 2, 0);
            this.threeScene.add(this.textReflectMesh);
        } else {
            this.textReflectMesh.geometry = this.textMesh.geometry;
        }
    }

    updateReflectionIcon() {
        if (!this.isReady || !this.reflection === 0 || this.iconMesh == null) return;
        if (this.iconReflectMesh == null) {
            this.iconReflectMesh = this.iconMesh.clone();        
            this.iconReflectMesh.rotation.set(Math.PI, Math.PI * 2, 0);
            this.threeScene.add(this.iconReflectMesh);
        } else {
            this.iconReflectMesh.geometry = this.iconMesh.geometry;
        }
    }

    updatePositions() {
        if (this.iconMesh != null) {
            if (this.textMesh == null) {
                this.iconMesh.position.set(0, Math.abs(this.iconMesh.geometry.boundingBox.min.y), 0);
                if (this.iconReflectMesh != null)
                    this.iconReflectMesh.position.set(0, this.iconMesh.geometry.boundingBox.min.y, 0);
            } else {
                let iX = 0, iY = 0, iRX = 0, iRY = 0;
                if (this.iconAlignment === "top") {
                    iY = 4;
                    iRY = -4;
                } else if (this.iconAlignment === "left") {
                    iX = iRX = this.textMesh.geometry.boundingBox.min.x - 2;
                    iY = Math.abs(this.iconMesh.geometry.boundingBox.min.y);
                    iRY = this.iconMesh.geometry.boundingBox.min.y;
                } else if (this.iconAlignment === "right") {
                    iX = iRX = this.textMesh.geometry.boundingBox.max.x + 2;
                    iY = Math.abs(this.iconMesh.geometry.boundingBox.min.y);
                    iRY = this.iconMesh.geometry.boundingBox.min.y;
                }
                this.iconMesh.position.set(iX, iY, 0);
                if (this.iconReflectMesh != null)
                    this.iconReflectMesh.position.set(iRX, iRY, 0);
            }
        }

        if (this.textMesh != null) {
            this.textMesh.position.set(0, Math.abs(this.textMesh.geometry.boundingBox.min.y), 0);
            if (this.textReflectMesh != null) {
                this.textReflectMesh.position.set(0, this.textMesh.geometry.boundingBox.min.y, 0);
            }
        }
    }

    updateCameraBounds() {
        const bounds = this.textMesh != null ? this.textMesh.geometry.boundingBox : (this.iconMesh != null ? this.iconMesh.geometry.boundingBox : null);
        if (!this.isReady || bounds == null) return;
        this.threeCameraControl.target = new THREE.Vector3(0, 2, 0);
        this.threeCamera.fov = Math.max(bounds.max.x - bounds.min.x + (this.textMesh !== null && this.iconMesh !== null && (this.iconAlignment === "left" || this.iconAlignment === "right") ? 4 : 0), MIN_CAMERA_FOV) + SCENE_ZOOM_LIMIT * this.sceneZoom;
        if (this.textMesh !== null && this.iconMesh !== null) {
            this.threeCameraControl.target.x = this.iconAlignment === "left" ? this.iconMesh.geometry.boundingBox.min.x : (this.iconAlignment === "right" ? Math.abs(this.iconMesh.geometry.boundingBox.max.x) : 0);
        }
        this.threeCamera.updateProjectionMatrix();
        this.threeCameraControl.update();
        this.update();
    }

    isSceneReady() {
        if (!this.isReady)
            console.error("SCENE: not ready!");
        return this.isReady;
    }
    

    setText(text, callUpdate = true) {
        if (typeof text === "undefined" || text === null) text = this.prevText
        text = text.trim();
        if (!this.isSceneReady()) return;
        this.prevText = text;

        if (text.length === 0) {
            if (this.textMesh != null) {
                this.threeScene.remove(this.textMesh);
                this.textMesh = null;


                if (this.textReflectMesh != null) {
                    this.threeScene.remove(this.textReflectMesh);
                    this.textReflectMesh = null;
                }

                this.updatePositions();
                this.updateCameraBounds();
            }
            return;
        }

        const textGeo = new THREE.TextGeometry(text, {
            font: this.textFont,
            size: 2,
            height: this.sceneObjectDepth,
            bevelEnabled: true,
            bevelThickness: 0.1,
            bevelSize: 0.1,

        });
        textGeo.computeBoundingBox();
        textGeo.center();

        if (this.textMesh == null) {
            this.textMesh = new THREE.Mesh(textGeo, this.getMaterial("text"));
            this.threeScene.add(this.textMesh);
        } else {
            this.textMesh.geometry = textGeo;
        }

        this.updateReflectionText();
        this.updatePositions();
        if (callUpdate)
            this.updateCameraBounds();
    }

    setIcon(icon, callUpdate = true) {
        if (typeof icon === "undefined" || icon === null) icon = this.prevIcon;
        if (typeof this.iconsFonts[icon.type] === "undefined") return;
        icon.value = icon.value.trim();
        if (!this.isSceneReady()) return;
        this.prevIcon = icon;
        
        if (icon.value.length === 0) {
            if (this.iconMesh != null) {
                this.threeScene.remove(this.iconMesh);
                this.iconMesh = null;

                if (this.iconReflectMesh != null) {
                    this.threeScene.remove(this.iconReflectMesh);
                    this.iconReflectMesh = null;
                }

                this.updatePositions();
                this.updateCameraBounds();
            }
            return;
        }

        const iconGeo = new THREE.TextGeometry(icon.value, {
            font: this.iconsFonts[icon.type],
            size: 2,
            height: this.sceneObjectDepth,
            bevelEnabled: true,
            bevelThickness: 0.1,
            bevelSize: 0.1,
        });
        iconGeo.computeBoundingBox();
        iconGeo.center();

        if (this.iconMesh == null) {
            this.iconMesh = new THREE.Mesh(iconGeo, this.getMaterial("icon"));
            this.threeScene.add(this.iconMesh);
        } else {
            this.iconMesh.geometry = iconGeo;
        }

        this.updateReflectionIcon();
        this.updatePositions();
        if (callUpdate)
            this.updateCameraBounds();
    }

    setTextColor(color) {
        const material = this.getMaterial("text");
        material.color = new THREE.Color(color);
        this.update();
    }

    setIconColor(color) {
        const material = this.getMaterial("icon");
        material.color = new THREE.Color(color);
        this.update();
    }

    setIconAlignment(alignment) {
        const alignments = ["top", "left", "right"];
        if (alignments.indexOf(alignment) !== -1) {
            this.iconAlignment = alignment;
            this.updatePositions();
            this.updateCameraBounds();
        }
    }

    setBackgroundColor(color) {
        this.threeRenderer.setClearColor(color);
        this.threeSceneRenderPass.clearColor = color;
        this.getMaterial("groundPlane").color = new THREE.Color(color);
        this.update();
    }

    setTextFont(fontName) {
        if (typeof this.textFontPath[fontName] !== "undefined") {
            const fontLoader = new THREE.FontLoader();
            fontLoader.load(this.textFontPath[fontName], (font) => {
                this.textFont = font;
                this.setText(null, false);
                this.updateCameraBounds();
                this.emitEvent(EVENT_SCENE_READY);
            }, null, () => {
                this.emitEvent(EVENT_SCENE_READY);
            });
            this.emitEvent(EVENT_SCENE_PROCESSING);
        }
    }

    setVigenetteColor(color) {
        const c = new THREE.Color(color);
        // const a = (color & 0x000000ff) / 255.0;
        const a = 1.0;
        this.vignetteShader.uniforms.color.value = new THREE.Vector4(c.r, c.g, c.b, a);
    }

    setFullscreen() {
       if (this.elCanvasContainer.mozRequestFullScreen) {
           this.elCanvasContainer.mozRequestFullScreen();
       } else if (this.elCanvasContainer.webkitRequestFullscreen) {
           this.elCanvasContainer.webkitRequestFullscreen();
       } else if (this.elCanvasContainer.msRequestFullscreen) {
           this.elCanvasContainer.msRequestFullscreen();
       } else {
            this.elCanvasContainer.requestFullscreen();
        }
    }

    exitFullscreen() {
        if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else {
             document.exitFullscreen()
         }
    }

    toogleFullscreen() {
        let isFullscreen = false;
        if (typeof document.webkitIsFullScreen !== "undefined")
            isFullscreen = document.webkitIsFullScreen;
        else if (typeof document.mozFullScreen !== "undefined")
            isFullscreen = document.mozFullScreen;
        else
            isFullscreen = document.fullscreen;
        if (isFullscreen)
            this.exitFullscreen();
        else
            this.setFullscreen();
    }

    setAnimationModeSpeed(speed) {
        speed = Math.max(0, Math.min(SCENE_MAX_ANIMATION_SPEED, speed));
        this.animationModeSpeed = 2.0 * speed;
        if (this.animationModeSpeed == 0) {
            if (this.threeCameraControl.autoRotate)
                this.threeCameraControl.autoRotate = false;
        } else {
            this.threeCameraControl.autoRotateSpeed = this.animationModeSpeed;
            if (!this.threeCameraControl.autoRotate && this.sceneMode === "animation")
                this.threeCameraControl.autoRotate = true;
        }
    }

    setSceneZoom(range) {
        range = Math.max(0, Math.min(range, 100));
        this.sceneZoom = range / 100.0;
        this.updateCameraBounds();
    }

    setVigenetteRange(range) {
        range = Math.max(0, Math.min(range, 100));
        this.vignetteShader.uniforms.radius.value = range === 0 ? 0.0 : range / 100.0;
        this.update();
    }

    setReflecttion(reflectionRange) {
        reflectionRange = Math.max(0, Math.min(reflectionRange, 100));
        this.reflection = reflectionRange;
        const groundPlaneMaterial = this.getMaterial("groundPlane");
        groundPlaneMaterial.opacity = this.reflection / 100.0;
        this.update();
    }

    setAmbientLightColor(color) {
        this.threeSceneAmbientLight.color = new THREE.Color(color);
        this.update();
    }

    setSceneObjectDepth(range) {
        if (!this.isReady) return;
        range = Math.max(1, Math.min(range, 100));
        this.sceneObjectDepth = (range / 100.0) * 2.0;
        this.setText(null, false);
        this.setIcon(null, false);
        this.updateCameraBounds();
    }

}
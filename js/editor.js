PROP_TEXT = "text";
PROP_TEXT_FONT_NAME = "text_font_name";
PROP_ICON_ALIGNMEMT = "icon_alignment";
PROP_ICON = "icon";
PROP_BACKGROUND_COLOR = "background_color";
PROP_VIGNETTE_RANGE = "vignette_range";
PROP_VIGNETTE_COLOR = "vignette_color";
PROP_REFLECTION_RANGE = "reflection_range";
PROP_SCENE_ZOOM = "scene_zoom";
PROP_TEXT_COLOR = "text_color";
PROP_ICON_COLOR = "icon_color";
PROP_SCENE_AMBIENT_COLOR = "scene_ambient_color";
PROP_SCENE_OBJECT_DEPTH = "scene_object_depth";
PROP_SCENE_ANIMATION_SPEED = "scene_animation_speed";

EDITOR_HASH_EXPORT_VERSION = 1.0;

class Editor {
    constructor(scene) {
        this.scene = scene;
        this.iconsData = null;
        this.properties = this.urlHashData2SceneData() || {};
        this.initialize();
        this.updatePropElementValues();
    }

    sceneData2UrlHashData() {
        const data = Object.assign({}, this.properties);
        data.__3dtc_export_version = EDITOR_HASH_EXPORT_VERSION;
    
        let result = "";
        try {
            result = btoa(JSON.stringify(data));
        } catch(e) {
            console.error(e);
        }
        return result;
    }

    urlHashData2SceneData() {
        let hash = location.hash.trim();
        if (hash.length === 0) return null;
        hash = hash.slice(1);
        let data = null;
        try {
            data = JSON.parse(atob(hash));
            if (typeof data.__3dtc_export_version === "undefined") data = null;
        } finally {
            return data;
        }
    }

    updatePropElementValues() {
        if (Object.keys(this.properties).length > 0 && this.properties.__3dtc_export_version === 1.0) {
            for(let key in this.properties) {
                switch(key) {
                    case PROP_TEXT:
                        this.elMainTextInput.value = this.properties[PROP_TEXT];
                        break;
                    case PROP_ICON_ALIGNMEMT:
                        Array.from(document.querySelectorAll('input[name="main-icon-alignment"]')).forEach(checkbox => {
                            checkbox.checked = checkbox.value === this.properties[PROP_ICON_ALIGNMEMT];
                            if (checkbox.checked) {
                                this.scene.setIconAlignment(checkbox.value);
                            }
                        });
                        break;
                    case PROP_BACKGROUND_COLOR:
                        this.elSceneBgColorInput.value = this.properties[PROP_BACKGROUND_COLOR];
                        break;
                    case PROP_ICON_COLOR:
                        this.elMainIconColorInput.value = this.properties[PROP_ICON_COLOR];
                        break;
                    case PROP_TEXT_COLOR:
                        this.elMainTextColorInput.value = this.properties[PROP_TEXT_COLOR];
                        break;
                    case PROP_REFLECTION_RANGE:
                        this.elSceneReflectionRangeInput.value = this.properties[PROP_REFLECTION_RANGE];
                        break;
                    case PROP_SCENE_AMBIENT_COLOR:
                        this.elSceneAmbientLightColorInput.value = this.properties[PROP_SCENE_AMBIENT_COLOR];
                        break;
                    case PROP_SCENE_OBJECT_DEPTH:
                        this.elSceneObjectDepthRangeInput.value = this.properties[PROP_SCENE_OBJECT_DEPTH];
                        break;
                    case PROP_SCENE_ZOOM:
                        this.elSceneZoomRangeInput.value = this.properties[PROP_SCENE_ZOOM];
                        break;
                    case PROP_VIGNETTE_COLOR:
                        this.elSceneVigenetteColorInput.value = this.properties[PROP_VIGNETTE_COLOR];
                        break;
                    case PROP_VIGNETTE_RANGE:
                        this.elSceneVignetteRangeInput.value = this.properties[PROP_VIGNETTE_RANGE];
                        break;
                    case PROP_SCENE_ANIMATION_SPEED:
                        Array.from(this.elSceneAnimationSpeedSelectInput.options).forEach(option => {
                            if (option.value === this.properties[PROP_SCENE_ANIMATION_SPEED])
                                option.selected = true;
                        });
                        break;
                }
            }
        }
    }

    initialize() {
        this.elSceneEditorContainer = document.getElementById("scene-editor-container");
        this.elMainTextInput = document.getElementById("main-text-input");
        this.elMainIconSelectInput = document.getElementById("main-icon-select-input");
        this.elMainTextFontSelectInput = document.getElementById("main-text-font-select-input");
        this.elSceneBgColorInput = document.getElementById("scene-bg-color-input");
        this.elSceneVignetteRangeInput = document.getElementById("scene-vigenette-range-input");
        this.elSceneVigenetteColorInput = document.getElementById("scene-vigenette-color-input");
        this.elSceneReflectionRangeInput = document.getElementById("scene-reflection-range-input");
        this.elSceneAmbientLightColorInput = document.getElementById("scene-ambient-light-color-input");
        this.elSceneZoomRangeInput = document.getElementById("scene-zoom-range-input");
        this.elMainTextColorInput = document.getElementById("main-text-color-input");
        this.elMainIconColorInput = document.getElementById("main-icon-color-input");
        this.elBtnSceneCapture = document.getElementById("btn-scene-capture");
        this.elBtnSceneFullscreen = document.getElementById("btn-scene-fullscreen");
        this.elSceneCaptureContainer = document.getElementById("scene-capture-container");
        this.elSceneObjectDepthRangeInput = document.getElementById("scene-object-depth-range-input");
        this.elSceneAnimationSpeedSelectInput = document.getElementById("scene-animation-speed-select-input");

        this.elBtnShareCreation = document.getElementById("btn-share-creation");
        this.elShareCreationLinkInput = document.getElementById("share-creation-link-input");
        this.elBtnCopyShareCreationLink = document.getElementById("btn-copy-share-creation-link");
        this.elDialogShareCreation = document.getElementById("dialog-share-creation");

        dialogPolyfill.registerDialog(this.elDialogShareCreation);

        this.elSceneLoadingContainer = document.getElementById("scene-loading-container");

        fetch(new Request("resources/icons.json")).then(res => {
            if (res.ok) {
                return res.json();
            }
        }).then(json => {
            this.initializeIconSelectPopup(json);
            this.initializeEvents();
        }).catch(err => {
            console.error(err);
        });
    }

    initializeIconSelectPopup(iconsData) {
        this.iconsData = iconsData;

        Object.keys(this.iconsData).sort((a, b) => {
            const value1 = a.substr(a.indexOf("-") + 1);
            const value2 = b.substr(a.indexOf("-") + 1);
            if (value1 > value2) {
                return 1;
            } else if (value1 < value2) {
                return -1;
            } else {
                return 0;
            }
        }).forEach(key => {
            const split = key.split("-");
            const type = split[0];
            const name = split.slice(1).join(" ");
            let font = "Arial, Helvetica, sans-serif;";
            if (type == "fas") {
                font = '"FontAwesomeSolid", ' + font;
            } else if (type === "fab") {
                font = '"FontAwesomeBrand", ' + font;
            }
            const elOption = document.createElement("option");
            elOption.setAttribute("data-font-type", type);
            elOption.style = "font-family: " + font;
            if (typeof this.properties[PROP_ICON] !== "undefined" && decodeURI(this.properties[PROP_ICON].value) === this.iconsData[key]) {
                elOption.selected = true;
                this.elMainIconSelectInput.style = elOption.getAttribute("style");
            }
            elOption.innerText = name + " " + this.iconsData[key];
            this.elMainIconSelectInput.append(elOption);
        });
    }

    initializeEvents() {
        const oMainTextUpdate = (text) => {
            this.properties[PROP_TEXT] = encodeURI(text);
            this.scene.setText(text);
        };

        const onMainIconSelectUpdate = () => {
            const selectedOption = this.elMainIconSelectInput.selectedOptions[0];
            this.elMainIconSelectInput.style = selectedOption.getAttribute("style");
            const valueSplit = selectedOption.innerText.split(" ");
            const value = valueSplit[valueSplit.length - 1];
            const type = selectedOption.getAttribute("data-font-type");
            this.properties[PROP_ICON] = {
                type,
                value: encodeURI(value)
            };
            this.scene.setIcon({
                type,
                value
            });
        };

        const onMainTextFontUpdate = () => {   
            this.properties[PROP_TEXT_FONT_NAME] = this.elMainTextFontSelectInput.value;
            this.scene.setTextFont(this.properties[PROP_TEXT_FONT_NAME]);
        }

        this.scene.addEventListener("loaded", (fonts, default_font) => {
            const selectedFont = this.properties[PROP_TEXT_FONT_NAME] || default_font;
            fonts.forEach(font => {
                const elOption = document.createElement("option");
                elOption.innerText = font;
                if (font === selectedFont) {
                    elOption.selected = true;
                }
                this.elMainTextFontSelectInput.append(elOption);
            });
            oMainTextUpdate(this.elMainTextInput.value);
            onMainIconSelectUpdate();
            onMainTextFontUpdate();
        });

        this.elMainTextFontSelectInput.addEventListener("change", onMainTextFontUpdate);

        this.scene.addEventListener("ready", () => {
            this.elSceneLoadingContainer.removeAttribute("data-state");
            this.elSceneEditorContainer.removeAttribute("data-state");
        });

        this.scene.addEventListener("processing", () => {
            this.elSceneLoadingContainer.setAttribute("data-state", "loading");
            this.elSceneEditorContainer.setAttribute("data-state", "loading");

        });

        this.scene.addEventListener("fatal_error", () => {
            this.elSceneLoadingContainer.setAttribute("data-state", "error");
        });

        Array.from(document.querySelectorAll('input[name="main-icon-alignment"]')).forEach(element => {
            element.addEventListener("change", event => {
                if (event.target.checked) {
                    this.properties[PROP_ICON_ALIGNMEMT] = event.target.value;
                    this.scene.setIconAlignment(this.properties[PROP_ICON_ALIGNMEMT]);
                }
            });
        });


        Array.from(document.querySelectorAll(".editor-group-header a.editor-group-header-dropdown")).forEach(element => {
            element.addEventListener("click", event => {
                event.preventDefault();
                const target = element.parentElement.parentElement;

                if (target.hasAttribute("data-group-expanded")) {
                    target.removeAttribute("data-group-expanded");
                } else {
                    target.setAttribute("data-group-expanded", "true");
                }
            })
        });

        Array.from(document.querySelectorAll("a[data-tab-link]")).forEach(element => {
            element.addEventListener("click", event => {
                event.preventDefault();
                const target = document.getElementById(element.getAttribute("data-tab-for"));
                const targetParent = target.parentElement;
                targetParent.querySelector("div[data-active]").removeAttribute("data-active");
                target.setAttribute("data-active", true);

                element.parentElement.parentElement.querySelector("li[data-active]").removeAttribute("data-active");
                element.parentElement.setAttribute("data-active", true);

            });
        });

        new ClipboardJS(this.elBtnCopyShareCreationLink, {
            target: () => { return this.elShareCreationLinkInput }
        });

        this.elBtnShareCreation.addEventListener("click", event => {
            event.preventDefault();
            const url = new URL(location.pathname, location.origin);
            url.hash = this.sceneData2UrlHashData();
            this.elShareCreationLinkInput.value = url.href;
            this.elDialogShareCreation.showModal();
        });

        Array.from(document.querySelectorAll("dialog a[data-action-close-dialog]")).forEach(element => {
            element.addEventListener("click", event => {
                event.preventDefault();
                document.getElementById(element.getAttribute("data-action-for")).close();
            });
        });

        this.elMainTextInput.addEventListener("keyup", event => {
            if (typeof event.code !== "undefined" && event.code.toLocaleLowerCase() === "enter") {
                oMainTextUpdate(this.elMainTextInput.value);
            }
        });
        this.elMainTextInput.addEventListener("blur", () => {
            oMainTextUpdate(this.elMainTextInput.value);
        });

        this.elMainIconSelectInput.addEventListener("change", onMainIconSelectUpdate);

        this.elBtnSceneCapture.addEventListener("click", event => {
            event.preventDefault();
            if (!this.scene.isSceneReady()) return;
            const parent = this.elSceneCaptureContainer.parentElement;
            if (this.elSceneCaptureContainer.classList.contains("animate-capture"))
                this.elSceneCaptureContainer.classList.remove("animate-capture");
            const clone = this.elSceneCaptureContainer.cloneNode();
            parent.replaceChild(clone, this.elSceneCaptureContainer);
            this.elSceneCaptureContainer.classList.add("animate-capture");
            this.elSceneCaptureContainer = clone;

            this.scene.threeRenderer.domElement.toBlob(blob => {
                const date = new Date();
                const value = this.elMainTextInput.value.trim().replace(/\W+/g, "");
                const name = value.length === 0 ? "capture" : value;
                const filename = name + date.getFullYear() + "-" + 
                        ("0" + (date.getMonth() + 1)).slice(-2) + "-" + 
                        ("0" + date.getDate()).slice(-2) + "-" + 
                        ("0" + (date.getHours() + 1)).slice(-2) + "-" +
                        ("0" + (date.getMinutes() + 1)).slice(-2) + "-" +
                        ("0" + (date.getSeconds() + 1)).slice(-2);
                window.saveAs(blob, filename);
                this.elSceneCaptureContainer.classList.add("animate-capture");
            });
        });

        this.elBtnSceneFullscreen.addEventListener("click", event => {
            event.preventDefault();
            this.scene.toogleFullscreen();
        });

        const onSceneBgColorInputChange = () => {
            this.properties[PROP_BACKGROUND_COLOR] = this.elSceneBgColorInput.value;
            this.scene.setBackgroundColor(Utils.hexString2number(this.properties[PROP_BACKGROUND_COLOR]));
        };
        const onSceneVignetteRangeInputChange = () => {
            this.properties[PROP_VIGNETTE_RANGE] = this.elSceneVignetteRangeInput.value;
            this.scene.setVigenetteRange(parseInt(this.properties[PROP_VIGNETTE_RANGE]));
        };
        const onSceneVigenetteColorInputChange = () => {
            this.properties[PROP_VIGNETTE_COLOR] = this.elSceneVigenetteColorInput.value;
            this.scene.setVigenetteColor(Utils.hexString2number(this.properties[PROP_VIGNETTE_COLOR]));
        }
        const onSceneReflectionRangeInputChange = () => {
            this.properties[PROP_REFLECTION_RANGE] = this.elSceneReflectionRangeInput.value;
            this.scene.setReflecttion(parseInt(this.properties[PROP_REFLECTION_RANGE]));
        }
        const onSceneZoomRangeInputChange = () => {
            this.properties[PROP_SCENE_ZOOM] = this.elSceneZoomRangeInput.value;
            this.scene.setSceneZoom(parseInt(this.properties[PROP_SCENE_ZOOM]));
        }
        const onMainTextColorInputChange = () => {
            this.properties[PROP_TEXT_COLOR] = this.elMainTextColorInput.value;
            this.scene.setTextColor(Utils.hexString2number(this.properties[PROP_TEXT_COLOR]));
        }
        const onMainIconColorInputChange = () => {
            this.properties[PROP_ICON_COLOR] = this.elMainIconColorInput.value;
            this.scene.setIconColor(Utils.hexString2number(this.properties[PROP_ICON_COLOR]));
        }
        const onSceneAmbientLightColorInputChange = () => {
            this.properties[PROP_SCENE_AMBIENT_COLOR] = this.elSceneAmbientLightColorInput.value;
            this.scene.setAmbientLightColor(Utils.hexString2number(this.properties[PROP_SCENE_AMBIENT_COLOR]));
        }
        const onSceneObjectDepthRangeInput = () => {
            this.properties[PROP_SCENE_OBJECT_DEPTH] = this.elSceneObjectDepthRangeInput.value;
            this.scene.setSceneObjectDepth(parseInt(this.properties[PROP_SCENE_OBJECT_DEPTH]));
        };
        const onSceneAnimationSpeedSelectInputChange = () => {
            this.properties[PROP_SCENE_ANIMATION_SPEED] = this.elSceneAnimationSpeedSelectInput.value;
            this.scene.setAnimationModeSpeed(parseFloat(this.properties[PROP_SCENE_ANIMATION_SPEED]));
        }

        this.elSceneBgColorInput.addEventListener("change", onSceneBgColorInputChange);
        this.elSceneVignetteRangeInput.addEventListener("change", onSceneVignetteRangeInputChange);
        this.elSceneVigenetteColorInput.addEventListener("change", onSceneVigenetteColorInputChange);
        this.elSceneReflectionRangeInput.addEventListener("change", onSceneReflectionRangeInputChange);
        this.elSceneZoomRangeInput.addEventListener("change", onSceneZoomRangeInputChange);
        this.elSceneAmbientLightColorInput.addEventListener("change", onSceneAmbientLightColorInputChange);
        this.elSceneObjectDepthRangeInput.addEventListener("change", onSceneObjectDepthRangeInput);
        this.elSceneAnimationSpeedSelectInput.addEventListener("change", onSceneAnimationSpeedSelectInputChange);
        this.elMainTextColorInput.addEventListener("change", onMainTextColorInputChange);
        this.elMainIconColorInput.addEventListener("change", onMainIconColorInputChange);

        onSceneBgColorInputChange();
        onSceneVignetteRangeInputChange();
        onSceneVigenetteColorInputChange();
        onSceneReflectionRangeInputChange();
        onSceneZoomRangeInputChange();
        onSceneAmbientLightColorInputChange();
        onSceneObjectDepthRangeInput();
        onSceneAnimationSpeedSelectInputChange();
        onMainTextColorInputChange();
        onMainIconColorInputChange();

    }
}

class Utils {
    static hexString2number(hexString) {
        hexString = hexString.trim();
        if (hexString[0] != "#") {
            console.error("Not an hex string!");
            return 0;
        } else {
            return parseInt(hexString.slice(1), 16);
        }
    }
}
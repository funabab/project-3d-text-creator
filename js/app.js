class App {
    constructor() {
        const elCanvasContainer = document.getElementById("scene-container");
        this.scene = new Scene(elCanvasContainer);
        this.editor = new Editor(this.scene);
    }
}
(new App());
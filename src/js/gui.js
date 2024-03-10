const loadGUI = (index, removeObject) => {
    const object = {
        translation_x: 0.0,
        translation_y: 0.0,
        translation_z: 0.0,

        pitch: degToRad(0),
        yaw: degToRad(0),
        roll: degToRad(0),

        scale_x: 0.5,
        scale_y: 0.5,
        scale_z: 0.5,


        diffuse: [255, 255, 255],

        // TODO: select texture name automacally
        texture: textures['prototypebits_texture.png'],

        ambient: [0, 0, 0],

        specular: [255, 255, 255],

        shininess: 250,

        opacity: 1,
    };

    const objectFolder = gui.addFolder(`Object ${index}`);
    const translateFolder = objectFolder.addFolder('Translate');
    const rotateFolder = objectFolder.addFolder('Rotate');
    const scaleFolder = objectFolder.addFolder('Scale');
    const textureFolder = objectFolder.addFolder('Texture');

    const remove = objectFolder.addFolder('Remove');
    remove.add({
        removeButton: () => removeObject(index)
    }, 'removeButton').name('Remove Object');

    rotateFolder.add(object, "pitch", 0, 10, 0.1).name("Pitch");
    rotateFolder.add(object, "yaw", 0, 10, 0.1).name("Yaw");
    rotateFolder.add(object, "roll", 0, 10, 0.1).name("Roll");

    scaleFolder.add(object, "scale_x", 0, 10, 0.1).name("X");
    scaleFolder.add(object, "scale_y", 0, 10, 0.1).name("Y");
    scaleFolder.add(object, "scale_z", 0, 10, 0.1).name("Z");

    translateFolder.add(object, "translation_x", -10, 10, 0.1).name("X");
    translateFolder.add(object, "translation_y", -10, 10, 0.1).name("Y");
    translateFolder.add(object, "translation_z", -10, 10, 0.1).name("Z");

    textureFolder.addColor(object, "diffuse").name("Diffuse");

    textureFolder.addColor(object, "ambient").name("Ambient");

    textureFolder.addColor(object, "specular").name("Specular");
    
    textureFolder.add(object, "shininess", 0, 100).name("Shininess");

    textureFolder.add(object, "opacity", 0, 1).name("Opacity");

    textureFolder.add(object, "texture", Object.keys(textures)).name("Texture");

    return object;
};
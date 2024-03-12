// Declare variables for textures, objects in scene, objects list, and general index for objects.
let textures;
let objectsInScene = [];
let objectsList = [];
let objectGeneralIndex;

let toonFragmentShader = 0;

let lights = []
let LightsCounter = 1;

const firstLight = {
    positionX: -1.0,
    positionY: 3.0,
    positionZ: 5.0,
    intensity: 1.0,
    color: [255, 255, 255],
}

// Set the file path for the texture image.
// TODO: select texture name automacally
let texturePng = 'prototypebits_texture.png';

// TODO:
// Get canvas
const canvas = document.getElementById("engineScene");

// Create a new dat.GUI instance for graphical user interface controls.
gui = new dat.GUI();

// Define the main function asynchronously.
async function main() {
    // Reset arrays and index.
    objectsInScene = [];
    objectsList = [];
    objectGeneralIndex = -1;

    // Destroy existing GUI elements.
    destroyElements();

    // Reinitialize GUI.
    gui.destroy();
    gui = null;
    gui = new dat.GUI();

    // Get the file input element.
    const input = document.getElementById('input');
    const files = input.files;

    // Check if there are files selected.
    if (files.length > 0) {
        // Map file names from the input files.
        const fileNames = Array.from(files).map(file => file.name);
        console.log('Selected OBJ file names:', fileNames);

        // Call the EngineScene function with the file names to load the OBJ files.
        EngineScene(fileNames);
    } else {
        console.log('No OBJ files selected.');
    }
}

// Define an asynchronous function named EngineScene which takes objectsFileNames as input
async function EngineScene(objectsFileNames) {

    // Initialize the WebGL context and mesh program
    const {
        gl,
        meshProgramInfo
    } = initializeWorld();

    // Define the path to the objects
    const objectsPath = 'http://127.0.0.1:8080/obj/';

    // Array to store parsed object data
    const objs = [];

    // Append the objectsPath to each object filename
    objectsFileNames = objectsFileNames.map(objectReference => objectsPath + objectReference);

    // Load object data for each object file asynchronously
    for (const objectReference of objectsFileNames) {
        await loadObjectData(objectReference);
    }

    // Load camera configuration
    const {
        cameraTarget,
        cameraPosition,
        zNear,
        zFar
    } = loadCamera(objs);

    // Define an asynchronous function named loadObjectData which takes objectReference as input
    async function loadObjectData(objectReference) {
        // Fetch the object data from the provided objectReference
        const response = await fetch(objectReference);
        const obj_vertices = await response.text();

        // Parse the object data
        const obj = parseOBJ(obj_vertices);

        // Resolve relative URLs for materials
        const objURL = new URL(objectReference, window.location.href);

        // Fetch and parse material data
        const matTexts = [];
        for (const filename of obj.materialLibs) {
            const matURL = new URL(filename, objURL).href;
            const response = await fetch(matURL);
            const text = await response.text();
            matTexts.push(text);
        }

        // Store the parsed object data
        objs.push(obj);

        // Parse materials and create textures
        const materials = parseMTL(matTexts.join('\n'));

        // Default texture
        textures = {
            default: twgl.createTexture(gl, {
                src: [255, 255, 255, 255]
            }),
        };

        // Process materials and create textures
        const materialKeys = Object.keys(materials);
        for (const materialKey of materialKeys) {
            const material = materials[materialKey];
            const keys = Object.keys(material);
            for (const key of keys) {
                if (key.endsWith('Map')) {
                    const filename = material[key];
                    let texture = textures[filename];

                    if (!texture) {
                        const textureHref = new URL(filename, objURL).href;
                        texture = twgl.createTexture(gl, {
                            src: textureHref,
                            flipY: true
                        });
                        textures[filename] = texture;
                    }

                    material[key] = texture;
                }
            }
        }



        // Process object geometries and create objects for rendering
        const object = obj.geometries.map(({
            material,
            data
        }) => {
            // Handle color data
            if (data.color) {
                if (data.position.length === data.color.length) {
                    data.color = {
                        numComponents: 3,
                        data: data.color
                    };
                }
            } else {
                data.color = {
                    value: [1, 1, 1, 1]
                };
            }

            // Set default color value if not provided
            data.color = {
                value: [1, 1, 1, 1]
            };

            // Create buffer info and VAO
            const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);
            const vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);

            // Create HTML elements for object representation
            const objListHTML = document.querySelector('#objectsList');
            const viewElem = document.createElement('div');
            objListHTML.appendChild(viewElem);
            viewElem.className = 'object';

            // Get index of the object being added
            objIndex = objs.length - 1;

            // OBJECT NAME
            const objectText = document.createElement('h1');
            viewElem.appendChild(objectText);
            objectText.className = 'object-name-text';
            objectText.textContent = `${objs[objIndex].objectName}`;

            // BUTTON TO ADD OBJ
            const addObjectButton = document.createElement('button');
            viewElem.appendChild(addObjectButton);
            addObjectButton.className = 'add-object-button';
            addObjectButton.textContent = `Adicionar Objeto `;
            addObjectButton.id = `object-${objIndex}`;
            addObjectButton.addEventListener("click", addObjectInScene);

            return {
                material: {
                    ...materials[material],
                },
                bufferInfo,
                vao,
                element: viewElem,
            };
        });

        // Add objects to the objectsList array
        objectsList.push(...object);
    }

    // Define a function named addObjectInScene which takes an event object as input
    function addObjectInScene(event) {
        // Extract the ID of the button that triggered the event
        var buttonID = event.target.id;

        // Extract the object index from the button ID
        var objectIndex = parseInt(buttonID.match(/\d+/)[0]);

        // Increment the objectGeneralIndex variable
        objectGeneralIndex++;

        // Load GUI for the newly added object and get its configuration
        const config = loadGUI(objectGeneralIndex, removeObject);

        // Create a new object in the objectsInScene array
        objectsInScene.push({
            // Copy material properties from objectsList
            material: {
                ...objectsList[objectIndex].material,
            },
            // Copy bufferInfo, vao, and element properties from objectsList
            bufferInfo: objectsList[objectIndex].bufferInfo,
            vao: objectsList[objectIndex].vao,
            element: document.querySelector('#engineScene'), // Assuming '#engineScene' is the selector for the scene element
            // Assign the configuration obtained from the GUI
            config: config,
            // Store the index of the object
            index: objectIndex,
        });
    }

    // mouseX and mouseY are in CSS display space relative to canvas
    let mouseX = -1;
    let mouseY = -1;
    let oldPickNdx = -1;
    let oldPickColor;
    let frameCount = 0;


    lights.push(firstLight);
    updateLightGUI(LightsCounter);


    // Define a function named render which takes 'time' as input
    function render(time) {
        // Convert time to seconds
        time *= 0.001;

        // TODO:
        // ------ Figure out what pixel is under the mouse and read it
        const pixelX = mouseX * gl.canvas.width / gl.canvas.clientWidth;
        const pixelY = gl.canvas.height - mouseY * gl.canvas.height / gl.canvas.clientHeight - 1;

        // console.log(pixelX);

        const data = new Uint8Array(4);
        gl.readPixels(
            pixelX,            // x
            pixelY,            // y
            1,                 // width
            1,                 // height
            gl.RGBA,           // format
            gl.UNSIGNED_BYTE,  // type
            data
        );             // typed array to hold result

        const id = data[0] + (data[1] << 8) + (data[2] << 16) + (data[3] << 24);
        // console.log("id:", id);


        // Resize the canvas to match the display size
        twgl.resizeCanvasToDisplaySize(gl.canvas);

        // Enable depth testing, face culling, and scissor testing
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.SCISSOR_TEST);

        // Move the canvas to the top of the current scroll position
        gl.canvas.style.transform = `translateY(${window.scrollY}px)`;

        // Calculate the field of view in radians
        const fieldOfViewRadians = degToRad(60);

        // Get the width and height of the document
        const width = document.documentElement.clientWidth;
        const height = document.documentElement.clientHeight;
        const aspect = width / height;

        // Calculate the perspective projection matrix
        const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

        // Define the up vector for the camera
        const up = [0, 1, 0];

        // Calculate the view matrix for the camera
        const camera = m4.lookAt(cameraPosition, cameraTarget, up);
        const view = m4.inverse(camera);


        let positions = [];
        let intensitys = [];
        let colors = [];

        lights.map(light => {
            positions.push(light.positionX, light.positionY, light.positionZ);
            intensitys.push(light.intensity);
            colors.push(light.color[0]/255, light.color[1]/255, light.color[2]/255);
        });

        // Define shared uniforms for lighting and view/projection matrices
        const sharedUniforms = {
            u_ambientLight: [0.1, 0.1, 0.1],

            u_lights_counter: LightsCounter,

            u_light_pos: positions,
            u_light_intensity: intensitys,
            u_light_color: colors, 
            
            u_toon_shader: toonFragmentShader,

            u_view: view,
            u_projection: projection,
            u_viewWorldPosition: cameraPosition,
        };

        // console.log(sharedUniforms.u_lightDirection);

        // Use the mesh program for rendering
        gl.useProgram(meshProgramInfo.program);
        // Set shared uniforms for the mesh program
        twgl.setUniforms(meshProgramInfo, sharedUniforms);

        // Combine objects from 'objectsList' and 'objectsInScene' arrays
        let objectsToRender = [];
        objectsToRender.push(...objectsList);
        objectsToRender.push(...objectsInScene);

        // Loop through each object to render
        for (const {
                bufferInfo,
                vao,
                material,
                element,
                config
            }
            of objectsToRender) {
            // Get the bounding rectangle of the element
            const rect = element.getBoundingClientRect();

            // Check if the element is outside the viewport, if so, skip rendering
            if (rect.bottom < 0 || rect.top > gl.canvas.clientHeight ||
                rect.right < 0 || rect.left > gl.canvas.clientWidth) {
                continue;
            }

            // Calculate viewport and scissor parameters
            const width = rect.right - rect.left;
            const height = rect.bottom - rect.top;
            const left = rect.left;
            const bottom = gl.canvas.clientHeight - rect.bottom - 1;

            // Set viewport and scissor
            gl.viewport(left, bottom, width, height);
            gl.scissor(left, bottom, width, height);

            // Define the world matrix for the object
            let u_world;
            if (config !== undefined) {
                // Apply transformations specified in the config
                u_world = m4.translate(m4.identity(), config.translation_x, config.translation_y, config.translation_z);
                u_world = m4.xRotate(u_world, config.pitch);
                u_world = m4.yRotate(u_world, config.yaw);
                u_world = m4.zRotate(u_world, config.roll);
                u_world = m4.scale(u_world, config.scale_x, config.scale_y, config.scale_z);

                // Normalize color values and assign to material properties
                material.diffuse = normalizeColor(config.diffuse);
                material.ambient = normalizeColor(config.ambient);
                material.specular = normalizeColor(config.specular);
                material.shininess = config.shininess;
                material.opacity = config.opacity;
            } else {
                // Default transformation if config is not defined
                u_world = m4.translate(m4.identity(), 0.0, -3, 0.0);
            }


            // TODO:
            // highlight object under mouse
            if (id >= 0) {
                if (objectsInScene[id]) {
                    const pickNdx = id;
    
                    oldPickNdx = pickNdx;
    
                    const object = objectsInScene[pickNdx];
    
                    // oldPickColor = object.uniforms.u_colorMult;

                    object.material.opacity = 1;
    
                    // object.uniforms.u_colorMult = (frameCount & 0x8) ? [1, 0, 0, 1] : [1, 1, 0, 1];
                }
            }


            // Bind the vertex array object
            gl.bindVertexArray(vao);

            // Set uniforms for the mesh program
            twgl.setUniforms(meshProgramInfo, {
                u_world: u_world,
            }, material);

            // Draw the object
            twgl.drawBufferInfo(gl, bufferInfo);
        }

        // Request the next animation frame for continuous rendering
        requestAnimationFrame(render);
    }

    // Define a function named normalizeColor which takes an array of color values as input
    function normalizeColor(color) {
        // Map each channel value in the color array to its normalized form (divide by 255)
        return color.map(channel => channel / 255);
    }

    // Define a function named removeObject using arrow function syntax, taking an index as input
    const removeObject = (index) => {
        // Log the index for debugging purposes
        console.log(index);

        // Decrement the objectGeneralIndex variable
        objectGeneralIndex--;

        // Check if the index is within valid range
        if (index >= 0 && index < objectsInScene.length) {
            // Remove the object at the specified index from objectsInScene array and store the removed object
            const removedObject = objectsInScene.splice(index, 1)[0];
            // Log a message indicating the removal of the object
            console.log(`Object at index ${index} removed from the scene.`);

            // TODO: Additional functionality to remove GUI folder associated with the removed object
            // if (removedObject.config && gui.__folders[`Object ${index}`]) {
            //     // Remove GUI controls for this object
            //     gui.__folders[`Object ${index}`].domElement.parentNode.removeChild(gui.__folders[`Object ${index}`].domElement);
            //     delete gui.__folders[`Object ${index}`];
            //     console.log(`GUI folder for Object ${index} removed.`);
            // } else {
            //     console.log(`No GUI folder found for Object ${index}.`);
            // }

        } else {
            // Log an error message for an invalid index
            console.error(`Invalid index: ${index}`);
        }
    };

    // Add an event listener to the element with the ID 'clear-scene-button', triggering a function when clicked
    document.getElementById('clear-scene-button').addEventListener('click', function clearScene() {
        // Clear the 'objectsInScene' array by emptying it
        objectsInScene = [];
        // Reset the 'objectGeneralIndex' to -1, indicating no objects in the scene
        objectGeneralIndex = -1;

        // Destroy the existing GUI (Graphical User Interface) instance
        gui.destroy();
        // Set 'gui' to null to remove reference
        gui = null;
        // Create a new instance of the dat.GUI library for user interface controls
        gui = new dat.GUI();
    });

    // Add an event listener to the 'save-scene-button' element
    document.getElementById('save-scene-button').addEventListener('click', function() {
        // Combine objectsList and objectsInScene arrays into a single array called allObjects
        const allObjects = [...objectsList, ...objectsInScene];

        // Create an empty array to store the scene data
        const scene = [];

        // Loop through each object in the allObjects array
        for (let obj of allObjects) {
            // Push an object containing config and index properties of each object to the scene array
            scene.push({
                config: obj.config,
                index: obj.index
            });
        }

        // Convert the scene array to a JSON string
        const json = JSON.stringify({ allObjects: scene });

        // Create a blob from the JSON string
        const blob = new Blob([json], { type: 'application/json' });

        // Create a temporary URL for the blob
        const url = URL.createObjectURL(blob);

        // Create a link element
        const link = document.createElement('a');

        // Set the href attribute of the link to the temporary URL
        link.href = url;

        // Set the download attribute of the link to 'scene.json'
        link.download = 'scene.json';

        // Simulate a click on the link to trigger the download
        link.click();

        // Clean up by revoking the temporary URL
        URL.revokeObjectURL(url);
    });

    // TODO:
    gl.canvas.addEventListener('mousemove', (e) => {
        console.log("test");
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    // Add an event listener to the 'add-toon-shadding-button' element
    document.getElementById('add-toon-shadding-button').addEventListener('click', function(){
        if (!toonFragmentShader){
          toonFragmentShader = 1;

          // Change button text to indicate disabling
          this.innerText = "Disable Toon Shading";
        }
        else {
          toonFragmentShader = 0;

          // Change button text to indicate enabling
          this.innerText = "Enable Toon Shading";
        }
    });

    // Add an event listener to the 'add-light-button' element
    document.getElementById('add-light-button').addEventListener('click', function(){
        if (LightsCounter < 5){

            const light = {
                positionX: -1.0,
                positionY: 3.0,
                positionZ: 5.0,
                intensity: 1.0,
                color: [255, 0, 0],
            }
            
            lights.push(light);
            
            LightsCounter++;
            updateLightGUI(LightsCounter);
        } else {
            console.log("Max light number is 5(five)");
        }
    });

    document.getElementById('remove-light-button').addEventListener('click', function(){
            // Verifique se há luzes para remover
    if (LightsCounter > 0) {
        // Remova a última luz do array 'lights'
        lights.pop();
        
        // Atualize o contador de luzes
        LightsCounter--;

        // Remova o controle da GUI da última luz
        gui.__controllers.forEach((controller, index) => {
            if (controller.property === `Light ${LightsCounter}`) {
                gui.__controllers.splice(index, 1);
                gui.updateDisplay();
            }
        });

        // Atualize a renderização da cena
        // Aqui você pode chamar a função que renderiza a cena novamente para atualizar a visualização após remover a luz
        // render();
    } else {
        console.log("Não há luzes para remover.");
    }
    });

    // Function to update the GUI with light controls
    function updateLightGUI(lightIndex) {
        // Create a new GUI instance for each light
        const guiLightsFolder = new dat.GUI();

        //Add a new folder in the GUI for light
        const lightFolder = guiLightsFolder.addFolder(`Light ${lightIndex}`);

        // Add controls for specific light properties
        lightFolder.add(lights[lightIndex - 1], 'positionX', -20, 20).name('X');
        lightFolder.add(lights[lightIndex - 1], 'positionY', -20, 20).name('Y');
        lightFolder.add(lights[lightIndex - 1], 'positionZ', -20, 20).name('Z');
        lightFolder.add(lights[lightIndex - 1], 'intensity', 0, 5).name('Intensity');
        lightFolder.addColor(lights[lightIndex - 1], 'color').name('Color');
    }

    requestAnimationFrame(render);
}

// Define a function named destroyElements
function destroyElements() {
    // Get a reference to the div element with the ID "objectsList"
    var div = document.getElementById("objectsList");

    // Loop through each child element of the div and remove it
    while (div.firstChild) {
        div.removeChild(div.firstChild);
    }
}

// Adicione um event listener para o botão de carregar cena
document.getElementById('load-scene-button').addEventListener('click', function() {
    // Obtenha o elemento de entrada de arquivo
    const input = document.getElementById('load-scene-input');
    // Ative o clique no elemento de entrada de arquivo
    input.click();
});

// Adicione um event listener para o elemento de entrada de arquivo
document.getElementById('load-scene-input').addEventListener('change', function(event) {
    // Obtenha o arquivo selecionado
    const file = event.target.files[0];
    // Verifique se um arquivo foi selecionado
    if (file) {
        // Crie um objeto FileReader
        const reader = new FileReader();
        // Defina uma função de retorno de chamada para quando a leitura do arquivo for concluída
        reader.onload = function(e) {
            // Parseie o conteúdo do arquivo JSON
            const sceneData = JSON.parse(e.target.result);
            // Renderize a cena carregada
            renderLoadedScene(sceneData);
        };
        // Leia o conteúdo do arquivo como texto
        reader.readAsText(file);
    }
});

// Função para renderizar a cena carregada
function renderLoadedScene(sceneData) {

    console.log(sceneData);

    // Verifique se o objeto sceneData contém a chave 'allObjects'
    if ('allObjects' in sceneData) {
        // Limpe a cena atual
        objectsInScene = [];
        objectGeneralIndex = -1;

        // Loop através de todos os objetos na cena carregada
        sceneData.allObjects.forEach(objData => {

            console.log(objData);

            // Obtenha os dados do objeto e o índice do objeto
            const config = objData.config;
            const index = objData.index;

            // Verifique se o índice é válido
            if (index >= 0 && index < objectsList.length) {
                // Copie as configurações do objeto da cena carregada para a lista de objetos na cena
                objectsInScene.push({
                    material: { ...objectsList[index].material },
                    bufferInfo: objectsList[index].bufferInfo,
                    vao: objectsList[index].vao,
                    element: document.querySelector('#engineScene'), // Assuming '#engineScene' is the selector for the scene element
                    config: config,
                    index: index
                });

                // Atualize o índice geral do objeto
                //objectGeneralIndex = Math.max(objectGeneralIndex, index);
            } else {
                console.error(`Invalid object index: ${index}`);
            }
        });

        // Atualize a interface do usuário, se necessário
        // Por exemplo, você pode querer recriar os controles da GUI para os objetos na cena carregada
        // Você precisará implementar essa lógica conforme necessário para sua aplicação
        //updateGUI(); // Esta função seria sua implementação para atualizar a interface do usuário
    } else {
        console.error('Invalid scene data: missing "allObjects" key.');
    }
}

main();
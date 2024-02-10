"use strict";

function regexHandler(keywords, text) {
    const lines = text.split('\n');
    const keywordRE = /(\w*)(?: )*(.*)/;

    for (let lineIndex = 0; lineIndex < lines.length; ++lineIndex) {
        const line = lines[lineIndex].trim();

        if (line === '' || line.startsWith('#')) {
            continue;
        }

        const m = keywordRE.exec(line);
        if (!m) {
            continue;
        }

        const [, keyword, unparsedArgs] = m;

        const parts = line.split(/\s+/).slice(1);

        const handler = keywords[keyword];

        handler(parts, unparsedArgs);
    }
}

function parseOBJ(text) {
    // Get Object Name
    let objectName;
    const lines1 = text.split('\n');
    for (const line of lines1) {
        if (line.startsWith('o')) {
            objectName = line.split(' ')[1].trim();
            break;
        } else {
            objectName = "null"
        }
    }

    // because indices are base 1 let's just fill in the 0th data
    const objPositions = [
        [0, 0, 0]
    ];
    const objTexcoords = [
        [0, 0]
    ];
    const objNormals = [
        [0, 0, 0]
    ];
    const objColors = [
        [0, 0, 0]
    ];

    const objVertexData = [
        objPositions,
        objTexcoords,
        objNormals,
        objColors,
    ];

    // same order as `f` indices
    let webglVertexData = [
        [], // positions
        [], // texcoords
        [], // normals
        [], // colors
    ];

    const geometries = [];
    const materialLibs = [];

    let geometry;
    let groups = ['default'];
    let material = 'default';
    let object = 'default';

    function newGeometry() {
        // If there is an existing geometry and it's
        // not empty then start a new one.
        if (geometry && geometry.data.position.length) {
            geometry = undefined;
        }
    }

    function setGeometry() {
        if (!geometry) {
            const position = [];
            const texcoord = [];
            const normal = [];
            const color = [];
            webglVertexData = [
                position,
                texcoord,
                normal,
                color,
            ];
            geometry = {
                object,
                groups,
                material,
                data: {
                    position,
                    texcoord,
                    normal,
                    color,
                },
            };
            geometries.push(geometry);
        }
    }

    function addVertex(vert) {
        const ptn = vert.split('/');

        ptn.forEach((objIndexStr, i) => {
            if (!objIndexStr) {
                return;
            }

            const objIndex = parseInt(objIndexStr);
            const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);

            webglVertexData[i].push(...objVertexData[i][index]);

            // if this is the position index (index 0) and we parsed
            // vertex colors then copy the vertex colors to the webgl vertex color data
            if (i === 0 && objColors.length > 1) {
                geometry.data.color.push(...objColors[index]);
            }
        });
    }

    function v(parts) {
        if (parts.length > 3) {
            objPositions.push(parts.slice(0, 3).map(parseFloat));
            objColors.push(parts.slice(3).map(parseFloat));
        } else {
            objPositions.push(parts.map(parseFloat));
        }
    }

    function vn(parts) {
        objNormals.push(parts.map(parseFloat));
    }

    function vt(parts) {
        objTexcoords.push(parts.map(parseFloat));
    }

    function f(parts) {
        setGeometry();
        const numTriangles = parts.length - 2;
        for (let tri = 0; tri < numTriangles; ++tri) {
            addVertex(parts[0]);
            addVertex(parts[tri + 1]);
            addVertex(parts[tri + 2]);
        }
    }

    function s() {}

    function mtllib(unparsedArgs) {
        // the spec says there can be multiple filenames here
        // but many exist with spaces in a single filename
        materialLibs.push(unparsedArgs);
    }

    function usemtl(unparsedArgs) {
        material = unparsedArgs;
        newGeometry();
    }

    function g(parts) {
        groups = parts;
        newGeometry();
    }

    function o(unparsedArgs) {
        object = unparsedArgs;
        newGeometry();
    }

    const OBJKEY = {
        v,      // vertices coordinates
        vn,     // vertex normals
        vt,     // texture coordinates
        f,      // faces
        s,      // scale
        mtllib, // material library
        usemtl, // material
        g,      // parts group
        o,      // obj name
    };

    regexHandler(OBJKEY, text);

    for (const geometry of geometries) {
        geometry.data = Object.fromEntries(
            Object.entries(geometry.data).filter(([, array]) => array.length > 0));
    }

    return {
        geometries,
        materialLibs,
        objectName,
    };
}

function parseMTL(text) {
    let material;
    const materials = {};

    function newmtl(unparsedArgs) {
        material = {};
        materials[unparsedArgs] = material;
    }

    function Ns(parts) {
        material.shininess = parseFloat(parts[0]);
    }

    function Ka(parts) {
        material.ambient = parts.map(parseFloat);
    }

    function Kd(parts) {
        material.diffuse = parts.map(parseFloat);
    }

    function Ks(parts) {
        material.specular = parts.map(parseFloat);
    }

    function Ke(parts) {
        material.emissive = parts.map(parseFloat);
    }

    function map_Kd(unparsedArgs) {
        material.diffuseMap = unparsedArgs;
    }

    function Ni(parts) {
        material.opticalDensity = parseFloat(parts[0]);
    }

    function d(parts) {
        material.opacity = parseFloat(parts[0]);
    }

    function illum(parts) {
        material.illum = parseInt(parts[0]);
    }

    const MTLKEYS = {
        newmtl, // newmtl
        Ns,     // shininess
        Ka,     // ambient
        Kd,     // diffuse
        Ks,     // specular
        Ke,     // emissive
        map_Kd,
        Ni,     // opticalDensity
        d,      // opacity
        illum,  // illum
    };

    regexHandler(MTLKEYS, text);

    return materials;
}
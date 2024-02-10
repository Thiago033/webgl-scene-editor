// Function to calculate camera configuration based on object geometries
function loadCamera(objs) {
    // Calculate extents of each object
    const extents = objs.map(obj => getGeometriesExtents(obj.geometries));

    // Combine extents of all objects
    const combinedExtents = extents.reduce((combined, extents) => {
        for (let i = 0; i < 3; i++) {
            combined.min[i] = Math.min(extents.min[i], combined.min[i]);
            combined.max[i] = Math.max(extents.max[i], combined.max[i]);
        }
        return combined;
    }, {
        min: Array(3).fill(Number.POSITIVE_INFINITY),
        max: Array(3).fill(Number.NEGATIVE_INFINITY),
    });

    // Calculate range
    const range = m4.subtractVectors(combinedExtents.max, combinedExtents.min);

    // Calculate camera target as the center of the combined extents
    const cameraTarget = [
        (combinedExtents.min[0] + combinedExtents.max[0]) / 2,
        (combinedExtents.min[1] + combinedExtents.max[1]) / 2,
        (combinedExtents.min[2] + combinedExtents.max[2]) / 2
    ];

    // Calculate camera position to ensure visibility of objects
    const radius = m4.length(range) * 1.2;
    const cameraPosition = m4.addVectors(cameraTarget, [0, 0, radius]);

    // Set zNear and zFar to appropriate values
    const zNear = radius / 100;
    const zFar = radius * 3;

    return {
        cameraTarget,
        cameraPosition,
        zNear,
        zFar,
    };
}

// Function to calculate the extents of a set of positions
function getExtents(positions) {
    const min = positions.slice(0, 3);
    const max = positions.slice(0, 3);
    for (let i = 3; i < positions.length; i += 3) {
        for (let j = 0; j < 3; ++j) {
            const v = positions[i + j];
            min[j] = Math.min(v, min[j]);
            max[j] = Math.max(v, max[j]);
        }
    }
    return {
        min,
        max
    };
}

// Function to calculate the extents of geometries in an object
function getGeometriesExtents(geometries) {
    return geometries.reduce(({
        min,
        max
    }, {
        data
    }) => {
        const minMax = getExtents(data.position);
        return {
            min: min.map((min, ndx) => Math.min(minMax.min[ndx], min)),
            max: max.map((max, ndx) => Math.max(minMax.max[ndx], max)),
        };
    }, {
        min: Array(3).fill(Number.POSITIVE_INFINITY),
        max: Array(3).fill(Number.NEGATIVE_INFINITY),
    });
}
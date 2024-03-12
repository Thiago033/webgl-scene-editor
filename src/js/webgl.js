const vertexShaderSource = `#version 300 es
  precision highp float;
  
  in vec4 a_position;
  in vec3 a_normal;
  in vec2 a_texcoord;
  in vec4 a_color;

  uniform mat4 u_projection;
  uniform mat4 u_view;
  uniform mat4 u_world;
  uniform vec3 u_viewWorldPosition;

  uniform vec3 u_light_pos[5];
  uniform highp int u_lights_counter;
  
  out vec3 v_normal;
  out vec3 v_surfaceToView;
  out vec2 v_texcoord;
  out vec4 v_color;
  
  out vec3 v_light_pos[5];

  void main() {
    vec4 worldPosition = u_world * a_position;
    gl_Position = u_projection * u_view * worldPosition;
    v_surfaceToView = u_viewWorldPosition - worldPosition.xyz;
    v_normal = mat3(u_world) * a_normal;
    v_texcoord = a_texcoord;
    v_color = a_color;
    
    for (int i = 0; i < u_lights_counter; i++) {
      v_light_pos[i] = u_light_pos[i] - worldPosition.xyz;
    }
  }
`;

const fragmentShaderSource = `#version 300 es
  precision highp float;

  in vec3 v_normal;
  in vec3 v_surfaceToView;
  in vec2 v_texcoord;
  in vec4 v_color;

  in vec3 v_light_pos[5];

  uniform vec3 diffuse;
  uniform sampler2D diffuseMap;
  uniform vec3 emissive;
  uniform vec3 ambient;
  uniform vec3 specular;
  uniform float shininess;
  uniform float opacity;

  uniform vec3 u_ambientLight;

  uniform vec3 u_light_color[5];
  uniform float u_light_intensity[5];
  uniform highp int u_lights_counter;

  uniform int u_toon_shader;
  
  out vec4 outColor;

  void main () {
    vec3 normal = normalize(v_normal);
    vec3 surfaceToViewDirection = normalize(v_surfaceToView);

    vec3 finalColor = vec3(0.0); 

    float step = 1.0;

    if (u_toon_shader == 1) {
      float totalDiffuseFactor = 0.0; 

      for (int i = 0; i < u_lights_counter; i++) { 
          vec3 lightDirection = normalize(v_light_pos[i]);
          totalDiffuseFactor += max(dot(normal, lightDirection), 0.0);
      }

      float steps = 4.0;
      step = sqrt(totalDiffuseFactor) * steps;
      step = (floor(step) + smoothstep(0.50, 0.50, fract(step))) / steps;
    }
    
    vec3 ambientColor = vec3(0.0);

    vec3 specularColor = vec3(0.0); 

    for (int i = 0; i < u_lights_counter; i++) { 
        vec3 lightDirection = normalize(v_light_pos[i]);
        float diffuseFactor = max(dot(normal, lightDirection), 0.0);
        finalColor += diffuse * step * diffuseFactor * u_light_intensity[i];
        
        vec3 halfVector = normalize(lightDirection + surfaceToViewDirection);
        float specularFactor = pow(max(dot(normal, halfVector), 0.0), shininess * 0.3);
        specularColor += specular * specularFactor * u_light_intensity[i] * u_light_color[i];
    }

    ambientColor += u_ambientLight;
 
    finalColor += ambientColor * ambient;

    vec4 diffuseMapColor = texture(diffuseMap, v_texcoord);
    finalColor *= diffuseMapColor.rgb;

    float finalOpacity = opacity * diffuseMapColor.a;

    finalColor += specularColor;

    finalColor /= float(u_lights_counter);

    outColor = vec4(finalColor, finalOpacity);
  }
`;

const initializeWorld = () => {
    const canvas = document.querySelector("#canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        return;
    }

    twgl.setAttributePrefix("a_");
    const meshProgramInfo = twgl.createProgramInfo(gl, [
        vertexShaderSource,
        fragmentShaderSource,
    ]);

    return {
        gl,
        meshProgramInfo,
    };
};
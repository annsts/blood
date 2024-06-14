let scene, renderer, particleSystem, uniforms, targetPositions, originalPositions, dispersionTargets;
let formingText = false, dispersing = false, isAnimating = false;
let camera, currentTextIndex = null;

const poem = [
    ["blood,", "blood,", "blood,"],
    ["and all i see is blood,"],
    ["visions, fissure,", "lightning struck on the spine", "of a book and me,"],
    ["me and my hands with wounds"],
    ["cut deep to the bone,", "to the bone,", "to the bone  - "],
    ["vulnerable,", "uncomfortable."],
    ["no words found , -", "in search of new", "letters;"],
    ["but every drop spilled", "writes its own,", "writes its own;"],
    ["and all i see"],
    ["black birds running,", "eating away at", "my dignity;"],
    ["well -  i  am", "choking,", "the stop sign ringing,", "ringing;"],
    ["and all i see is"]
];

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    addParticles();
    animate();

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousemove', onMouseMove, false);
    
    for (let i = 0; i < poem.length; i++) {
        document.getElementById(`button${i + 1}`).addEventListener('click', () => handleButtonClick(i));
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    let mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    let mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

    uniforms.u_mouse.value.x = mouseX * 5;
    uniforms.u_mouse.value.y = mouseY * 5;
}

function addParticles() {
    const particleCount = 100000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const color = new THREE.Color();

    for (let i = 0; i < particleCount; i++) {
        const theta = THREE.MathUtils.randFloatSpread(360);
        const phi = THREE.MathUtils.randFloatSpread(360);
        const r = Math.cbrt(Math.random()) * 2; 

        positions[i * 3] = r * Math.sin(theta) * Math.cos(phi);
        positions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
        positions[i * 3 + 2] = r * Math.cos(theta);

        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.0;
        colors[i * 3 + 2] = 0.0;

        sizes[i] = Math.random(); 
    }

    originalPositions = positions.slice(); // store original positions

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    uniforms = {
        u_time: { value: 1.0 },
        u_mouse: { value: { x: 0.0, y: 0.0 } },
        u_formingText: { value: 0 } 
    };

    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader(),
        fragmentShader: fragmentShader(),
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        vertexColors: true
    });

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; 
    controls.dampingFactor = 0.25; 
    controls.screenSpacePanning = false; 
    controls.maxPolarAngle = Math.PI / 2; 
}

function handleButtonClick(buttonIndex) {
    if (isAnimating) {
        return;
    }

    if (currentTextIndex !== null) {
        startDispersing(() => formText(buttonIndex));
    } else {
        formText(buttonIndex);
    }
}

function startDispersing(callback) {
    if (formingText) {
        formingText = false;
        uniforms.u_formingText.value = 0;
    }
    dispersing = true;
    prepareDispersion();
    setTimeout(() => {
        dispersing = false;
        isAnimating = false;
        currentTextIndex = null;
        resetButtons();
        if (callback) callback();
    }, 1000);
}

function formText(buttonIndex) {
    if (isAnimating) {
        return; 
    }
    isAnimating = true;
    formingText = true;
    currentTextIndex = buttonIndex;
    uniforms.u_formingText.value = 1; 
    setActiveButton(buttonIndex + 1);

    // target positions for the lines of the poem
    const lines = poem[buttonIndex];
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    context.fillStyle = 'black';
    context.font = '48px Arial';

    // text position based on index
    const positions = [
        { x: 10, y: 100 },
        { x: 500, y: 200 },
        { x: 10, y: 300 },
        { x: 600, y: 50 },
        { x: 10, y: 500 },
        { x: 600, y: 700 },
        { x: 10, y: 650 },
        { x: 1000, y: 650 },
        { x: 10, y: 780 },
        { x: 300, y: 100 },
        { x: 1000, y: 600 },
        { x: 300, y: 300 },
    ];

    lines.forEach((line, i) => {
        context.fillText(line, positions[buttonIndex].x, positions[buttonIndex].y + i * 60);
    });

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const targetPositionsArray = [];

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const alpha = imageData[(y * canvas.width + x) * 4 + 3];
            if (alpha > 128) {
                targetPositionsArray.push([(x / canvas.width - 0.5) * 6, (0.5 - y / canvas.height) * 2, 0]);
            }
        }
    }

    targetPositions = new Float32Array(targetPositionsArray.length * 3);
    for (let i = 0; i < targetPositionsArray.length; i++) {
        targetPositions[i * 3] = targetPositionsArray[i][0];
        targetPositions[i * 3 + 1] = targetPositionsArray[i][1];
        targetPositions[i * 3 + 2] = targetPositionsArray[i][2];
    }

    setTimeout(() => {
        isAnimating = false;
        formingText = false;
        resetButtons(); 
        
    }, 5000);
}

function prepareDispersion() {
    formingText = false;
    uniforms.u_formingText.value = 0;
    dispersing = true;

    const positions = particleSystem.geometry.attributes.position.array;
    dispersionTargets = new Float32Array(positions.length);
    
    for (let i = 0; i < positions.length; i += 3) {
        const theta = THREE.MathUtils.randFloatSpread(360);
        const phi = THREE.MathUtils.randFloatSpread(360);
        const r = Math.cbrt(Math.random()) * 2; 

        dispersionTargets[i] = r * Math.sin(theta) * Math.cos(phi);
        dispersionTargets[i + 1] = r * Math.sin(theta) * Math.sin(phi);
        dispersionTargets[i + 2] = r * Math.cos(theta);
    }
}

function disperseParticles() {
    const positions = particleSystem.geometry.attributes.position.array;
    let allParticlesDispersed = true;
    
    for (let i = 0; i < positions.length; i += 3) {
        const dx = dispersionTargets[i] - positions[i];
        const dy = dispersionTargets[i + 1] - positions[i + 1];
        const dz = dispersionTargets[i + 2] - positions[i + 2];
        positions[i] += dx * 0.02;
        positions[i + 1] += dy * 0.02;
        positions[i + 2] += dz * 0.02;

        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01 || Math.abs(dz) > 0.01) {
            allParticlesDispersed = false;
        }
    }
    
    particleSystem.geometry.attributes.position.needsUpdate = true;

    if (allParticlesDispersed) {
        dispersing = false;
        isAnimating = false;
        resetButtons();
    }
}

function setActiveButton(activeIndex) {
    const buttons = document.querySelectorAll('#button-container button');
    buttons.forEach((button, index) => {
        button.classList.remove('active');
        if (index + 1 === activeIndex) {
            button.classList.remove('inactive');
            button.classList.add('active');
        } else {
            button.classList.remove('active');
            button.classList.add('inactive');
        }
    });
}

function resetButtons() {
    const buttons = document.querySelectorAll('#button-container button');
    buttons.forEach(button => {
        button.classList.remove('inactive');
    });
}

function animate() {
    requestAnimationFrame(animate);
    uniforms.u_time.value += 0.05;

    if (formingText) {
        const positions = particleSystem.geometry.attributes.position.array;
        const count = Math.min(targetPositions.length / 3, positions.length / 3);
        for (let i = 0; i < count; i++) {
            const ix = i * 3;
            const dx = targetPositions[ix] - positions[ix];
            const dy = targetPositions[ix + 1] - positions[ix + 1];
            const dz = targetPositions[ix + 2] - positions[ix + 2];
            positions[ix] += dx * 0.02;
            positions[ix + 1] += dy * 0.02;
            positions[ix + 2] += dz * 0.02;
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    if (dispersing) {
        disperseParticles();
    }

    renderer.render(scene, camera);
}

function vertexShader() {
    return `
        uniform float u_time;
        uniform vec2 u_mouse;
        uniform int u_formingText; 
        attribute float size;
        varying vec3 vColor;

        // simplex noise functions
        vec3 mod289(vec3 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec4 mod289(vec4 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec4 permute(vec4 x) {
            return mod289(((x*34.0)+1.0)*x);
        }
        
        vec4 taylorInvSqrt(vec4 r) {
            return 1.79284291400159 - 0.85373472095314 * r;
        }
        
        float snoise(vec3 v) {
            const vec2  C = vec2(1.0/6.0, 1.0/3.0);
            const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        
            vec3 i  = floor(v + dot(v, C.yyy) );
            vec3 x0 =   v - i + dot(i, C.xxx);
        
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min( g.xyz, l.zxy );
            vec3 i2 = max( g.xyz, l.zxy );
        
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
        
            i = mod289(i);
            vec4 p = permute( permute( permute(
                        i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        
            float n_ = 0.142857142857; // 1.0/7.0
            vec3  ns = n_ * D.wyz - D.xzx;
        
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  // mod(p,7*7)
        
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)
        
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
        
            vec4 b0 = vec4( x.xy, y.xy );
            vec4 b1 = vec4( x.zw, y.zw );
        
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
        
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        
            vec3 p0 = vec3(a0.xy,h.x);
            vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z);
            vec3 p3 = vec3(a1.zw,h.w);
        
            // normalise gradients
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
        
            // mix final noise value
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                        dot(p2,x2), dot(p3,x3) ) );
        }
        
        void main() {
            vColor = color;
            vec3 p = position;
            float noise = snoise(vec3(p * 1.5 + u_time * 0.2)); // noise scaling and time factor
            
            // noise
            p += noise * 0.1;
            
            // stay within the sphere
            float len = length(p);
            if (len > 2.0 && u_formingText == 0) {
                p = normalize(p) * 2.0;
            }
            
            // Interaction with mouse
            float dx = p.x - u_mouse.x;
            float dy = p.y - u_mouse.y;
            float distance = sqrt(dx * dx + dy * dy);
            if (distance < 2.0 && u_formingText == 0) {
                float force = (2.0 - distance) * 0.1;
                p.x += dx * force;
                p.y += dy * force;
            }
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = size * 2.0; // Larger size for better visibility
        }
    `;
}

function fragmentShader() {
    return `
        varying vec3 vColor;
        void main() {
            gl_FragColor = vec4(vColor, 0.8);
        }
    `;
}

init();
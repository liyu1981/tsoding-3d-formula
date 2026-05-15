const BACKGROUND = "#101010";
const FOREGROUND = "#50FF50";

console.log(game);
game.width = 800;
game.height = 800;
const ctx = game.getContext("2d");
console.log(ctx);

const FPS = 60;
const dt = 1 / (2 * FPS);

const frameState = {
    dz: 1,
    angle: 0,
    textures: [],
};

function clear() {
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, game.width, game.height);
}

function point({ x, y }) {
    const s = 20;
    ctx.fillStyle = FOREGROUND;
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
}

function line(p1, p2) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = FOREGROUND;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
}

function texturedTriangle(v0, v1, v2, img) {
    const { x: x0, y: y0 } = v0;
    const { x: x1, y: y1 } = v1;
    const { x: x2, y: y2 } = v2;
    const u0 = v0.u * img.width;
    const v0t = v0.v * img.height;
    const u1 = v1.u * img.width;
    const v1t = v1.v * img.height;
    const u2 = v2.u * img.width;
    const v2t = v2.v * img.height;

    ctx.save();

    // clip triangle
    ctx.beginPath();
    ctx.moveTo(v0.x, v0.y);
    ctx.lineTo(v1.x, v1.y);
    ctx.lineTo(v2.x, v2.y);
    ctx.closePath();
    ctx.clip();

    // affine texture transform
    const delta = u0 * (v1t - v2t) + u1 * (v2t - v0t) + u2 * (v0t - v1t);
    const a = (x0 * (v1t - v2t) + x1 * (v2t - v0t) + x2 * (v0t - v1t)) / delta;
    const b = (y0 * (v1t - v2t) + y1 * (v2t - v0t) + y2 * (v0t - v1t)) / delta;
    const c = (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / delta;
    const d = (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / delta;
    const e =
        (x0 * (u1 * v2t - u2 * v1t) +
            x1 * (u2 * v0t - u0 * v2t) +
            x2 * (u0 * v1t - u1 * v0t)) /
        delta;
    const f =
        (y0 * (u1 * v2t - u2 * v1t) +
            y1 * (u2 * v0t - u0 * v2t) +
            y2 * (u0 * v1t - u1 * v0t)) /
        delta;

    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
}

function screen(p) {
    // -1..1 => 0..2 => 0..1 => 0..w
    return {
        x: ((p.x + 1) / 2) * game.width,
        y: (1 - (p.y + 1) / 2) * game.height,
    };
}

function project({ x, y, z }) {
    return {
        x: x / z,
        y: y / z,
    };
}

function translate_z({ x, y, z }, dz) {
    return { x, y, z: z + dz };
}

function rotate_xz({ x, y, z }, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return {
        x: x * c - z * s,
        y,
        z: x * s + z * c,
    };
}

function transform(v, angle, dz) {
    return screen(project(translate_z(rotate_xz(v, angle), dz)));
}

function loadTextures(imgUrls) {
    // Map each URL string into an individual image-loading Promise
    const promises = imgUrls.map((url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
            img.src = url; // Fixed variable name from imgUrl to url
        });
    });

    // Resolve when ALL images are ready; rejects if ANY single image fails
    return Promise.all(promises);
}

// getFrameRender will return a frame function that only renders one single frame,
// later pipeline will call it repeatedly
function frame() {
    // dz += 1*dt;
    clear();

    const { angle, dz } = frameState;
    const texture = frameState.textures[0];

    // for (const v of vs) {
    //     point(screen(project(translate_z(rotate_xz(v, angle), dz))))
    // }

    for (const f of fs) {
        for (let i = 0; i < f.length; ++i) {
            const a = vs[f[i]];
            const b = vs[f[(i + 1) % f.length]];
            line(transform(a, angle, dz), transform(b, angle, dz));
        }
    }

    fs.forEach((f, index) => {
        const p0 = transform(vs[f[0]], angle, dz);
        const p1 = transform(vs[f[1]], angle, dz);
        const p2 = transform(vs[f[2]], angle, dz);
        texturedTriangle(
            { ...p0, ...ts[index][0] },
            { ...p1, ...ts[index][1] },
            { ...p2, ...ts[index][2] },
            texture,
        );
    });
}

// pipeline
let stopPipeline = false;
function pipeline(frameRender) {
    const f = () => {
        frameState.angle += Math.PI * dt;
        frameRender();
        if (!stopPipeline) {
            setTimeout(f, 1000 / FPS);
        } else {
            stopPipeline = false;
        }
    };

    setTimeout(f, 1000 / FPS);
}

function test() {
    clear();
    loadTextures(["nggyu.jpg"]).then((textures) => {
        ctx.drawImage(textures[0], 0, 0);
    });
}

function init() {
    loadTextures(["nggyu.jpg"]).then((textures) => {
        frameState.textures = textures;

        let rotateOn = false;
        const ctlRotate = document.getElementById("ctlRotate");
        ctlRotate.addEventListener("click", () => {
            if (rotateOn) {
                stopPipeline = true;
                rotateOn = false;
                ctlRotate.innerText = "Start Rotation";
            } else {
                rotateOn = true;
                pipeline(frame);
                ctlRotate.innerText = "Stop Rotation";
            }
        });

        // add keyboard control for rotate up down left right
        document.addEventListener("keydown", (e) => {
            if (e.key === "ArrowUp") {
            } else if (e.key === "ArrowDown") {
            } else if (e.key === "ArrowLeft") {
                frameState.angle = frameState.angle + Math.PI * dt;
                frame();
            } else if (e.key === "ArrowRight") {
                frameState.angle = frameState.angle - Math.PI * dt;
                frame();
            }
        });
    });
}

init();
// test();

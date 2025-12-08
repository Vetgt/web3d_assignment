// --- IMPORT LIBRARY ---
import * as THREE from 'three';
import { TWEEN } from 'three/addons/libs/tween.module.min.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// Import Firebase (Versi CDN Modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// =========================================================================
//  KONFIGURASI (WAJIB DIISI)
// =========================================================================

// 1. LINK CSV GOOGLE SHEET
// (File > Bagikan > Publikasikan ke Web > Pilih CSV > Copy Link)
const GOOGLE_SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnutSGs-IzXQpDV74GqCwSrXTUuZ7zqwN0qC-SHzilu3jsSRaon5oaoJKRklyS7kS5EzLsgKhgQzmo/pub?gid=486625478&single=true&output=csv";

// 2. FIREBASE CONFIG
// (Dapat dari Firebase Console > Project Settings > General > Your Apps)
const firebaseConfig = {
  apiKey: "AIzaSyBt9NjGm2e-IFUiyuiusrM8XCjniUU7JhA",
  authDomain: "assignment-intern-5ea2d.firebaseapp.com",
  projectId: "assignment-intern-5ea2d",
  storageBucket: "assignment-intern-5ea2d.firebasestorage.app",
  messagingSenderId: "844452701580",
  appId: "1:844452701580:web:d7af3afba2d551fc2222a9",
  measurementId: "G-L7NFJEYCP0"
};

// =========================================================================
//  SETUP INITIAL
// =========================================================================

// Init Firebase
let app, auth, provider;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    provider = new GoogleAuthProvider();
} catch (e) {
    console.error("Firebase Config belum diisi dengan benar!", e);
}

// Variables Three.js
let camera, scene, renderer, controls;
const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };
let tableData = []; // Data mentah dari CSV

// =========================================================================
//  LOGIKA LOGIN (AUTH)
// =========================================================================
const loginBtn = document.getElementById('loginButton');
const statusText = document.getElementById('login-status');

loginBtn.addEventListener('click', () => {
    // Validasi sederhana config
    if (firebaseConfig.apiKey === "ISI_API_KEY_ANDA") {
        alert("PERINGATAN: Anda belum mengisi Config Firebase di file main.js!");
        return;
    }
    
    statusText.innerText = "Connecting to Google...";
    
    signInWithPopup(auth, provider)
        .then((result) => {
            console.log("Login Success:", result.user.displayName);
            document.getElementById('login-overlay').style.display = 'none';
            // Setelah login sukses, load data
            loadData(); 
        })
        .catch((error) => {
            console.error(error);
            // Handle jika domain belum di whitelist
            if(error.code === 'auth/unauthorized-domain'){
                statusText.innerText = "Error: Domain ini belum diizinkan di Firebase Console.";
            } else {
                statusText.innerText = "Error: " + error.message;
            }
        });
});

// =========================================================================
//  DATA PROCESSING
// =========================================================================

function loadData() {
    // Cek apakah user sudah memasukkan link sheet
    if (GOOGLE_SHEET_CSV.includes("MASUKKAN_LINK")) {
        // Fallback ke dummy data jika link belum diisi, agar tidak blank
        console.warn("Link Sheet belum diisi. Menggunakan Dummy Data.");
        loadDummyData();
        return;
    }

    fetch(GOOGLE_SHEET_CSV)
        .then(res => res.text())
        .then(csvText => {
            tableData = parseCSV(csvText);
            initThreeJS();
            animate();
        })
        .catch(err => {
            console.error("Gagal ambil data:", err);
            alert("Gagal load CSV. Pastikan Link benar & Publik.");
            loadDummyData(); // Fallback
        });
}

// Parser CSV yang menangani koma di dalam tanda kutip ("$1,000")
function parseCSV(text) {
    const lines = text.split('\n');
    const result = [];
    // Loop mulai i=1 karena i=0 adalah Header
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        // Regex magic untuk split CSV
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (row) {
            const cleanRow = row.map(val => val.replace(/^"|"$/g, ''));
            result.push(cleanRow);
        }
    }
    return result;
}

function loadDummyData() {
    // Fallback jika tidak ada link sheet
    for(let i=0; i<200; i++) {
        tableData.push([
            `User ${i}`, "https://via.placeholder.com/150", "0", "0", "0", 
            "$" + Math.floor(Math.random()*250000)
        ]);
    }
    initThreeJS();
    animate();
}

// Logika Warna (Merah/Orange/Hijau)
function getCardColor(netWorthStr) {
    if (!netWorthStr) return 'rgba(0,0,0,0.85)';
    const value = parseInt(netWorthStr.replace(/[^0-9.-]+/g,""));
    
    if (value < 100000) return 'rgba(239, 48, 34, 0.85)'; // Merah
    else if (value > 200000) return 'rgba(58, 179, 72, 0.85)'; // Hijau
    else return 'rgba(255, 165, 0, 0.85)'; // Oranye
}

// =========================================================================
//  THREE.JS VISUALIZATION
// =========================================================================

function initThreeJS() {
    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.z = 3000;

    scene = new THREE.Scene();

    // 1. BUAT OBJEK KARTU
    for ( let i = 0; i < tableData.length; i ++ ) {
        const item = tableData[i];

        // MAPPING KOLOM (SESUAIKAN DENGAN SHEET KAMU)
        // Col 0: Name, Col 1: Photo, Col 5: Net Worth (Sesuai diskusi sebelumnya)
        const nameText = item[0] || "Unknown";
        const photoUrl = item[1] || "";
        const netWorthText = item[5] || "$0";

        const element = document.createElement( 'div' );
        element.className = 'element';
        element.style.backgroundColor = getCardColor(netWorthText);

        const img = document.createElement('img');
        img.className = 'profile-picture';
        img.src = photoUrl;
        // Error handling gambar
        img.onerror = function() { this.src = 'https://via.placeholder.com/150'; };
        element.appendChild(img);

        const name = document.createElement( 'div' );
        name.className = 'name';
        name.textContent = nameText;
        element.appendChild( name );

        const details = document.createElement( 'div' );
        details.className = 'details';
        details.textContent = netWorthText;
        element.appendChild( details );

        const object = new CSS3DObject( element );
        object.position.x = Math.random() * 4000 - 2000;
        object.position.y = Math.random() * 4000 - 2000;
        object.position.z = Math.random() * 4000 - 2000;
        scene.add( object );
        objects.push( object );
    }

    // 2. DEFINE LAYOUTS

    // A. TABLE (20x10)
    for ( let i = 0; i < objects.length; i ++ ) {
        const object = new THREE.Object3D();
        object.position.x = ( ( i % 20 ) * 140 ) - 1330;
        object.position.y = - ( Math.floor( i / 20 ) * 180 ) + 900;
        targets.table.push( object );
    }

    // B. SPHERE
    const vector = new THREE.Vector3();
    for ( let i = 0, l = objects.length; i < l; i ++ ) {
        const phi = Math.acos( - 1 + ( 2 * i ) / l );
        const theta = Math.sqrt( l * Math.PI ) * phi;
        const object = new THREE.Object3D();
        object.position.setFromSphericalCoords( 800, phi, theta );
        vector.copy( object.position ).multiplyScalar( 2 );
        object.lookAt( vector );
        targets.sphere.push( object );
    }

    // C. DOUBLE HELIX
    const cylindrical = new THREE.Cylindrical();
    for ( let i = 0; i < objects.length; i ++ ) {
        const theta = i * 0.175 + (Math.PI * (i % 2)); // Offset PI untuk double helix
        const y = - ( i * 8 ) + 450;
        const object = new THREE.Object3D();
        cylindrical.set( 900, theta, y );
        object.position.setFromCylindrical( cylindrical );
        vector.x = object.position.x * 2;
        vector.y = object.position.y;
        vector.z = object.position.z * 2;
        object.lookAt( vector );
        targets.helix.push( object );
    }

    // D. GRID (5x4x10)
    for ( let i = 0; i < objects.length; i ++ ) {
        const object = new THREE.Object3D();
        object.position.x = ( ( i % 5 ) * 400 ) - 800;
        object.position.y = ( - ( Math.floor( i / 5 ) % 4 ) * 400 ) + 800;
        object.position.z = ( Math.floor( i / 20 ) ) * 1000 - 2000;
        targets.grid.push( object );
    }

    // 3. RENDERER & CONTROLS
    renderer = new CSS3DRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.getElementById( 'container' ).appendChild( renderer.domElement );

    controls = new TrackballControls( camera, renderer.domElement );
    controls.minDistance = 500;
    controls.maxDistance = 6000;
    controls.addEventListener( 'change', render );

    // Button Events
    document.getElementById('table').addEventListener('click', () => transform(targets.table, 2000));
    document.getElementById('sphere').addEventListener('click', () => transform(targets.sphere, 2000));
    document.getElementById('helix').addEventListener('click', () => transform(targets.helix, 2000));
    document.getElementById('grid').addEventListener('click', () => transform(targets.grid, 2000));

    // Default View
    transform( targets.table, 2000 );
    window.addEventListener( 'resize', onWindowResize );
}

function transform( targets, duration ) {
    TWEEN.removeAll();
    for ( let i = 0; i < objects.length; i ++ ) {
        const object = objects[ i ];
        const target = targets[ i ];
        new TWEEN.Tween( object.position )
            .to( { x: target.position.x, y: target.position.y, z: target.position.z }, Math.random() * duration + duration )
            .easing( TWEEN.Easing.Exponential.InOut )
            .start();
        new TWEEN.Tween( object.rotation )
            .to( { x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, Math.random() * duration + duration )
            .easing( TWEEN.Easing.Exponential.InOut )
            .start();
    }
    new TWEEN.Tween( this )
        .to( {}, duration * 2 )
        .onUpdate( render )
        .start();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    render();
}

function animate() {
    requestAnimationFrame( animate );
    TWEEN.update();
    controls.update();
}

function render() {
    renderer.render( scene, camera );
}
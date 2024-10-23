import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import TWEEN from '@tweenjs/tween.js';
import "./style.css";
import "./style.scss";

/* SCENE */
const scene = new THREE.Scene();

/* CAMERA */
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const cameraSphere = new THREE.Mesh(
    new THREE.SphereGeometry( 1, 16, 16 ),
    new THREE.MeshBasicMaterial( { color: 0xffff00 }) );
scene.add( camera );
camera.add( cameraSphere );

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding; // Enable gamma correction
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.0; // Adjust exposure for brightness
document.body.appendChild(renderer.domElement);

/* VARIABLES */
let clickableObjects = [];
let searchIcons = [];
let floor;
let isPlacing = false;
let placingObject;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const planeNormal = new THREE.Vector3(0, 1, 0); // The normal of the ground plane
const plane = new THREE.Plane(planeNormal, 0);

const controls = new MapControls( camera, renderer.domElement );
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE
}
controls.rotateSpeed = -0.5; //  Reverses direction
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.25;

moveCamera( camera.position );
controls.update();

const paintings = [
    'HunterHenry',
    'HarbourPainting',
    'HobartTown',
    'Bicentennial',
    'Mithina',
    'Trukanini',
    'DouglasMawson'
];
const imageDetails = {
    'HunterHenry': 'Hunter Henry (1832-1892), after whom this room is named after, was an architect that designed the plans for the Hobart Town Hall.',
    'HarbourPainting': 'A painting depicting the Hobart town harbour.',
    'HobartTown': 'View of Hobart Town (from Rosny Point) was painting by Haughton Forrest (1826-1925). It depicts a tranquil Hobart city nestled under kunanyi (Mt Wellington).',
    'Bicentennial': 'A gift to the City of Hobart for the bicentennial year, from the Hobart Embroiderers Guild.',
    'Mithina': 'Mithina (1835-52) was born on Flinders Island after her parents from moved from their homeland of Lutruwita (Tasmania). She was moved between several families and stations before passing away on the 1st September 1952 at the age of 16. This painting was commissioned by the Governor of Tasmania, Sir John Franklin when Mithina was only 7 years old.',
    'Trukanini': 'Trukanini (1812-76) is an iconic figure in the history of Lutruwina (Tasmania). She endured and resisted the brutalisation wrought upon Aboriginal people by British invasion and, after years of incarceration on Flinders Island after trying to negotiate a peace deal, was relocated to Putalina (Oyster Cove). Trukanini was falsely pronounced the "Last Tasmanian Aborigine" and was, against her wishes, exhumed and her skeleton was displayed until 1947. She has since been cremated and her ashes spread as she wished.',
    'DouglasMawson': 'The Australasian Antarctic Expedition of 1911-14, led by Douglas Mawson departing Queens Wharf, Hobart on board S.Y. Aurora, December 2, 1911.'
};
const hazardNames = [
    'Cube012'
];
// Load the GLB model
let bounds;
const loader = new GLTFLoader();
loader.load('models/room.glb', (gltf) => {
    gltf.scene.traverse((node) => {
        if (node.isMesh) {
            node.material.needsUpdate = true;
            if (node.material.map) node.material.map.encoding = THREE.sRGBEncoding;

            if (node.material.metalness !== undefined) {
                node.material.metalness = 0.1; 
            }
            if (paintings.includes(node.name)) {
                createSearchIcon(node, node.name);
            }
            if (hazardNames.includes(node.name)) {
                
                hazardObjects.push(node); // Add to hazard objects for proximity checking
            }
            if(node.name === 'Floor') {
                floor = node;
                const box = new THREE.Box3().setFromObject( floor );
                const size = new THREE.Vector3();    

                box.getSize(size);    

                const ADJUSTMENT = 0.65;
                bounds = {
                minX: (-size.x / 2) * ADJUSTMENT,
                maxX: (size.x / 2) * ADJUSTMENT,
                minY: (-size.y / 2) * ADJUSTMENT,
                maxY: (size.y / 2) * ADJUSTMENT,
                minZ: (-size.z / 2) * ADJUSTMENT,
                maxZ: (size.z / 2) * ADJUSTMENT 
                };    
            }
        }
    });
   

    scene.add(gltf.scene);
    animate();
}, undefined, (error) => {
    console.error(error);
});

function moveCamera( point ) {
    var direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    camera.position.copy(point).add(new THREE.Vector3(0, 2, -0.01));
    controls.target.copy( camera.position ).add(direction);
  }
  let ignoreClick ;

function onMouseClick(event) {
    if (!ignoreClick) {
        ignoreClick = false; // Reset the flag in case mouseup isn't triggered
        console.log("Click ignored after mousedown without mouseup");
        closePopup()
    }
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update raycaster with camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // First, check if the user clicked on a search icon
    const searchIconIntersects = raycaster.intersectObjects(searchIcons);
    if (searchIconIntersects.length > 0) {
        const clickedIcon = searchIconIntersects[0].object;
        const detailKey = clickedIcon.userData.detailKey;
        showImageDetails(detailKey); // Display pop-up with image details
        return; // Exit the function if a search icon was clicked
    }

    // If no search icon was clicked, check for other clickable objects
    const intersects = raycaster.intersectObjects(clickableObjects);
    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        console.log(clickedObject.name)

        showColorPicker(event.clientX, event.clientY, clickedObject);

        // Toggle color on click (red to green and vice versa)
        // if (clickedObject.material.color.getHex() === 0xff0000) {
        //     clickedObject.material.color.set(0x00ff00); // Change to green
        // } else {
        //     clickedObject.material.color.set(0xff0000); // Change to red
        // }
    }
}
function showColorPicker(x, y, clickedObject) {
    const colors = [
        0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 
        0x00ffff, 0xffa500, 0x8a2be2, 0x7fff00, 0xdc143c,
        0xff1493, 0x32cd32, 0x800000, 0x808000, 0x008080
    ];

    // 禁用与所有可点击对象的交互
    const originalClickableObjects = [...clickableObjects];
    clickableObjects = []; // 清空可点击对象列表，防止与其他对象的交互

    // Create a full-screen overlay to block interaction with other objects
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'; // Semi-transparent to indicate focus
    overlay.style.zIndex = '999'; // High z-index to cover everything else
    overlay.style.pointerEvents = 'all'; // Ensure overlay blocks interactions with other objects
    overlay.addEventListener('click', (e) => e.stopPropagation()); // 阻止事件传播
    document.body.appendChild(overlay);

    // Create a container for the color picker
    const colorPickerContainer = document.createElement('div');
    colorPickerContainer.style.position = 'absolute';
    colorPickerContainer.style.left = `${x}px`;
    colorPickerContainer.style.top = `${y}px`;
    colorPickerContainer.style.width = '200px';
    colorPickerContainer.style.height = '200px';
    colorPickerContainer.style.display = 'flex';
    colorPickerContainer.style.alignItems = 'center';
    colorPickerContainer.style.justifyContent = 'center';
    colorPickerContainer.style.zIndex = '1000'; // Ensure it's above the overlay
    overlay.appendChild(colorPickerContainer);

    // Create circular layout for the colors
    const radius = 80;
    colors.forEach((color, index) => {
        const angle = (index / colors.length) * 2 * Math.PI;
        const colorButton = document.createElement('div');
        colorButton.style.width = '30px';
        colorButton.style.height = '30px';
        colorButton.style.borderRadius = '50%';
        colorButton.style.backgroundColor = `#${color.toString(16)}`;
        colorButton.style.position = 'absolute';
        colorButton.style.left = `${radius * Math.cos(angle)}px`;
        colorButton.style.top = `${radius * Math.sin(angle)}px`;
        colorButton.style.pointerEvents = 'all'; // Ensure the buttons can be clicked
        colorButton.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件向上传递到其他对象
            clickedObject.material.color.set(color);
            removeColorPicker(); // Remove the color picker and overlay after selection
        });
        colorPickerContainer.appendChild(colorButton);
    });

    // Close the color picker if clicked anywhere outside the picker itself
    overlay.addEventListener('click', (e) => {
        if (!colorPickerContainer.contains(e.target)) {
            removeColorPicker();
        }
    }, { once: true });

    // Add event listener for the Escape key to close the color picker
    function handleKeydown(event) {
        if (event.key === 'Escape') {
            removeColorPicker();
        }
    }
    document.addEventListener('keydown', handleKeydown);

    // Remove the color picker and overlay
    function removeColorPicker() {
        if (overlay) {
            document.body.removeChild(overlay);
        }
        document.removeEventListener('keydown', handleKeydown); // Remove the keydown event listener

        // 恢复原来的可点击对象
        clickableObjects = originalClickableObjects;
    }
}

let mouseDownPosition = new THREE.Vector2();
// Mouse down event to select object
document.addEventListener('mousedown', function(event) {
    // Record the position where the mouse pressed down
    mouseDownPosition.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      - (event.clientY / window.innerHeight) * 2 + 1
    );
});


// Mouse move event to move the object
window.addEventListener('mousemove', (event) => {

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
            
    if (isPlacing) {
        const intersects = raycaster.intersectObjects(scene.children, true);
        if(intersects.length > 0) {
            const intersect = intersects[0];
            if(intersect.object.name === 'Floor') {
                placingObject.position.copy( intersect.point );
            }
        }
    }
});
let hazardWarningShown = false;
// Mouse up event to stop dragging
window.addEventListener('mouseup', function(event) {
    hazardWarningShown = false;
    let mouseUpPosition = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        - (event.clientY / window.innerHeight) * 2 + 1
      );

    mouse.set(mouseUpPosition.x, mouseUpPosition.y);
    raycaster.setFromCamera(mouse, camera);

    if(isPlacing) {
        clickableObjects.push(placingObject);
        console.log(placingObject)
        for (const hazard of hazardObjects) {
            const distance = placingObject.position.distanceTo(hazard.position);
            console.log(`Distance to hazard ${hazard.name}: ${distance}`); // For debugging
    
            // Show warning if within a threshold distance from the hazard
            if (distance > 3) { // Threshold for hazard proximity
                if (!hazardWarningShown) { // Only show if not already shown
                    showHazardWarning();
                    ignoreClick = true
                    hazardWarningShown = true; // Set the flag to true to avoid repeat warnings
                }
                break; // Exit loop after showing the warning
            } else {
                hazardWarningShown = false; // Reset the flag if not near any hazards
            }
        }
        placingObject = null;
        controls.enabled = true;
        isPlacing = false;
    }
    else {
        if(mouseDownPosition.distanceTo(mouseUpPosition) < 0.01) {
            const intersects = raycaster.intersectObjects(scene.children, true);
            if(intersects.length > 0) {
                const intersect = intersects[0];
                if(intersect.object.name === 'Floor') {
                    if (intersect.point.x >= bounds.minX && intersect.point.x <= bounds.maxX &&
                        intersect.point.z >= bounds.minZ && intersect.point.z <= bounds.maxZ) {
                            moveCamera(intersect.point);
                    }
                }
            }
        }
        controls.update();
    }
  
});
const hazardObjects = [];

// Function to show a hazard warning
function showHazardWarning() {
    const popUp = document.createElement("div");
    popUp.className = "popup";
    popUp.innerHTML = `<div class="popup-content"><p>${"Sofa is Close to Fire"}</p><button>Close</button></div>`;
    document.body.appendChild(popUp);
    popUp.addEventListener("click", (event) => {
      console.log(event.target);
      const lastObject = clickableObjects.pop();
      scene.remove(lastObject);
      closePopup(); // Close pop-up when clicking on the background
    });
}

const menuCheck = document.getElementById("menu-check");
document.getElementById("furniture-list").addEventListener("click", function (event) {
  if (event.target.tagName === "BUTTON") {
    const modelName = event.target.id;
    isPlacing = true;
    controls.enabled = false;
    loader.load(`models/${modelName}`, (gltf) => {
      placingObject = gltf.scene;
      scene.add(placingObject);
      menuCheck.checked = false; // Uncheck to close the sidebar
    });
  }
});

// Reset functionality
document.getElementById("reset-button").addEventListener("click", () => {
    clickableObjects.forEach((object) => {
      scene.remove(object);
    });
    clickableObjects = [];
  });
  

window.addEventListener("contextmenu", function (event) {
    event.preventDefault();
  
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
  
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      const intersect = intersects[0];
      if (intersect.object.name.startsWith("12283_Chair_v1") || intersect.object.name.startsWith("top")) {
        const popUp = document.createElement("div");
        popUp.className = "popup";
        popUp.innerHTML = `<div class="popup-content"><p>${"Delete ?"}</p><button>Ok</button><button style='margin-left:10px;'>Cancel</button></div>`;
        document.body.appendChild(popUp);
  
        popUp.addEventListener("click", (event) => {
          if (event.target.innerHTML === "Ok") {
            removeFromParents(intersect.object);
            closePopup();
          } else if (event.target.innerHTML === "Cancel") {
            closePopup();
          }
        });
      }
    }
  });
  
  function removeFromParents(object) {
    let parent = object.parent;
    while (parent) {
      parent.remove(object); // Remove the object from its parent
      object = parent; // Move up to the next parent
      parent = parent.parent; // Get the next parent
    }
  }

window.addEventListener('wheel', function(event) {
    if(isPlacing) {
        let rotation = placingObject.rotation;
        placingObject.rotation.set( rotation.x, rotation.y + 0.1, rotation.z );
    }
});

// Listen for click events
window.addEventListener('click', onMouseClick, false);
// Add lights
const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Add directional light
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5); // Increase intensity
light.position.set(0, 2, 0);
scene.add(light);

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update controls
    controls.update();

    // Render the scene
    TWEEN.update();
    renderer.render(scene, camera);
}

function createSearchIcon(imageObject, detailKey) {
    const searchIconTexture = new THREE.TextureLoader().load('search-icon-2048x2048-cmujl7en.png'); // Replace with your search icon image
    const searchMaterial = new THREE.SpriteMaterial({ map: searchIconTexture });
    const searchIcon = new THREE.Sprite(searchMaterial);

    searchIcon.position.copy(imageObject.position.clone().add(new THREE.Vector3(0, -1, 0))); // Position the icon above the image
    searchIcon.scale.set(0.5, 0.5, 0.5); // Adjust the size of the icon

    searchIcon.userData = { detailKey }; // Attach the detail key for the pop-up

    scene.add(searchIcon);
    console.log("searchIcon : " ,searchIcon);
    searchIcons.push(searchIcon);
}

// Function to display the image details in a pop-up
function showImageDetails(detailKey) {
    const details = imageDetails[detailKey] || 'No details available for this image';
    const popUp = document.createElement('div');
    popUp.className = 'popup';
    popUp.innerHTML = `<div class="popup-content"><p>${details}</p><button>Close</button></div>`;

    document.body.appendChild(popUp);
}

// Function to close the pop-up
function closePopup() {
    const popUp = document.querySelector('.popup');
    if (popUp) {
        document.body.removeChild(popUp);
    }
}
// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});